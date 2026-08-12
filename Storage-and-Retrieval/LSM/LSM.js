import fs from "node:fs/promises";
import path from "node:path";

import MemTable from "./Memtable.js";
import WAL from "./WAL.js";
import SSTable from "./SSTables.js";

export default class LSM {
    constructor({
        directory = "./data",
        memTableMaxEntries = 5,
        compactionThreshold = 3
    } = {}) {
        this.directory = directory;

        this.walPath =
            path.join(
                directory,
                "wal.log"
            );

        this.memTableMaxEntries =
            memTableMaxEntries;

        this.compactionThreshold =
            compactionThreshold;

        this.memTable = null;
        this.wal = null;

        // Newest SSTable first.
        this.sstables = [];

        this.nextSSTableId = 1;

        this.flushing = false;
        this.compacting = false;
    }

    async open() {
        await fs.mkdir(
            this.directory,
            { recursive: true }
        );

        this.wal =
            new WAL(this.walPath);

        await this.wal.open();

        await this.loadSSTables();

        this.memTable =
            new MemTable(
                this.memTableMaxEntries
            );

        await this.recover();

        return this;
    }

    async loadSSTables() {
        const files =
            await fs.readdir(
                this.directory
            );

        const sstableFiles =
            files
                .filter(file =>
                    /^sstable-\d+\.db$/.test(file)
                )
                .sort((a, b) => {
                    const aId =
                        Number(
                            a.match(/\d+/)[0]
                        );

                    const bId =
                        Number(
                            b.match(/\d+/)[0]
                        );

                    return bId - aId;
                });

        for (const file of sstableFiles) {
            const id =
                Number(
                    file.match(/\d+/)[0]
                );

            this.nextSSTableId =
                Math.max(
                    this.nextSSTableId,
                    id + 1
                );

            const table =
                new SSTable(
                    path.join(
                        this.directory,
                        file
                    )
                );

            await table.open();

            this.sstables.push(table);
        }
    }

    async recover() {
        await this.wal.replay(
            async record => {
                if (
                    record.operation === "PUT"
                ) {
                    this.memTable.put(
                        record.key,
                        record.value
                    );
                }

                if (
                    record.operation === "DELETE"
                ) {
                    this.memTable.delete(
                        record.key
                    );
                }
            }
        );
    }

    async put(key, value) {
        await this.wal.put(
            key,
            value
        );

        this.memTable.put(
            key,
            value
        );

        await this.maybeFlush();
    }

    async delete(key) {
        await this.wal.delete(key);

        this.memTable.delete(key);

        await this.maybeFlush();
    }

    async get(key) {
        // Newest data always wins.

        if (this.memTable.has(key)) {
            const value =
                this.memTable.get(key);

            if (
                this.memTable.isDeleted(key)
            ) {
                return undefined;
            }

            return value;
        }

        for (const table of this.sstables) {
            const result =
                await table.get(key);

            if (!result.found) {
                continue;
            }

            if (result.deleted) {
                return undefined;
            }

            return result.value;
        }

        return undefined;
    }

    async maybeFlush() {
        if (
            this.memTable.isFull()
        ) {
            await this.flush();
        }
    }

    async flush() {
        if (
            this.flushing ||
            this.memTable.isEmpty()
        ) {
            return;
        }

        this.flushing = true;

        try {
            const oldMemTable =
                this.memTable;

            this.memTable =
                new MemTable(
                    this.memTableMaxEntries
                );

            const id =
                this.nextSSTableId++;

            const fileName =
                `sstable-${id}.db`;

            const filePath =
                path.join(
                    this.directory,
                    fileName
                );

            const table =
                new SSTable(filePath);

            await table.open();

            await table.write(
                oldMemTable.entries()
            );

            /*
             * Newest table goes first.
             */
            this.sstables.unshift(table);

            /*
             * Safe ordering:
             *
             * 1. Data has been flushed to SSTable.
             * 2. Only now can WAL be cleared.
             */
            await this.wal.truncate();

            if (
                this.sstables.length >=
                this.compactionThreshold
            ) {
                await this.compact();
            }
        } finally {
            this.flushing = false;
        }
    }

    async compact() {
        if (
            this.compacting ||
            this.sstables.length <
            this.compactionThreshold
        ) {
            return;
        }

        this.compacting = true;

        try {
            /*
             * SSTables are ordered newest → oldest.
             *
             * Therefore the first occurrence of
             * a key is the newest version.
             */
            const merged = new Map();

            for (
                const table of this.sstables
            ) {
                for await (
                    const entry of table.scan()
                ) {
                    if (!merged.has(entry.key)) {
                        merged.set(
                            entry.key,
                            entry
                        );
                    }
                }
            }

            /*
             * Tombstones can be removed during a
             * full compaction because all existing
             * SSTables are being merged.
             */
            const compactedEntries = [];

            for (
                const entry of merged.values()
            ) {
                if (!entry.deleted) {
                    compactedEntries.push(
                        entry
                    );
                }
            }

            compactedEntries.sort(
                (a, b) =>
                    a.key.localeCompare(b.key)
            );

            const id =
                this.nextSSTableId++;

            const tempPath =
                path.join(
                    this.directory,
                    `sstable-${id}.tmp`
                );

            const finalPath =
                path.join(
                    this.directory,
                    `sstable-${id}.db`
                );

            const compacted =
                new SSTable(tempPath);

            await compacted.open();

            await compacted.write(
                compactedEntries
            );

            await compacted.close();

            /*
             * Replace the old SSTable set only after
             * the new table has been completely written.
             */
            const oldTables =
                this.sstables;

            this.sstables = [
                new SSTable(finalPath)
            ];

            await fs.rename(
                tempPath,
                finalPath
            );

            await this.sstables[0].open();

            for (
                const table of oldTables
            ) {
                await table.close();

                await fs.unlink(
                    table.path
                );
            }
        } finally {
            this.compacting = false;
        }
    }

    async close() {
        if (this.memTable?.size() > 0) {
            await this.flush();
        }

        for (
            const table of this.sstables
        ) {
            await table.close();
        }

        await this.wal.close();
    }
}