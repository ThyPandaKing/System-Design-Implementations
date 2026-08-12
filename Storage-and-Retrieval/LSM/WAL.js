// WAL.js

import Logger from "../Hashindex/FileLogger.js"

const PUT = 1;
const DELETE = 2;

export default class WAL {
    constructor(path) {
        this.logger = new Logger(path);
    }

    async open() {
        await this.logger.open();
    }

    async put(key, value) {
        return this.append(PUT, key, value);
    }

    async delete(key) {
        return this.append(DELETE, key, "");
    }

    async append(operation, key, value) {
        const keyBuffer = Buffer.from(String(key));
        const valueBuffer = Buffer.from(String(value));

        const buffer = Buffer.alloc(
            1 + 4 + 4 + keyBuffer.length + valueBuffer.length
        );

        let offset = 0;

        // Operation
        buffer.writeUInt8(operation, offset);
        offset += 1;

        // Key length
        buffer.writeUInt32BE(keyBuffer.length, offset);
        offset += 4;

        // Value length
        buffer.writeUInt32BE(valueBuffer.length, offset);
        offset += 4;

        // Key
        keyBuffer.copy(buffer, offset);
        offset += keyBuffer.length;

        // Value
        valueBuffer.copy(buffer, offset);

        return await this.logger.set(buffer);
    }

    async replay(callback) {
        const data = await this.logger.returnFull();

        let offset = 0;

        while (offset < data.length) {
            // Make sure we have enough bytes for the header.
            if (data.length - offset < 9) {
                throw new Error("Corrupted WAL: incomplete header");
            }

            const operation = data.readUInt8(offset);
            offset += 1;

            const keyLength = data.readUInt32BE(offset);
            offset += 4;

            const valueLength = data.readUInt32BE(offset);
            offset += 4;

            const recordLength = keyLength + valueLength;

            if (data.length - offset < recordLength) {
                throw new Error("Corrupted WAL: incomplete record");
            }

            const key = data
                .subarray(offset, offset + keyLength)
                .toString();

            offset += keyLength;

            const value = data
                .subarray(offset, offset + valueLength)
                .toString();

            offset += valueLength;

            if (operation === PUT) {
                await callback({
                    operation: "PUT",
                    key,
                    value
                });
            } else if (operation === DELETE) {
                await callback({
                    operation: "DELETE",
                    key
                });
            } else {
                throw new Error(`Unknown WAL operation: ${operation}`);
            }
        }
    }

    async truncate() {
        const tempPath = `${this.logger.path}.empty`;

        const empty = new Logger(tempPath);
        await empty.open();
        await empty.close();

        await this.logger.replaceWith(tempPath);
    }

    async close() {
        await this.logger.close();
    }
}