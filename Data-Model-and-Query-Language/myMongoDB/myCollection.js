import { getValue, deepClone } from "../../utilities/utils.js";

import myDocument from "./myDocument.js"

const OPERATORS = {

    $eq(actual, expected) {
        return Object.is(actual, expected);
    },

    $gt(actual, expected) {
        return actual > expected;
    },

    $gte(actual, expected) {
        return actual >= expected;
    },

    $lt(actual, expected) {
        return actual < expected;
    },

    $lte(actual, expected) {
        return actual <= expected;
    },

    $in(actual, expected) {

        if (!Array.isArray(expected))
            throw new Error("$in expects an array");

        return expected.includes(actual);
    },

    $exists(actual, expected, exists) {

        return Boolean(expected) === exists;
    }

};

function matches(document, filter) {

    for (const [path, condition] of Object.entries(filter)) {

        const {
            value,
            exists
        } = getValue(document, path);

        if (!evaluateCondition(value, exists, condition))
            return false;
    }

    return true;
}

function evaluateCondition(actual, exists, condition) {

    // Simple equality
    if (
        condition === null ||
        typeof condition !== "object" ||
        Array.isArray(condition)
    ) {
        return OPERATORS.$eq(actual, condition);
    }

    // Multiple operators
    for (const [operator, expected] of Object.entries(condition)) {

        const fn = OPERATORS[operator];

        if (!fn)
            throw new Error(
                `Unknown query operator: ${operator}`
            );

        if (!fn(actual, expected, exists))
            return false;
    }

    return true;
}


export default class MyCollection{

    #documents = new Map();

    constructor(name){
        this._name = name;
    }

    insert(document) {

        if (!document._id)
            throw new Error("_id required");

        this.#documents.set(
            document._id,
            deepClone(document)
        );

        return new myDocument(document, this);
    }

    find(filter = {}) {

        const result = [];

        for (const doc of this.#documents.values()) {

            if (matches(doc, filter)) {

                result.push(
                    new myDocument(
                        deepClone(doc),
                        this
                    ).data
                );
            }
        }

        return result;
    }

    update(id, document){

        this.#documents.set(
            id,
            deepClone(document)
        );
    }


    delete(id) {

        this.#documents.delete(id);
    }

    count() {

        return this.#documents.size;
    }

    dump() {

        return deepClone(
            [...this.#documents.values()]
        );
    }

}