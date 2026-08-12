import fs from "node:fs/promises";

import LSMTree from "./LSM.js";

const DATA_DIR = "./lsm-data";

async function clean() {
    await fs.rm(
        DATA_DIR,
        {
            recursive: true,
            force: true
        }
    );
}

async function main() {
    await clean();

    console.log(
        "\n=============================="
    );
    console.log(
        "Creating LSM Tree"
    );
    console.log(
        "=============================="
    );

    let db = new LSMTree({
        directory: DATA_DIR,

        // Small number so we can easily
        // demonstrate flushing.
        memTableMaxEntries: 3,

        // Compact after 3 SSTables.
        compactionThreshold: 3
    });

    await db.open();

    console.log("\n--- INSERT ---");

    await db.put("user1", "Aditya");
    await db.put("user2", "Rahul");
    await db.put("user3", "Amit");

    /*
     * 3 entries -> automatic flush
     */

    console.log(
        "user1:",
        await db.get("user1")
    );

    console.log(
        "user2:",
        await db.get("user2")
    );

    console.log("\n--- MORE INSERTS ---");

    await db.put("user4", "John");
    await db.put("user5", "Sam");
    await db.put("user6", "David");

    /*
     * Another automatic flush.
     */

    console.log("\n--- UPDATE ---");

    await db.put(
        "user1",
        "Aditya Updated"
    );

    await db.put(
        "user2",
        "Rahul Updated"
    );

    await db.put(
        "user7",
        "New User"
    );

    /*
     * Third flush should trigger
     * automatic compaction.
     */

    console.log(
        "user1:",
        await db.get("user1")
    );

    console.log("\n--- DELETE ---");

    await db.delete("user3");

    console.log(
        "user3:",
        await db.get("user3")
    );

    await db.put(
        "user8",
        "Another User"
    );

    await db.put(
        "user9",
        "Another User 2"
    );

    console.log(
        "\n--- BEFORE CLOSE ---"
    );

    console.log(
        "user1:",
        await db.get("user1")
    );

    console.log(
        "user3:",
        await db.get("user3")
    );

    console.log(
        "user9:",
        await db.get("user9")
    );

    await db.close();

    /*
     * ============================
     * Restart database
     * ============================
     */

    console.log(
        "\n=============================="
    );
    console.log(
        "Restarting database"
    );
    console.log(
        "=============================="
    );

    db = new LSMTree({
        directory: DATA_DIR,
        memTableMaxEntries: 3,
        compactionThreshold: 3
    });

    await db.open();

    console.log(
        "\n--- AFTER RESTART ---"
    );

    console.log(
        "user1:",
        await db.get("user1")
    );

    console.log(
        "user2:",
        await db.get("user2")
    );

    console.log(
        "user3:",
        await db.get("user3")
    );

    console.log(
        "user4:",
        await db.get("user4")
    );

    console.log(
        "user7:",
        await db.get("user7")
    );

    console.log(
        "user9:",
        await db.get("user9")
    );

    await db.close();

    console.log(
        "\n=============================="
    );
    console.log(
        "LSM test completed"
    );
    console.log(
        "=============================="
    );
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});