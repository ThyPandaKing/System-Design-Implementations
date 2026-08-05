# Chapter 3 — Storage and Retrieval: Detailed Requirements

---

## 1. Hash Index with Append-Only Log (Bitcask-style)

### 1.1 Overview
The simplest possible storage engine: all writes are appended to a log file, and an in-memory hash map tracks the byte offset of the *latest* value for each key. This is the foundation for understanding why append-only writes are fast, and what compaction is for.

### 1.2 On-Disk Format
Define a simple binary or text record format for each log entry, e.g.:
```
[key_size][value_size][key_bytes][value_bytes]
```
or a simpler newline-delimited format for a first pass (e.g. `key,value\n`) if you want to defer binary encoding. Either is fine — document your choice.

- Support a **tombstone** record format for deletes (e.g. a special `value_size = -1` or a reserved marker) so deletes can be logged and later compacted away.

### 1.3 Functional Requirements

**Core operations**
- `put(key, value)`:
  1. Append `(key, value)` record to the active log segment file.
  2. Update in-memory hash map: `key -> (segment_file, byte_offset)`.
- `get(key) -> value | None`:
  1. Look up offset in the in-memory index.
  2. Seek to offset in the file and read the record.
  3. Return `None` if key not found or if the latest record is a tombstone.
- `delete(key)`:
  1. Append a tombstone record for `key`.
  2. Update/remove the key from the in-memory index.

**Segmentation**
- Log file must roll over to a new segment once it exceeds a configurable size threshold (e.g. 1MB) — you need multiple segments for compaction to be meaningful.
- Maintain a list of segment files in order (oldest → newest); the newest is the "active" segment that accepts writes.

**Compaction & Merging**
- Background (or manually-triggered) process that:
  1. Reads through older (closed) segments.
  2. For each key, keeps only the most recent value across all segments being compacted.
  3. Discards keys whose latest record is a tombstone.
  4. Writes the surviving records into a new, smaller merged segment file.
  5. Atomically replaces the old segments with the merged one, and deletes the old files.
- Must correctly handle: a key written in segment 1, overwritten in segment 3, deleted in segment 5 — result after compacting segments 1–5 should be no entry for that key.

**Crash Recovery**
- On startup, rebuild the in-memory index from scratch by replaying all segment files in order (oldest to newest), applying each record (later records overwrite earlier index entries for the same key).
- Simulate a crash (kill process mid-write or just restart without a clean shutdown) and verify the index rebuilds correctly and no committed writes are lost.
- Handle a **partially-written record** at the end of a segment (simulating a crash mid-append) — recovery must detect and skip/truncate the corrupted trailing record rather than crashing.

### 1.4 Non-Functional Requirements
- `get` must be O(1) average case (single disk seek + read, via the hash index) — no scanning.
- `put` must be O(1) — append only, no disk seeks for writes.
- Document the key weakness explicitly: the entire key set must fit in memory (this is Bitcask's known limitation) — state this as a design constraint, not a bug.

### 1.5 Test Cases to Include
- Put a key, get it back, confirm value correctness.
- Overwrite a key multiple times; confirm `get` returns only the latest value.
- Delete a key; confirm `get` returns `None`.
- Force a segment rollover (write enough data to cross the threshold); confirm keys from both old and new segments are still readable.
- Run compaction with overlapping writes/deletes across 3+ segments; verify final state matches an in-memory reference dict.
- Kill the process (or simulate) mid-write; restart; verify index rebuild recovers all committed writes and gracefully handles the truncated last record.

### 1.6 Stretch Goals
- Add a **hint file** per segment (key → offset) so recovery doesn't need to re-scan full segment contents, only the smaller hint files.
- Add simple CRC checksums per record to detect corruption during recovery.

---

## 2. LSM-Tree

### 2.1 Overview
The storage engine behind LevelDB, RocksDB, Cassandra, and HBase. Writes go to an in-memory sorted structure (memtable), get flushed to disk as immutable sorted files (SSTables), and background compaction merges these files over time. This is the highest-value exercise in the whole book for understanding modern write-optimized databases.

### 2.2 Components to Build

**Memtable**
- An in-memory sorted key-value structure — implement using a **skip list** or a **red-black/AVL tree** (don't just use a sorted array with O(n) insert; the point is to understand why a sorted structure with O(log n) insert is needed).
- Supports `put(key, value)`, `get(key)`, and **in-order iteration** (needed for flushing to a sorted SSTable).
- Supports tombstones for deletes, same as the hash index above.

**SSTable (Sorted String Table)**
- An immutable, sorted, on-disk file format: records sorted by key, written sequentially.
- **Flush**: when the memtable exceeds a size threshold, iterate it in sorted order and write it out as a new SSTable file; then reset the memtable to empty.
- **Read path**: `get(key)` on an SSTable should use **binary search** over key offsets (not a linear scan) — this requires either a sparse in-memory index of `key -> offset` at regular intervals, or a full index if memory allows.
- (Recommended) Maintain a sparse index: every Nth key's offset stored in memory, so a lookup does binary search on the sparse index + a bounded scan on disk.

**Bloom Filter (optional but recommended)**
- One bloom filter per SSTable, built at flush time, checked before doing any disk I/O for that SSTable.
- Must demonstrate: for a key that does *not* exist, most SSTables are skipped without a disk read; measure the reduction in disk reads with vs. without the bloom filter enabled.

**Compaction**
- Multiple SSTables accumulate over time; implement at least **size-tiered** or **leveled** compaction (pick one — leveled is closer to what LevelDB/RocksDB do, size-tiered is closer to Cassandra and slightly simpler to implement first).
- Compaction merges multiple sorted SSTables into fewer, larger sorted SSTables using a **k-way merge** (this reuses the same merge logic as external sort — worth noting as you build it).
- During merge, for duplicate keys across input SSTables, keep only the most recent value; drop tombstones once they've propagated past the oldest remaining segment.

### 2.3 Functional Requirements (End-to-End)
- `put(key, value)` → writes to memtable; triggers flush if memtable is full.
- `get(key)` → checks memtable first, then SSTables from **newest to oldest** (critical: newer data must shadow older data), using bloom filters to skip SSTables when possible.
- `delete(key)` → writes a tombstone to the memtable (same path as `put`).
- `scan(start_key, end_key)` → range query merging results across the memtable and all relevant SSTables in sorted order, resolving duplicates by recency (stretch goal if full LSM scan is complex — at minimum, support scanning within a single SSTable).

### 2.4 Non-Functional Requirements
- Writes should never require a disk seek before returning (they go to the in-memory memtable) — this is the defining performance characteristic to demonstrate.
- Reads may require checking multiple SSTables — measure and report this "read amplification" directly (see benchmark section below).

### 2.5 Test Cases to Include
- Put enough keys to trigger at least 3 memtable flushes → verify 3+ SSTables exist on disk.
- Overwrite a key that exists in an older SSTable with a new value in the memtable; confirm `get` returns the new value (tests newest-wins ordering).
- Delete a key that exists in an old SSTable; confirm `get` returns `None` even before compaction runs.
- Run compaction across several SSTables with overlapping/duplicate keys and tombstones; verify final merged SSTable matches expected state.
- Range scan across a key range that spans the memtable and 2+ SSTables; verify sorted, deduplicated output.
- With bloom filters enabled, query for 100 non-existent keys and confirm most SSTables report "definitely not present" without a disk read.

### 2.6 Stretch Goals
- Implement **leveled compaction** with size ratios between levels (e.g. each level 10x larger than the previous), and enforce non-overlapping key ranges within a level.
- Add a **write-ahead log (WAL)** for the memtable so in-memory writes survive a crash before being flushed.

---

## 3. B-Tree

### 3.1 Overview
The classic read-optimized storage engine used by most traditional relational databases (PostgreSQL, MySQL/InnoDB, SQLite). Unlike the LSM-tree, updates happen in place on fixed-size pages, and the tree stays balanced via node splitting.

### 3.2 On-Disk Format
- Fix a **page size** (e.g. 4KB, matching real disk/OS page sizes — this is not arbitrary, it's why B-trees use fixed pages).
- Each page is either a **leaf node** (holds keys + values) or an **internal node** (holds keys + pointers/offsets to child pages).
- Store pages in a single file, addressed by page number (`page_number * page_size` = byte offset) — this gives O(1) page addressing without needing a separate index.

### 3.3 Functional Requirements

**Core operations**
- `insert(key, value)`:
  1. Traverse from root to the correct leaf page (binary search within each page on the sorted keys).
  2. Insert the key into the leaf in sorted position.
  3. If the leaf now exceeds page capacity, **split** it into two pages and insert a reference to the new page into the parent — propagate splits up the tree recursively, growing the tree height if the root itself splits.
- `get(key) -> value | None`: traverse from root to leaf via binary search at each level; O(log n) page reads.
- `range_scan(start_key, end_key)`: locate the starting leaf, then follow **leaf sibling pointers** (you'll need to store next-leaf pointers) to scan forward without re-traversing from the root each time.

**Write-Ahead Log (WAL) & Crash Recovery**
- Before modifying any page on disk, append the intended change to a WAL file.
- On restart after a crash, replay the WAL to redo any changes that were logged but not confirmed as flushed to the actual B-tree pages.
- Simulate a crash mid-page-write (e.g. kill the process after WAL append but before the page write completes) and verify recovery reconstructs a consistent tree.

### 3.4 Non-Functional Requirements
- Every operation (insert/get) should touch O(log n) pages, not O(n).
- Page splits must maintain the B-tree invariant: all leaves at the same depth, nodes stay within min/max key-count bounds.
- Document why in-place updates make B-trees more prone to needing a WAL (compare to the LSM-tree's WAL being optional/simpler) — this is a key conceptual takeaway from Ch3.

### 3.5 Test Cases to Include
- Insert enough keys to force at least 2 levels of splitting (root splits at least once); verify tree remains balanced (all leaves same depth) after each split.
- Point lookup for keys at various tree depths; verify correct O(log n) page-read count (add instrumentation to count page reads per operation).
- Range scan spanning multiple leaf pages; verify sorted, complete output using sibling pointers.
- Kill process mid-write (simulated); verify WAL replay restores a consistent, uncorrupted tree on restart.
- Insert keys in random order vs. sorted order; confirm both produce a valid balanced tree (sorted-order insertion is a classic edge case that stresses the splitting logic differently).

### 3.6 Stretch Goals
- Implement **deletion** with node merging/rebalancing (deletion is notably more complex than insertion in B-trees — it's a good test of real understanding).
- Add free-page tracking so deleted/merged pages can be reused instead of leaking disk space.

---

## 4. Benchmark: LSM-Tree vs. B-Tree

### 4.1 Overview
This is the payoff exercise — put your two storage engines from sections 2 and 3 head-to-head on identical workloads and *measure* the tradeoffs Ch3 describes, rather than just reading about them.

### 4.2 Benchmark Setup Requirements
- Both engines must expose the same interface (`put`, `get`, `delete`, `range_scan`) so the benchmark harness can run identical workloads against each without modification.
- Use **identical datasets** for each run: same keys, same values, same value sizes, same operation order (or same random seed if randomized).
- Run on the same machine, back-to-back, to control for hardware variance.

### 4.3 Metrics to Measure

**Write throughput**
- Writes/second for: (a) sequential key insertion, (b) random key insertion.
- Expectation to verify: LSM-tree should outperform B-tree on random-key write throughput (this is *the* headline LSM-tree advantage — confirm you actually observe it).

**Read latency**
- Average and p99 latency for point lookups, measured separately for:
  - Keys that were recently written (should be fast in both).
  - Keys written long ago, with many subsequent writes in between (worst case for LSM-tree without bloom filters — should show more disk reads / higher latency than B-tree).
- Range scan throughput (rows/second) for both engines.

**Space usage**
- Total on-disk bytes for the same logical dataset, measured:
  - Immediately after loading.
  - After deleting 30% of keys (before compaction/vacuum).
  - After compaction (LSM) — B-tree has no direct equivalent, note this asymmetry explicitly.

**Amplification metrics (the core Ch3 vocabulary — compute these explicitly, don't just eyeball it)**
- **Write amplification** = total bytes actually written to disk ÷ total logical bytes written by the application. (LSM-trees rewrite data during compaction; measure this overhead directly.)
- **Read amplification** = number of disk reads (or SSTable/page accesses) per logical `get` call. (LSM-tree reads may touch several SSTables; B-tree reads touch O(log n) pages regardless of write history.)
- **Space amplification** = actual on-disk size ÷ size of the logically-live (non-deleted, non-duplicate) data. (Relevant right after heavy overwrite/delete activity, before compaction runs.)

### 4.4 Deliverable
- A results table or chart comparing all metrics above across both engines.
- A short written conclusion (3–5 sentences) stating which engine wins on which metric and why — tie each result back to the *mechanism* (e.g. "B-tree read latency stayed flat because lookups are always O(log n) pages regardless of write history, while LSM-tree read latency increased with the number of unmerged SSTables").

### 4.5 Test/Validity Checks
- Before trusting any benchmark number, verify both engines return **identical query results** on the same dataset (correctness before performance).
- Run each benchmark at least 3 times and report median/range to rule out noise, especially for latency numbers.
- Vary dataset size (e.g. 10K, 100K, 1M keys) to see how each metric scales — amplification effects and latency gaps often only become visible at larger scale.