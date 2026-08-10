# System-Design-Implementations

# DDIA Practice Algorithms — Full Book Checklist

A list of implementable algorithms/systems mapped to each part of *Designing Data-Intensive Applications*, with a brief description and minimum functional requirements (MFR) for each.

---

## Part I: Foundations of Data Systems

### Ch 2 — Data Models and Query Languages

- [-] **Simple document store with a query engine**
  - *Description:* A JSON-document store (like a mini MongoDB) supporting basic filtering.
  - *MFR:* Insert/get documents by ID; query by field equality; support nested field access (e.g. `user.address.city`).

- [-] **Relational vs. graph model comparison**
  - *Description:* Model the same dataset (e.g. social network) as relational tables and as a graph, then implement one query in both.
  - *MFR:* One-to-many query (e.g. "friends of friends") implemented via SQL joins and via graph traversal; compare code complexity.

### Ch 3 — Storage and Retrieval

- [-] **Hash index with append-only log** (Bitcask-style)
  - *Description:* Simplest storage engine — in-memory hash map pointing to byte offsets in an append-only log file.
  - *MFR:* `put(key, value)` appends to log and updates in-memory index; `get(key)` reads via offset; background compaction merges segments and discards overwritten keys; crash recovery rebuilds index by replaying the log.

- [ ] **LSM-tree**
  - *Description:* Log-structured merge tree — writes go to an in-memory memtable, flushed to sorted SSTables on disk, merged via background compaction.
  - *MFR:* Memtable backed by sorted structure (skip list / red-black tree); flush to disk when size threshold hit; SSTable read path with binary search; multi-level compaction merging overlapping SSTables; optional bloom filter to skip SSTables without the key.

- [ ] **B-tree**
  - *Description:* Balanced tree storage engine using fixed-size disk pages.
  - *MFR:* Fixed-size page/node format; insert with node splitting on overflow; point lookup and range scan; write-ahead log (WAL) for crash recovery.

- [ ] **Benchmark: LSM-tree vs. B-tree**
  - *Description:* Compare the two engines built above.
  - *MFR:* Measure write throughput, read latency, and disk space usage on identical datasets; report write/read/space amplification.

### Ch 4 — Encoding and Evolution

- [ ] **Multi-format serialization comparison**
  - *Description:* Serialize identical data using JSON, Protocol Buffers, and Avro.
  - *MFR:* Same object serialized in all three formats; compare byte size.

- [ ] **Schema evolution test harness**
  - *Description:* Test forward/backward compatibility of schema changes.
  - *MFR:* Add a field, remove a field, rename a field; verify old code can read new data (forward compat) and new code can read old data (backward compat) for each format.

---

## Part II: Distributed Data

### Ch 5 — Replication

- [ ] **Single-leader replication (sync + async)**
  - *Description:* One leader accepts writes, replicates to follower nodes.
  - *MFR:* Leader appends writes to a replication log; followers apply log entries in order; support both synchronous (wait for follower ack) and asynchronous modes; simulate network delay/failure and measure replication lag.

- [ ] **Failover simulation**
  - *Description:* Force a leader crash and promote a follower.
  - *MFR:* Detect leader failure (timeout-based); elect new leader from followers; handle/report any writes lost in the process.

- [ ] **Multi-leader replication with conflict resolution**
  - *Description:* Multiple nodes accept writes independently; conflicts must be resolved.
  - *MFR:* Two+ leaders accepting concurrent writes to the same key; implement last-write-wins (LWW) using timestamps; implement version vectors to detect concurrent writes.

- [ ] **Leaderless replication with quorums**
  - *Description:* Dynamo-style replication — any node can accept reads/writes, using quorum consensus.
  - *MFR:* N replicas per key; configurable read quorum (R) and write quorum (W); read repair (fixing stale replicas on read); basic sloppy quorum/hinted handoff (optional stretch goal).

### Ch 6 — Partitioning

- [ ] **Key-range partitioning**
  - *Description:* Partition data by sorted key ranges across nodes.
  - *MFR:* Given N nodes, assign each a contiguous key range; route reads/writes to the correct node; support range scans across a single partition.

- [ ] **Hash partitioning**
  - *Description:* Partition data by hashing the key.
  - *MFR:* Consistent hash function maps key → partition; even distribution check across partitions; route requests correctly.

- [ ] **Consistent hashing with virtual nodes**
  - *Description:* Minimize data movement when adding/removing nodes.
  - *MFR:* Hash ring implementation; virtual nodes per physical node; simulate adding/removing a node and measure % of keys that must move (should be ~1/N, not all keys).

- [ ] **Secondary index partitioning**
  - *Description:* Support queries on non-key fields in a partitioned store.
  - *MFR:* Implement either local secondary indexes (index stored with the partition, scatter-gather query) or global secondary indexes (index partitioned separately, requires distributed write).

### Ch 7 — Transactions

- [ ] **Single-node transaction manager with isolation levels**
  - *Description:* A transaction engine over a simple key-value store.
  - *MFR:* Support read committed (no dirty reads); support snapshot isolation using MVCC (each transaction reads a consistent snapshot via version numbers); detect write skew in a test case.

- [ ] **Two-phase locking (2PL)**
  - *Description:* Lock-based concurrency control.
  - *MFR:* Shared/exclusive locks per key; transactions acquire locks before read/write and release only at commit/abort; deadlock detection (wait-for graph) and resolution (abort one transaction).

- [ ] **Serializable snapshot isolation (SSI)** *(stretch goal)*
  - *Description:* Optimistic concurrency control detecting serialization conflicts.
  - *MFR:* Track read/write dependencies between concurrent transactions; abort a transaction if a cycle/conflict is detected at commit time.

### Ch 8 — Trouble with Distributed Systems

- [ ] **Simulated network fault injector**
  - *Description:* A harness to test distributed algorithms under adverse conditions.
  - *MFR:* Inject random message delays, drops, duplicates, and reordering; inject clock skew between nodes; run your replication/consensus implementations through it and observe failure modes.

- [ ] **Lamport clocks**
  - *Description:* Logical clock to order events without synchronized time.
  - *MFR:* Each node maintains a counter incremented on every event; counter attached to and merged from every sent/received message; verify happens-before ordering across nodes.

- [ ] **Vector clocks**
  - *Description:* Logical clock capturing causal concurrency (not just total order).
  - *MFR:* Each node maintains a vector of counters (one per node); merge on message receipt; detect concurrent vs. causally-ordered events between two given clocks.

### Ch 9 — Consistency and Consensus

- [ ] **Linearizability checker**
  - *Description:* Verify whether a sequence of operations on a system is linearizable.
  - *MFR:* Given a log of concurrent read/write operations with timestamps, check if a valid total order exists consistent with real-time constraints.

- [ ] **Total order broadcast**
  - *Description:* Deliver messages to all nodes in the same order.
  - *MFR:* All nodes receive all messages; all nodes agree on the same delivery order, even with concurrent senders.

- [ ] **Raft consensus algorithm**
  - *Description:* Leader-based consensus protocol (the flagship algorithm for this chapter).
  - *MFR:* Leader election with randomized timeouts; log replication with majority acknowledgment; safety guarantee (committed entries never lost) under leader crashes; (stretch) log compaction/snapshotting.
  - *Best paired with:* MIT 6.824 Lab 2/3.

- [ ] **Two-phase commit (2PC)**
  - *Description:* Atomic commit protocol across multiple nodes/databases.
  - *MFR:* Coordinator sends prepare request to all participants; commit only if all vote yes, abort if any votes no; handle coordinator crash (participants block until recovery) — demonstrate this blocking failure mode explicitly.

---

## Part III: Derived Data

### Ch 10 — Batch Processing

- [ ] **MapReduce from scratch**
  - *Description:* A minimal single-machine (or multi-process) MapReduce implementation.
  - *MFR:* `map(key, value) -> list[(key, value)]`; shuffle/sort phase grouping by key; `reduce(key, list[values]) -> output`; run word count as the canonical test case.

- [ ] **Sort-merge join (batch join)**
  - *Description:* Join two large datasets using the sort-merge algorithm (as used in batch frameworks).
  - *MFR:* Sort both datasets by join key; merge-scan both sorted streams emitting matched pairs; should work without loading either full dataset into memory.

### Ch 11 — Stream Processing

- [ ] **Simple message log/broker** (Kafka-lite)
  - *Description:* An append-only log-based pub/sub system.
  - *MFR:* Producers append messages to a partitioned log; consumers track their own offset and can replay from any offset; support multiple consumer groups reading independently.

- [ ] **Stream windowing (tumbling and sliding windows)**
  - *Description:* Aggregate streaming events over time windows.
  - *MFR:* Tumbling window (fixed, non-overlapping) aggregation (e.g. count per minute); sliding window aggregation; handle out-of-order events using event-time vs. processing-time with a watermark.

- [ ] **Stream-table join / change data capture (CDC)**
  - *Description:* Join a stream of events against a changing table, as in materialized view maintenance.
  - *MFR:* Maintain a local changelog-backed table from a CDC stream; join incoming stream events against current table state; update output when the table changes.

### Ch 12 — The Future of Data Systems

- [ ] **Lambda vs. Kappa architecture prototype**
  - *Description:* Build the same analytics pipeline two ways: batch+stream (Lambda) vs. stream-only (Kappa).
  - *MFR:* Lambda: batch job + stream job both feeding a merged serving layer; Kappa: single stream pipeline with replay-from-log for reprocessing. Compare code complexity and correctness under reprocessing.

---

## Suggested Build Order

1. Hash index → LSM-tree → B-tree (Ch3)
2. Serialization comparison (Ch4)
3. Single-leader replication → multi-leader → leaderless (Ch5)
4. Hash/range partitioning → consistent hashing (Ch6)
5. Transaction manager with MVCC → 2PL (Ch7)
6. Fault injector → Lamport/vector clocks (Ch8)
7. Raft → 2PC → linearizability checker (Ch9)
8. MapReduce → sort-merge join (Ch10)
9. Message log → windowing → CDC join (Ch11)
10. Lambda/Kappa prototype (Ch12)

Each system builds on primitives from the previous one (e.g. Raft reuses your replication log design; the stream broker reuses your log-structured storage from Ch3), so working through them in order compounds your understanding rather than treating each as an isolated exercise.