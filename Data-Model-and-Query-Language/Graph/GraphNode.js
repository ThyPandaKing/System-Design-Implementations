export default class GraphNode {
    constructor(data) {
        this._id = crypto.randomUUID();
        this._data = data;
    }

    get id() {
        return this._id;
    }

    get data() {
        return this._data;
    }
}