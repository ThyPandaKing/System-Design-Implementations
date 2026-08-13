import avro from "avsc";

const userSchema = {
  type: "record",
  name: "User",
  fields: [
    {
      name: "user_id",
      type: "int"
    },
    {
      name: "username",
      type: "string"
    },
    {
      name: "is_active",
      type: "boolean"
    },
    {
      name: "signup_timestamp",
      type: "long"
    },
    {
      name: "tags",
      type: {
        type: "array",
        items: "string"
      }
    },
    {
      name: "address",
      type: {
        type: "record",
        name: "Address",
        fields: [
          {
            name: "city",
            type: "string"
          },
          {
            name: "zip",
            type: "string"
          }
        ]
      }
    }
  ]
};

const user = {
  user_id: 12345,
  username: "alice",
  signup_timestamp: 1712345678,
  is_active: true,
  tags: ["premium", "beta_tester"],
  address: {
    city: "Bengaluru",
    zip: "560001"
  }
};



const User = avro.Type.forSchema(userSchema);

const encoded = User.toBuffer(user);

console.log(encoded);
console.log("Size:", encoded.length, "bytes");

const decoded = User.fromBuffer(encoded);

console.dir(decoded, { depth: null });