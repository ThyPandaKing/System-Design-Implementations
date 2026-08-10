// import HashIndex from "./Hashindex";

import {HashIndex} from "./Hashindex.js";

const main = async () => {
    let path = "/Users/adityasharma/Library/Mobile Documents/com~apple~CloudDocs/Projects/System Design Implementation/System-Design-Implementations/Storage-and-Retrieval/Data/myData.db";

    let myDb = new HashIndex(path);

    await myDb.open();

    // await myDb.set("aditya", {"name": "Aditya Sharma", "ckass": "12th"});
    // console.log(await myDb.get("aditya"));

    // await myDb.set("animesh", {"name": "Animesh Sharma", "roll": "4"});
    // console.log(await myDb.get("animesh"));


    // await myDb.set("anand", {"name": "Anand Annu"});
    // console.log(await myDb.get("anand"));
    
    // await myDb.set("Pranjal", {"name": "Pranjal Sharma", "class": 12});
    // console.log(await myDb.get("Pranjal"));


    // await myDb.set("aditya", {"name": "Testing", "ckass": "changed"});
    // console.log(await myDb.get("aditya"));
    
    console.log(await myDb.get("aditya"));
    
    
}

main();