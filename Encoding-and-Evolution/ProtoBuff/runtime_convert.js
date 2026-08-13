import protobuf from "protobufjs";

const root = await protobuf.load("object_struct.proto");
const User = root.lookupType("User");
const message = User.create({
  userId: 12345,
  username: "alice",
  isActive: true,
  signupTimestamp: 1712345678,
  tags: ["premium", "beta_tester"],
  address: {
    city: "Bengaluru",
    zip: "560001"
  }
});

for (const [name, field] of Object.entries(User.fields)) {
  console.log(name, field.id, field.type);
}

console.log("MESSAGE:");
console.dir(message, { depth: null });

const encoded = User.encode(message).finish();

console.log("\nENCODED:");
console.log(encoded.length);

const decoded = User.decode(encoded);


// console.log("\nDECODED:");
// console.dir(decoded);

console.log("\nAS JSON:");
console.log(JSON.stringify(User.toObject(decoded)).length);