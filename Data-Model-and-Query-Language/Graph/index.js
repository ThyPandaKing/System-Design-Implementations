import Database from "better-sqlite3";
import Graph from "./Graph.js";
import GraphNode from "./GraphNode.js";

const db = new Database(":memory:");

db.exec(`
CREATE TABLE Users(
    id TEXT PRIMARY KEY,
    name TEXT,
    age INTEGER
);

CREATE TABLE Friendships(
    from_user TEXT,
    to_user TEXT,
    PRIMARY KEY(from_user,to_user)
);

CREATE INDEX idx_from
ON Friendships(from_user);
`);

const insertUser = db.prepare(`
INSERT INTO Users
VALUES (?,?,?)
`);

const insertFriend = db.prepare(`
INSERT INTO Friendships
VALUES (?,?)
`);

const friendStmt = db.prepare(`
SELECT to_user
FROM Friendships
WHERE from_user=?
`);

const bfsStmt = db.prepare(`
WITH RECURSIVE Friends(id,depth) AS(

SELECT to_user,1
FROM Friendships
WHERE from_user=?

UNION

SELECT f.to_user,
Friends.depth+1
FROM Friendships f
JOIN Friends
ON Friends.id=f.from_user
WHERE Friends.depth<2

)

SELECT DISTINCT id
FROM Friends;
`);

const graph = new Graph("Friends");

const users = [];

const names = [
"Aditya","Rahul","Priya","Ankit","Neha","Rohit","Sneha","Karan","Meera","Aman",
"Nikhil","Pooja","Vikas","Riya","Siddharth","Kavya","Arjun","Isha","Varun","Ananya",
"Deepak","Simran","Harsh","Aditi","Yash","Tanvi","Abhishek","Muskan","Akash","Divya",
"Gaurav","Shreya","Rakesh","Nandini","Mohit","Sakshi","Ayush","Komal","Manish","Payal"
];

for(const name of names){

    const user=new GraphNode({
        name,
        age:20+Math.floor(Math.random()*15)
    });

    users.push(user);

    graph.addNode(user);

    insertUser.run(
        user.id,
        user.data.name,
        user.data.age
    );
}

const edges=new Set();

while(edges.size<100){

    const a=Math.floor(Math.random()*users.length);
    const b=Math.floor(Math.random()*users.length);

    if(a===b)continue;

    const u=users[a];
    const v=users[b];

    const key=u.id<v.id?
        `${u.id}-${v.id}`:
        `${v.id}-${u.id}`;

    if(edges.has(key))continue;

    edges.add(key);

    graph.addEdge(u,v);
    graph.addEdge(v,u);

    insertFriend.run(u.id,v.id);
    insertFriend.run(v.id,u.id);
}

const start=users[0];

const ITERATIONS=100000;

console.log("\nDirect Friends\n");

console.time("Graph");

for(let i=0;i<ITERATIONS;i++){
    graph.provideNodes(start);
}

console.timeEnd("Graph");

console.time("SQLite");

for(let i=0;i<ITERATIONS;i++){
    friendStmt.all(start.id);
}

console.timeEnd("SQLite");

console.log("\nFriends of Friends (Depth 2)\n");

console.time("Graph BFS");

for(let i=0;i<ITERATIONS;i++){
    graph.bfs(start,2);
}

console.timeEnd("Graph BFS");

console.time("SQLite Recursive");

for(let i=0;i<ITERATIONS;i++){
    bfsStmt.all(start.id);
}

console.timeEnd("SQLite Recursive");

console.log("\nExample Results\n");

console.log(
    "Graph Friends:",
    graph.provideNodes(start).length
);

console.log(
    "SQLite Friends:",
    friendStmt.all(start.id).length
);

console.log(
    "Graph BFS:",
    graph.bfs(start,2).length
);

console.log(
    "SQLite BFS:",
    bfsStmt.all(start.id).length
);