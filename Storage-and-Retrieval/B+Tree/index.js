import BPlusTree from "./BPlusTree.js";

const tree = new BPlusTree(4);

const values = [
    10,
    20,
    30,
    40,
    50,
    60,
    70,
    80,
    90,
    100,
    110,
    120,
    130,
    140,
    150
];

for (const key of values) {
    tree.insert(key, `value-${key}`);
}

console.log("========== TREE ==========");
tree.print();

console.log("\n========== SEARCH ==========");

console.log("10  ->", tree.search(10));
console.log("50  ->", tree.search(50));
console.log("100 ->", tree.search(100));
console.log("150 ->", tree.search(150));
console.log("999 ->", tree.search(999));

console.log("\n========== FULL SCAN ==========");

console.log(tree.scan());

console.log("\n========== DUPLICATE ==========");

console.log(
    "Insert duplicate 50:",
    tree.insert(50, "duplicate")
);

console.log("50 ->", tree.search(50));