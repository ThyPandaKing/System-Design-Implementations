# Chapter 2 — Data Models and Query Languages: Detailed Requirements

---

## 1. Simple Document Store with a Query Engine

### 1.1 Overview
Build a minimal document database — think "MongoDB in 300 lines" — that stores JSON-like documents and supports basic querying. The goal is to internalize why document stores trade join-ability for schema flexibility and locality (Ch2's core theme).

### 1.2 Data Model
- A **document** is a JSON-serializable object (nested objects, arrays, strings, numbers, booleans, null).
- Documents are grouped into **collections** (e.g. `users`, `orders`).
- Every document has a unique `_id` field, auto-generated if not supplied.
- No fixed schema — different documents in the same collection may have different fields (schema-on-read).

### 1.3 Functional Requirements

**Core CRUD**
- `insert(collection, document) -> id` — assigns an `_id` if missing; rejects duplicate `_id` within a collection.
- `get(collection, id) -> document | None`
- `update(collection, id, partial_document)` — merges fields shallowly (or replace-whole-doc mode; pick one and document your choice).
- `delete(collection, id) -> bool`

**Query Engine**
- `find(collection, filter) -> list[document]`
- Filter is a dict, e.g. `{"age": 30}` matches documents where `age == 30`.
- Support **nested field access** using dot notation: `{"user.address.city": "Bengaluru"}` must traverse nested objects.
- Support at least these operators (MongoDB-style is a reasonable reference):
  - `$eq` (default when no operator given)
  - `$gt`, `$lt`, `$gte`, `$lte`
  - `$in` (value in a list)
  - `$exists` (field present or not)
- Support combining multiple conditions with implicit AND: `{"age": {"$gt": 18}, "city": "Bengaluru"}`.
- (Stretch) Support explicit `$and` / `$or` composition.

**Indexing (stretch, but strongly recommended)**
- Build a single-field index (hash map from field value → set of document IDs) for at least one field per collection.
- Query planner: if a filter includes an indexed field, use the index instead of a full collection scan.
- Measure and report query time with vs. without the index on a collection of ≥10,000 documents.

### 1.4 Non-Functional / Design Requirements
- Storage backend can be in-memory (dict of dicts) — persistence to disk is optional and out of scope unless you want to combine this with your Ch3 storage engine work.
- Querying a non-existent field should not error — it should simply not match (mirrors real document DB semantics).
- Document the locality tradeoff explicitly: show a case where fetching a "user + their 5 most recent orders" is a single document read here, vs. what it would require in a normalized relational schema.

### 1.5 Test Cases to Include
- Insert a document with nested fields; query on a 2-levels-deep nested field.
- Insert two documents with different shapes into the same collection (schema flexibility).
- Query with `$gt` and `$in` on numeric and array-valued fields.
- Update a document and verify unspecified fields are preserved (if doing shallow merge).
- Delete a document, then confirm `find` no longer returns it and `get` returns `None`.

### 1.6 Stretch Goals
- Support querying inside arrays (e.g. `{"tags": "urgent"}` matches if `"urgent"` is any element of the `tags` array).
- Add a simple aggregation: `count(collection, filter)` or `group_by(collection, field)`.
- Add basic schema validation hooks (optional, to contrast with schema-on-write systems).

---

## 2. Relational vs. Graph Model Comparison

### 2.1 Overview
Model the **same dataset** two ways — as normalized relational tables and as a graph — then implement the **same query** on both, to directly experience the difference in structure and code complexity that Ch2 discusses (highly interconnected many-to-many data).

### 2.2 Dataset
Use a small social network dataset, since it naturally has many-to-many relationships:
- **Entities:** `Person` (id, name, city)
- **Relationship:** `FOLLOWS` (person_id → person_id), directed, many-to-many

Minimum dataset size: ≥20 people, ≥40 follow-relationships, arranged so that some "friend of friend" chains exist and some don't (to make the query results non-trivial).

### 2.3 Relational Implementation

**Schema**
```
people(id PK, name, city)
follows(follower_id FK -> people.id, followee_id FK -> people.id)
```

**Functional Requirements**
- Use an actual relational engine (SQLite is fine — no need to build your own for this exercise; the point is the query, not the storage engine).
- Load the dataset into the two tables above.
- Implement the target query (see 2.5) using SQL `JOIN`s — specifically a **self-join on `follows`** twice to get "friends of friends."
- Query must exclude:
  - The original person themselves
  - People the person already directly follows
  (this is what makes it a realistic "suggested follows" query, and what makes the SQL non-trivial — requires a `NOT IN` / `LEFT JOIN ... IS NULL` / `EXCEPT` clause)

### 2.4 Graph Implementation

**Model**
- Nodes: `Person`
- Edges: `FOLLOWS` (directed)
- You may use a simple adjacency-list structure you build yourself (dict of `id -> set[id]`), or a graph library (e.g. `networkx` in Python) — building it yourself is more instructive given the goal of this exercise.

**Functional Requirements**
- Load the same dataset as an adjacency list (or adjacency map).
- Implement the same target query via **graph traversal**: 2-hop BFS from the starting person, excluding direct neighbors and self.

### 2.5 Target Query (implement identically in both)
> "Given a person, find all people who are followed by someone that person follows, excluding people they already follow and themselves." (classic "people you may know" / friend-of-friend query)

Both implementations must:
- Accept a `person_id` as input.
- Return the same result set (same set of person IDs) — write a test that runs both implementations on the identical dataset and asserts equal output.

### 2.6 Comparison Requirements (this is the actual point of the exercise)
Produce a short write-up (can be a markdown section or code comments) covering:
- **Lines of code / cyclomatic complexity** for the query logic in each approach.
- **What happens at 3 hops instead of 2?** Try extending both to "friends of friends of friends" and note how the SQL query complexity grows (another self-join) vs. how the graph traversal changes (just increase BFS depth by one — usually a 1-line change).
- **Query readability**: which version more directly expresses the *intent* ("traverse the graph 2 hops") vs. the *mechanism* (joins)?
- **Performance characteristic** (conceptual, not necessarily benchmarked): explain why deeply recursive relational joins get expensive, referencing Ch2's discussion of the relational model's weakness for highly interconnected data.

### 2.7 Stretch Goals
- Implement 3+ hop traversal in SQL using a **recursive CTE** (`WITH RECURSIVE`) and compare it directly to the graph BFS at the same depth — this is the fairest apples-to-apples comparison and closely mirrors how real systems (e.g. Neo4j vs. Postgres) differ.
- Add weighted/typed edges (e.g. `FOLLOWS` vs. `BLOCKS`) and filter traversal by edge type — demonstrates the flexibility of the property graph model discussed in Ch2.

### 2.8 Test Cases to Include
- Query for a person with zero follows → empty result.
- Query for a person whose entire 2-hop network is already directly followed → empty result (tests the exclusion logic).
- Query on a densely connected subgraph vs. a sparse one — verify correctness in both.
- Cross-check: relational and graph implementations return identical results on ≥5 different starting `person_id`s.