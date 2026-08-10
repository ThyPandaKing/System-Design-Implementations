const Logger = {
    write: async (key, value, segment) => {
        // 
        const {keySize, valueSize, keyRaw, valueRaw} = await findKeyValueSize(key, value);


    },

    read: async () => {

    }
};

function encodeData(value){
    // string encoding for now

    if(typeof value === "object"){
        value = JSON.stringify();
    }

    return value;
}

async function  findKeyValueSize(key, value){
    
    const keyRaw = encodeData(key);
    const valueRaw = encodeData(value);
    const keySize = keyRaw.size();
    const valueSize = valueRaw.size();

    return {keySize, valueSize, keyRaw, valueRaw};
}