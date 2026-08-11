export default class BNode {
    constructor(key, data = null) {
        this.key = key;
        this.data = data;

        // Used by leaf nodes.
        this.next = null;
        this.previous = null;

        // Used by internal nodes.
        // Points to the child BTreeNode to the RIGHT of this separator.
        this.child = null;
    }
}