import ObjectToEncode from "./ObjectToEncode.js";

// simple json serial encoding

const str_output = JSON.stringify(ObjectToEncode);

const buffer = Buffer.from(str_output);

console.log(buffer.byteLength);
console.log(str_output.length);