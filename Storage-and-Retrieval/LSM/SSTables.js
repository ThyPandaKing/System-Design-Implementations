// SSTable.js

import Logger from "../Hashindex/FileLogger.js";

export const TOMBSTONE = "__TOMBSTONE__";

export default class SSTable {
    constructor(path) {
        this.path = path;
        this.logger = new Logger(path);
    }

    async open() {
        await this.logger.open();
    }

    async write(entries) {
        for (const entry of entries) {
            const keyBuffer = Buffer.from(String(entry.key));

            const isDeleted =
                entry.deleted || entry.value === TOMBSTONE;

            const valueBuffer = isDeleted
                ? Buffer.alloc(0)
                : Buffer.from(String(entry.value));

            const buffer = Buffer.alloc(
                4 +
                4 +
                keyBuffer.length +
                valueBuffer.length
            );

            let offset = 0;

            buffer.writeUInt32BE(keyBuffer.length, offset);
            offset += 4;

            buffer.writeUInt32BE(valueBuffer.length, offset);
            offset += 4;

            keyBuffer.copy(buffer, offset);
            offset += keyBuffer.length;

            valueBuffer.copy(buffer, offset);

            await this.logger.set(buffer);
        }
    }

    async get(searchKey) {
        const data = await this.logger.returnFull();

        let offset = 0;

        while (offset < data.length) {
            const keyLength = data.readUInt32BE(offset);
            offset += 4;

            const valueLength = data.readUInt32BE(offset);
            offset += 4;

            const key = data
                .subarray(offset, offset + keyLength)
                .toString();

            offset += keyLength;

            const value = data
                .subarray(offset, offset + valueLength)
                .toString();

            offset += valueLength;

            const comparison = key.localeCompare(String(searchKey));

            if (comparison === 0) {
                if (valueLength === 0) {
                    return {
                        found: true,
                        deleted: true,
                        value: undefined
                    };
                }

                return {
                    found: true,
                    deleted: false,
                    value
                };
            }

            // Since SSTable is sorted, we can stop early.
            if (comparison > 0) {
                return {
                    found: false
                };
            }
        }

        return {
            found: false
        };
    }

    async *scan() {
        const data = await this.logger.returnFull();

        let offset = 0;

        while (offset < data.length) {
            const keyLength = data.readUInt32BE(offset);
            offset += 4;

            const valueLength = data.readUInt32BE(offset);
            offset += 4;

            const key = data
                .subarray(offset, offset + keyLength)
                .toString();

            offset += keyLength;

            const value = data
                .subarray(offset, offset + valueLength)
                .toString();

            offset += valueLength;

            yield {
                key,
                value: valueLength === 0 ? undefined : value,
                deleted: valueLength === 0
            };
        }
    }

    async close() {
        await this.logger.close();
    }
}