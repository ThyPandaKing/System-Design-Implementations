import fs from "node:fs/promises";

export default class Logger {
  constructor(path) {
    this.path = path;
    this.handle = null;
    this.offset = 0;
  }

  async open() {
    this.handle = await fs.open(this.path, "a+");

    // IMPORTANT:
    // If the file already contains data, offset must start
    // from the end of that data.
    const stat = await this.handle.stat();
    this.offset = stat.size;
  }

  async set(data) {
    const currOffset = this.offset;

    await this.handle.appendFile(data);

    this.offset += data.length;

    console.log(
      "current offset and next offset:",
      currOffset,
      this.offset
    );

    return currOffset;
  }

  async get(offset, length) {
    const buffer = Buffer.alloc(length);

    await this.handle.read(
      buffer,
      0,
      length,
      offset
    );

    return buffer;
  }

  async returnFull() {
    return await fs.readFile(this.path);
  }

  async close() {
    if (this.handle) {
      await this.handle.close();
      this.handle = null;
    }
  }

  getSize() {
    return this.offset;
  }

  async replaceWith(tempPath) {
    await this.close();

    // Rename the compacted file to the active file.
    // On Unix/macOS this replacement is atomic.
    await fs.rename(tempPath, this.path);

    await this.open();
  }
}