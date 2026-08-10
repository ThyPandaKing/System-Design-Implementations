import fs from "node:fs/promises";
import Logger from "./FileLogger.js";

export class HashIndex {
  constructor(path, compactionThreshold = 10 * 1024 * 1024) {
    this.path = path;
    this.Logger = new Logger(path);

    this.hashIndex = new Map();

    this.compactionThreshold = compactionThreshold;
    this.compacting = false;
  }

  async open() {
    await this.Logger.open();
    await this.rebuildIndex();
  }

  async rebuildIndex() {
    const fullFile = await this.Logger.returnFull();

    let offset = 0;

    while (offset < fullFile.length) {
      offset = this.moveBuffer(fullFile, offset);
    }

    // Logger.open() already sets this, but keeping this
    // explicit makes the invariant clear.
    this.Logger.offset = fullFile.length;
  }

  async set(key, value) {
    const keyBuffer = Buffer.from(key);
    const valueBuffer = Buffer.from(JSON.stringify(value));

    const metaData = Buffer.alloc(8);

    metaData.writeUInt32BE(keyBuffer.length, 0);
    metaData.writeUInt32BE(valueBuffer.length, 4);

    const finalRecord = Buffer.concat([
      metaData,
      keyBuffer,
      valueBuffer,
    ]);

    // Append to log
    const offset = await this.Logger.set(finalRecord);

    // Latest record wins
    this.hashIndex.set(key, {
      offset,
      recordLength: finalRecord.length,
    });

    // Automatically compact when threshold is reached
    if (
      this.Logger.getSize() >= this.compactionThreshold &&
      !this.compacting
    ) {
      await this.compact();
    }

    return true;
  }

  async get(key) {
    const entry = this.hashIndex.get(key);

    if (!entry) {
      return null;
    }

    const {
      offset,
      recordLength,
    } = entry;

    const bufferRecord = await this.Logger.get(
      offset,
      recordLength
    );

    const finalValue = this.parseBuffer(bufferRecord);

    return JSON.parse(finalValue.value);
  }

  moveBuffer(buffer, offset) {
    const startOffset = offset;

    let recordLength = 8;

    // key length
    const keyLength = buffer.readUInt32BE(offset);
    offset += 4;

    // value length
    const valueLength = buffer.readUInt32BE(offset);
    offset += 4;

    // key
    const key = buffer.subarray(
      offset,
      offset + keyLength
    );

    offset += keyLength;

    recordLength += keyLength;
    recordLength += valueLength;

    this.hashIndex.set(key.toString(), {
      offset: startOffset,
      recordLength,
    });

    offset += valueLength;

    return offset;
  }

  parseBuffer(buffer) {
    let offset = 0;

    const keyLength = buffer.readUInt32BE(offset);
    offset += 4;

    const valueLength = buffer.readUInt32BE(offset);
    offset += 4;

    const key = buffer.subarray(
      offset,
      offset + keyLength
    );

    offset += keyLength;

    const value = buffer.subarray(
      offset,
      offset + valueLength
    );

    return {
      keyLength,
      valueLength,
      key: key.toString(),
      value: value.toString(),
    };
  }

  async compact() {
    if (this.compacting) {
      return;
    }

    this.compacting = true;

    console.log("Starting compaction...");

    const tempPath = `${this.path}.compacting`;

    try {
      // Create a new temporary file
      const tempHandle = await fs.open(
        tempPath,
        "w+"
      );

      let newOffset = 0;

      /*
       * We currently have:
       *
       * hashIndex:
       *
       * A -> { offset: 0, ... }
       * B -> { offset: 30, ... }
       * C -> { offset: 70, ... }
       *
       * Read each latest record and write it
       * sequentially to the new file.
       */
      for (const [key, entry] of this.hashIndex) {
        const oldRecord = await this.Logger.get(
          entry.offset,
          entry.recordLength
        );

        await tempHandle.write(
          oldRecord,
          0,
          oldRecord.length,
          newOffset
        );

        // IMPORTANT:
        // Update hash index to the NEW offset.
        this.hashIndex.set(key, {
          offset: newOffset,
          recordLength: oldRecord.length,
        });

        newOffset += oldRecord.length;
      }

      await tempHandle.close();

      /*
       * Replace old log with compacted log.
       */
      await this.Logger.replaceWith(tempPath);

      console.log(
        `Compaction complete. New size: ${newOffset} bytes`
      );
    } catch (error) {
      console.error("Compaction failed:", error);

      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore if file doesn't exist
      }

      throw error;
    } finally {
      this.compacting = false;
    }
  }
}