import Logger from "./FileLogger.js";

export class HashIndex {
  constructor(path) {
    this.path = path;
    this.Logger = new Logger(path);
    this.hashIndex = new Map();
  }

  async open() {
    await this.Logger.open();
    await this.rebuildIndex();
  }

  async rebuildIndex() {
    // we read the whole file
    const fullFile = await this.Logger.returnFull();

    let offset = 0;

    while(offset < fullFile.length){
        offset = this.moveBuffer(fullFile, offset);
    }
  }

  async set(key, value) {
    // create buffer

    let keyBuffer = Buffer.from(key);
    let valueBuffer = Buffer.from(JSON.stringify(value));

    let metaData = Buffer.alloc(8);

    metaData.writeUInt32BE(keyBuffer.length, 0);
    metaData.writeUInt32BE(valueBuffer.length, 4);

    let finalRecord = Buffer.concat([metaData, keyBuffer, valueBuffer]);

    // write buffer to file
    const offset = await this.Logger.set(finalRecord);

    this.hashIndex.set(key, {
      offset: offset,
      recordLength: finalRecord.length,
    });

    return true;
  }

  async get(key) {
    const entry = this.hashIndex.get(key);

    if (!entry) {
      return null;
    }

    // read from map
    const { offset, recordLength } = entry;

    const bufferRecord = await this.Logger.get(offset, recordLength);

    // de-construct buffer record
    const finalValue = this.parseBuffer(bufferRecord);

    console.log(JSON.stringify(finalValue, "", 2));

    return JSON.parse(finalValue.value);
  }

  moveBuffer(buffer, offset){
    const startOffset = offset;
    let recordLength = 8; // 4 + 4

    // First 4 bytes of current record → key length
    const keyLength = buffer.readUInt32BE(offset);
    offset += 4;

    // Next 4 bytes → value length
    const valueLength = buffer.readUInt32BE(offset);
    offset += 4;

    // Next keyLength bytes → key
    const key = buffer.subarray(offset, offset + keyLength);
    offset += keyLength;
    
    recordLength += keyLength;
    recordLength += valueLength;

    this.hashIndex.set(key.toString(), {offset: startOffset, recordLength: recordLength});

    offset += valueLength;
    
    return offset;
  }

  parseBuffer(buffer) {
    let offset = 0;

    // First 4 bytes → key length
    const keyLength = buffer.readUInt32BE(offset);
    offset += 4;

    // Next 4 bytes → value length
    const valueLength = buffer.readUInt32BE(offset);
    offset += 4;

    // Next keyLength bytes → key
    const key = buffer.subarray(offset, offset + keyLength);
    offset += keyLength;

    // Next valueLength bytes → value
    const value = buffer.subarray(offset, offset + valueLength);

    return {
      keyLength,
      valueLength,
      key: key.toString(),
      value: value.toString(),
    };
  }
}
