import fs from "node:fs/promises";


export default class Logger {

    constructor(path){
        this.path = path;
        this.handle = null;
        this.offset = 0;
    }

    async open() {
        this.handle = await fs.open(this.path, "a+");
    }

    async set(data){

        await this.handle.appendFile(data);

        const currOffset = this.offset;

        this.offset += data.length;

        console.log("current offset and next offset: ", currOffset, this.offset);

        return currOffset;
    }

    async get(offset, length){

        const buffer = Buffer.alloc(length);

        await this.handle.read(
            buffer,
            0,
            length,
            offset
        );
        // console.log("current offset and next offset: ", currOffset, this.offset);

        return buffer;

    }

    async returnFull(){
        const contents = await fs.readFile(this.path);

        return contents;
    }
   
}