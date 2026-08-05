# Chapter 4 — Encoding and Evolution: Detailed Requirements

---

## 1. Multi-Format Serialization Comparison

### 1.1 Overview
Serialize the same logical object using JSON, Protocol Buffers, and Avro, and compare the results. The goal is to move "textual vs. binary encoding" and "schema-based vs. schemaless" from abstract Ch4 concepts to something you've actually measured.

### 1.2 Test Object
Design one moderately realistic object so the comparison is meaningful — a flat object won't expose enough differences. Suggested shape:
```
{
  "user_id": 12345,
  "username": "alice",
  "is_active": true,
  "signup_timestamp": 1712345678,
  "tags": ["premium", "beta_tester"],
  "address": {
    "city": "Bengaluru",
    "zip": "560001"
  }
}
```
This gives you: integers, strings, booleans, an array, and a nested object — enough surface area to see how each format handles composite structures.

### 1.3 Functional Requirements

**JSON**
- Serialize the test object using a standard JSON library (no custom work needed here — the point of comparison is the *format*, not your implementation).
- Record the exact byte size of the UTF-8 encoded output.

**Protocol Buffers**
- Write a `.proto` schema file defining the message type matching the test object (correct field types and field numbers).
- Generate the language bindings from the schema (`protoc` or equivalent).
- Serialize the same test object using the generated code.
- Record byte size.

**Avro**
- Write an Avro schema (`.avsc`, JSON-format schema definition) matching the test object.
- Serialize using the Avro schema in **two modes** if your Avro library supports it:
  - With the schema embedded/available at write time (standard).
  - Understand (even if not fully implementing) that Avro's design assumes the reader always has a schema available — either the writer's schema is sent alongside the data, or resolved via a schema registry. This is a conceptual requirement, not just a code one — note it explicitly in your write-up, since it's the key Ch4 distinction between Avro and Protobuf.
- Record byte size.

### 1.4 Comparison Requirements (deliverable)
Produce a table or short report with:
- **Byte size** of each encoding for the identical logical object.
- **Presence/absence of field names in the encoded bytes** — inspect the raw bytes (or a hex dump) of each format and confirm: JSON contains field names as literal text; Protobuf encodes field numbers, not names; Avro contains neither (relies entirely on the schema to interpret positional/typed data).
- **Human-readability**: can you read the raw output without a schema? (JSON: yes. Protobuf: no, binary with field tags. Avro: no, pure binary, schema-dependent.)
- **Schema requirement at read time**: does decoding require the schema to be available separately? (JSON: no. Protobuf: no, since field numbers are self-describing enough with the `.proto` definitions compiled in. Avro: yes, always.)

### 1.5 Test Cases to Include
- Serialize the same object 3 times in each format; confirm identical byte output each time (determinism check).
- Serialize a version of the object with an **empty array** (`tags: []`) and a **null-equivalent field** (e.g. missing `address`) in each format — compare how each format handles absence vs. Protobuf's default-value semantics (Protobuf doesn't distinguish "unset" from "set to default" for proto2/proto3 scalar fields, which is a specific gotcha worth hitting yourself).
- Scale the test object up (e.g. an array of 1,000 nested objects) and re-measure byte size — the *relative* size advantage of binary formats over JSON should grow with data volume; confirm this trend.

### 1.6 Stretch Goals
- Add a fourth format — **MessagePack** or **Thrift** — as an additional comparison point.
- Measure not just byte size but **serialization/deserialization speed** (CPU time) for each format on a larger batch (e.g. 100,000 objects), since encoding format also affects CPU cost, not just size — relevant for high-throughput systems.

---

## 2. Schema Evolution Test Harness

### 2.1 Overview
The real point of Ch4 isn't the encoding formats themselves — it's what happens when your schema changes but you have old data (or old code) still in circulation. This exercise builds a harness that actually exercises forward and backward compatibility, rather than just reading about the rules.

### 2.2 Definitions to Implement Against
Be precise about the two directions, since it's easy to mix them up:
- **Backward compatibility**: new code can read data written by old code (old schema → new code).
- **Forward compatibility**: old code can read data written by new code (new schema → old code).

Your harness needs to test both directions, for both formats, for each type of schema change.

### 2.3 Schema Changes to Test
For **each** format (Protobuf and Avro — JSON is schemaless so "compatibility" mostly reduces to "does your application code defensively handle missing/extra fields," which is worth noting as a contrast rather than testing the same way):

1. **Add a field**
   - New schema adds `email` (optional, with a default in Avro's case).
2. **Remove a field**
   - New schema removes `tags`.
3. **Rename a field**
   - New schema renames `username` → `display_name`.

### 2.4 Functional Requirements

**Setup**
- Maintain two versions of each schema on disk: `schema_v1` and `schema_v2` (one pair per change type above, or one v1/v2 pair per format covering all three changes cumulatively — pick one structure and be consistent).
- Maintain "old code" and "new code" as two separate serialize/deserialize function pairs, each bound to their respective schema version.

**Test harness behavior**
For each (format, change type) combination, run both directions:

- **Backward compatibility test**:
  1. Serialize a test object using `schema_v1` ("old code, old schema").
  2. Deserialize those bytes using `schema_v2` ("new code").
  3. Assert: deserialization succeeds without error.
  4. Assert on correct handling of the specific change:
     - Added field → new code sees the field as absent/default, not an error.
     - Removed field → new code simply doesn't see the removed field (no crash).
     - Renamed field → **this should reveal an actual failure** for a naive rename (see 2.5) — the harness should surface this, not hide it.

- **Forward compatibility test**:
  1. Serialize a test object using `schema_v2` ("new code, new schema").
  2. Deserialize those bytes using `schema_v1` ("old code").
  3. Assert: deserialization succeeds without error.
  4. Assert on correct handling:
     - Added field → old code should ignore the unknown field gracefully (this is where Protobuf's field-number-based encoding and Avro's schema resolution matter — confirm neither throws on an unrecognized field).
     - Removed field → old code expects the field; confirm it gets a sensible default/absence rather than crashing.
     - Renamed field → again, expect this to reveal an issue with naive renaming.

### 2.5 The Rename Gotcha (must be explicitly demonstrated, not skipped)
A naive field rename is **not** compatible in either format if treated as "delete old field + add new field" — this breaks both directions. Your harness should:
- First demonstrate this failure with a naive rename (delete + add) and capture the actual error or data-loss behavior.
- Then demonstrate the correct approach for each format:
  - **Protobuf**: field *names* can change freely as long as the field *number* stays the same — renaming is safe because the wire format only uses numbers. Show that renaming the field but keeping its field number produces full compatibility.
  - **Avro**: use **aliases** in the new schema to map the new field name back to the old one during schema resolution. Show that using an alias produces full compatibility where a plain rename does not.
- This contrast is one of the more concrete, testable lessons in the whole chapter — don't skip it.

### 2.6 Non-Functional Requirements
- The harness should be data-driven: adding a new (format, change-type) test case should not require rewriting the harness logic, just adding a new schema pair and a new test entry.
- Failures should print a clear diagnosis (e.g. "renamed field lost data: expected `display_name='alice'`, got default `''`") rather than a raw stack trace, so the compatibility failure is legible when it happens.

### 2.7 Test Cases to Include
- All 3 change types × 2 formats × 2 directions = 12 base compatibility test runs.
- The naive-rename-fails / correct-rename-works contrast (section 2.5) for both formats.
- A **required field added** case in Protobuf (proto2-style) or a **no-default field added** in Avro — both of these should *fail* forward compatibility, and your harness should assert that they fail, since this is Ch4's warning about certain changes not being safe. (Confirming a documented incompatibility actually breaks is as valuable as confirming a compatible change works.)
- A round-trip test: v1 → serialize → v2 deserialize → v2 serialize → v1 deserialize, checking data survives a full cycle where possible.

### 2.8 Stretch Goals
- Extend the harness to JSON by adding **your own** application-level compatibility rules (e.g. "unknown fields are ignored," "missing fields get application-defined defaults") and test that your code — not the format — handles evolution gracefully. This highlights that JSON pushes compatibility responsibility onto the application, whereas Protobuf/Avro push it into the schema/format itself.
- Simulate a **rolling deployment** scenario: a mix of old-code and new-code readers/writers operating concurrently on a shared stream of messages (some v1, some v2) and confirm no reader crashes regardless of which schema version produced a given message.