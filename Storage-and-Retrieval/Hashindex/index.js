
import fs from "node:fs/promises";
import  {HashIndex}  from "./Hashindex.js";

const DB_PATH = "./data/hash-index.log";

async function main() {
  console.log("========================================");
  console.log(" Hash Index Storage Engine Test");
  console.log("========================================");

  // Clean previous test data
  await fs.rm("./data", {
    recursive: true,
    force: true,
  });

  await fs.mkdir("./data", {
    recursive: true,
  });

  /*
   * Small threshold intentionally used so that
   * compaction happens during this test.
   *
   * For example:
   * 500 bytes instead of 10 MB.
   */
  const COMPACTION_THRESHOLD = 500;

  const db = new HashIndex(
    DB_PATH,
    COMPACTION_THRESHOLD
  );

  await db.open();

  // ========================================
  // Case 1: Basic inserts
  // ========================================

  console.log("\n========================================");
  console.log("Case 1: Basic Inserts");
  console.log("========================================");

  await db.set("user:1", {
    name: "Aditya",
    age: 23,
    role: "Software Engineer",
  });

  await db.set("user:2", {
    name: "Rahul",
    age: 25,
    role: "Backend Engineer",
  });

  await db.set("user:3", {
    name: "Priya",
    age: 24,
    role: "Frontend Engineer",
  });

  console.log("user:1 =", await db.get("user:1"));
  console.log("user:2 =", await db.get("user:2"));
  console.log("user:3 =", await db.get("user:3"));

  // ========================================
  // Case 2: Update existing keys
  // ========================================

  console.log("\n========================================");
  console.log("Case 2: Updates");
  console.log("========================================");

  await db.set("user:1", {
    name: "Aditya",
    age: 24,
    role: "Senior Software Engineer",
  });

  await db.set("user:2", {
    name: "Rahul",
    age: 26,
    role: "Senior Backend Engineer",
  });

  console.log("Updated user:1 =", await db.get("user:1"));
  console.log("Updated user:2 =", await db.get("user:2"));

  // ========================================
  // Case 3: More writes
  // This should trigger compaction because
  // the threshold is deliberately small.
  // ========================================

  console.log("\n========================================");
  console.log("Case 3: Trigger Compaction");
  console.log("========================================");

  for (let i = 4; i <= 20; i++) {
    await db.set(`user:${i}`, {
      name: `User ${i}`,
      age: 20 + i,
      role: "Engineer",
      skills: [
        "JavaScript",
        "Node.js",
        "System Design",
      ],
    });
  }

  console.log("Writes completed.");

  // ========================================
  // Case 4: Verify latest values after
  // compaction
  // ========================================

  console.log("\n========================================");
  console.log("Case 4: Verify After Compaction");
  console.log("========================================");

  console.log("user:1 =", await db.get("user:1"));
  console.log("user:2 =", await db.get("user:2"));
  console.log("user:10 =", await db.get("user:10"));
  console.log("user:20 =", await db.get("user:20"));

  // ========================================
  // Case 5: Check missing key
  // ========================================

  console.log("\n========================================");
  console.log("Case 5: Missing Key");
  console.log("========================================");

  console.log(
    "user:999 =",
    await db.get("user:999")
  );

  // ========================================
  // Case 6: Inspect index
  // ========================================

  console.log("\n========================================");
  console.log("Case 6: Hash Index");
  console.log("========================================");

  console.log(
    "Number of indexed keys:",
    db.hashIndex.size
  );

  console.log(
    "Index:",
    Object.fromEntries(db.hashIndex)
  );

  // ========================================
  // Case 7: Restart database
  //
  // This verifies that the index can be
  // rebuilt from the persisted log.
  // ========================================

  console.log("\n========================================");
  console.log("Case 7: Restart / Rebuild Index");
  console.log("========================================");

  await db.Logger.close();

  const db2 = new HashIndex(
    DB_PATH,
    COMPACTION_THRESHOLD
  );

  await db2.open();

  console.log(
    "Rebuilt index size:",
    db2.hashIndex.size
  );

  console.log(
    "user:1 after restart =",
    await db2.get("user:1")
  );

  console.log(
    "user:10 after restart =",
    await db2.get("user:10")
  );

  console.log(
    "user:20 after restart =",
    await db2.get("user:20")
  );

  await db2.Logger.close();

  console.log("\n========================================");
  console.log("All tests completed");
  console.log("========================================");
}

main().catch((error) => {
  console.error("\nTEST FAILED");
  console.error(error);
  process.exit(1);
});

