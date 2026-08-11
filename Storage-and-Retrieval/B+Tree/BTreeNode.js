export default class BTreeNode {
    constructor(isLeaf = true) {
        this.isLeaf = isLeaf;

        this.nodes = [];
        this.size = 0;

        this.parent = null;

        // Used by internal nodes.
        // Points to the leftmost child.
        this.leftChild = null;

        // Used only by leaf nodes.
        this.next = null;
        this.previous = null;
    }

    addNode(node) {
        this.nodes.push(node);
        this.size = this.nodes.length;
    }

    insertNode(index, node) {
        this.nodes.splice(index, 0, node);
        this.size = this.nodes.length;
    }

    removeNode(index) {
        const [node] = this.nodes.splice(index, 1);
        this.size = this.nodes.length;
        return node;
    }
}