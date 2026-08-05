import { getValue, deepClone, setValue, isObject } from "../utilities/utils.js";


export default class myDocument{

    constructor(data, collection) {

        this._original = deepClone(data);

        this._working = deepClone(data);

        this._collection = collection;

        this._dirtyPaths = new Set();

        this.data = this.#createProxy(this._working, []);
    }

    #createProxy(target, currentPath) {

        return new Proxy(target, {

            get: (obj, prop) => {

                const value = obj[prop];

                if (isObject(value)) {
                    return this.#createProxy(
                        value,
                        [...currentPath, prop]
                    );
                }

                return value;
            },

            set: (obj, prop, value) => {

                const path =
                    [...currentPath, prop].join(".");

                obj[prop] = value;

                const oldValueObj =
                    getValue(this._original, path);

                if (Object.is(oldValueObj.value, value)) {
                    this._dirtyPaths.delete(path);
                } else {
                    this._dirtyPaths.add(path);
                }

                return true;
            },

            deleteProperty: (obj, prop) => {

                const path =
                    [...currentPath, prop].join(".");

                delete obj[prop];

                this._dirtyPaths.add(path);

                return true;
            }
        });
    }

    get modifiedPaths() {
        return [...this._dirtyPaths];
    }

    isModified(path) {
        return this._dirtyPaths.has(path);
    }

    async save() {

        if (this._dirtyPaths.size === 0)
            return;

    

        for (const path of this._dirtyPaths) {

            const {value} =
                getValue(this._working, path);

            
            await this._collection.update(
                this._working._id,
                value
            );
            
        }


        for (const path of this._dirtyPaths) {
            setValue(
                this._original,
                path,
                getValue(this._working, path).value
            );
        }

        this._dirtyPaths.clear();
    }

    rollback() {

        this._working = deepClone(this._original);

        this.data =
            this.#createProxy(this._working, []);

        this._dirtyPaths.clear();
    }

    toJSON() {
        return deepClone(this._working);
    }


}