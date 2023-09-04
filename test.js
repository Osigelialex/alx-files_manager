// Base64 Encoded String
let base64string = "VHV0b3JpYWxzUG9pbnQ=";

// Creating the buffer object with utf8 encoding
let bufferObj = Buffer.from(base64string, "base64").toString('utf-8');
console.log(bufferObj);

const writeFile = require('fs').writeFile;
const promisify = require('util').promisify;
// // Decoding base64 into String
// let string = bufferObj.toString("utf8");

// // Printing the base64 decoded string
// console.log("The Decoded base64 string is:", string);

const f = promisify(writeFile)
f('./adan.txt', bufferObj);