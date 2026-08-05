export function deepClone(obj){
    return structuredClone(obj);
}


export function isObject(obj){

    return obj !== null &&
           typeof obj === "object" &&
           !Array.isArray(obj);

}

// returns null if value is not there
export function getValue(obj, path){
    let nested = path.split(".");
    let current = obj;

    nested.forEach(element => {
        if(current[element] !== undefined){
            current = current[element];
        }else  return {
                exists: false,
                value: undefined
            };
    });

    return {
                exists: true,
                value: current
            };
}

// sets value of an object with path as .
export function setValue(obj, path, value){
    let nested = path.split(".");
    let current = obj;

    nested.forEach((element, index) => {

        if(index == nested.length - 1){
            current = value;
            return true;
        }

        if(current[element] === undefined){
            current[element] = {};
        }
        
        current = current[element];
        
    });

    return true;
}

