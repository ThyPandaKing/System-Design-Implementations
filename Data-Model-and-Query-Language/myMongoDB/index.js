import MyCollection from "./myCollection.js";

async function main() {
  const users = new MyCollection("users");

  console.log("========================================");
  console.log("Case 1 : Insert & Find");
  console.log("========================================");

  const user = users.insert({
    _id: 1,
    name: "Aditya",
    age: 25,
    marks: {
      maths: 90,
      physics: 80,
    },
  });

  console.log("Inserted User:");
  console.log(user.toJSON());

  console.log("\nFind by _id:");
  console.log(users.find({ _id: 1 })[0]);

  console.log("\n========================================");
  console.log("Case 2 : Dirty Tracking");
  console.log("========================================");

  user.data.name = "John";
  user.data.marks.maths = 100;

  console.log("Working Copy:");
  console.log(user.toJSON());

  console.log("\nModified Paths:");
  console.log(user.modifiedPaths);

  console.log("\n========================================");
  console.log("Case 3 : Save");
  console.log("========================================");

  await user.save();

  console.log("Modified Paths After Save:");
  console.log(user.modifiedPaths);

  console.log("\nDocument In Collection:");
  console.log(users.find({ _id: 1 }));

  console.log("\n========================================");
  console.log("Case 4 : Rollback");
  console.log("========================================");

  user.data.name = "Alice";
  user.data.marks.physics = 50;

  console.log("Before Rollback:");
  console.log(user.toJSON());

  console.log("Dirty:");
  console.log(user.modifiedPaths);

  user.rollback();

  console.log("\nAfter Rollback:");
  console.log(user.toJSON());

  console.log("Dirty:");
  console.log(user.modifiedPaths);

  console.log("\n========================================");
  console.log("Case 5 : Delete Field");
  console.log("========================================");

  delete user.data.age;

  console.log("Before Save:");
  console.log(user.toJSON());

  console.log("Dirty:");
  console.log(user.modifiedPaths);

  await user.save();

  console.log("\nStored Document:");
  console.log(users.find({ _id: 1 }));

  console.log("\n========================================");
  console.log("Case 6 : Filter User");
  console.log("========================================");

  console.log("\n========================================");
  console.log("Case 6 : Advanced Filtering");
  console.log("========================================");

  users.insert({
    _id: 2,
    name: "Pranjal",
    age: 40,
    city: "Delhi",
    marks: {
      maths: 200,
      physics: 80,
    },
  });

  users.insert({
    _id: 3,
    name: "Animesh",
    age: 30,
    city: "Mumbai",
    marks: {
      maths: 95,
      physics: 75,
    },
  });

  users.insert({
    _id: 4,
    name: "Rahul",
    age: 19,
    marks: {
      maths: 65,
      physics: 91,
    },
  });

  users.insert({
    _id: 5,
    name: "Karan",
    age: 27,
    city: "Bangalore",
    marks: {
      maths: 88,
      physics: 84,
    },
  });

  console.log("\nAll Users:");
  console.log(users.dump());

  console.log("\n1. Age > 25");
  console.log(
    users.find({
      age: { $gt: 25 },
    }),
  );

  console.log("\n2. 20 <= Age < 35");
  console.log(
    users.find({
      age: {
        $gte: 20,
        $lt: 35,
      },
    }),
  );

  console.log("\n3. Maths Marks >= 90");
  console.log(
    users.find({
      "marks.maths": {
        $gte: 90,
      },
    }),
  );

  console.log("\n4. City IN [Delhi, Bangalore]");
  console.log(
    users.find({
      city: {
        $in: ["Delhi", "Bangalore"],
      },
    }),
  );

  console.log("\n5. Users having city field");
  console.log(
    users.find({
      city: {
        $exists: true,
      },
    }),
  );

  console.log("\n6. Users without city field");
  console.log(
    users.find({
      city: {
        $exists: false,
      },
    }),
  );

  console.log("\n7. Maths > 80 AND Age < 30");
  console.log(
    users.find({
      age: {
        $lt: 30,
      },
      "marks.maths": {
        $gt: 80,
      },
    }),
  );

  console.log("\n8. Age IN [19, 25, 40]");
  console.log(
    users.find({
      age: {
        $in: [19, 25, 40],
      },
    }),
  );
}

main().catch(console.error);
