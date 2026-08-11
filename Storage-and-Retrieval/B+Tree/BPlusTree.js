import BNode from "./BNode.js";
import BTreeNode from "./BTreeNode.js";

export default class BPlusTree {
    constructor(maxKeys) {

        this.maxKeys = maxKeys;

        // Initially the tree consists of a single leaf.
        this.root = new BTreeNode(true);
    }

    /**
     * Insert a key/value pair.
     *
     * Duplicate keys are ignored.
     */
    insert(key, data) {

        const leaf = this.findLeaf(key);

        // Ignore duplicate keys.
        const existingIndex = this.findKeyIndex(leaf, key);

        if (existingIndex !== -1) {
            return false;
        }

        const node = new BNode(key, data);

        // Insert in sorted position.
        const insertIndex = this.findInsertPosition(leaf, key);

        leaf.insertNode(insertIndex, node);

        // Update leaf linked list pointers are not affected
        // because those are between BTreeNodes, not BNodes.

        // No overflow.
        if (leaf.size <= this.maxKeys) {
            return true;
        }

        this.splitLeaf(leaf);

        return true;
    }

    /**
     * Find the leaf BTreeNode where a key belongs.
     */
    findLeaf(key) {
        let current = this.root;

        while (!current.isLeaf) {
            let childIndex = 0;

            while (
                childIndex < current.nodes.length &&
                key > current.nodes[childIndex].key
            ) {
                childIndex++;
            }

            if (childIndex === 0) {
                current = current.nodes[0].child;
            } else {
                current = current.nodes[childIndex - 1].child;
            }
        }

        return current;
    }

    /**
     * Return index of key in a BTreeNode.
     *
     * Returns -1 if not found.
     */
    findKeyIndex(treeNode, key) {
        let low = 0;
        let high = treeNode.nodes.length - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const currentKey = treeNode.nodes[mid].key;

            if (currentKey === key) {
                return mid;
            }

            if (currentKey < key) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return -1;
    }

    /**
     * Find where a key should be inserted.
     */
    findInsertPosition(treeNode, key) {
        let low = 0;
        let high = treeNode.nodes.length;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);

            if (treeNode.nodes[mid].key < key) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return low;
    }


    splitLeaf(leaf) {
        const totalSize = leaf.size;

        const leftSize = Math.ceil((totalSize + 1) / 2);
        const rightSize = Math.floor((totalSize - 1) / 2);

        const left = new BTreeNode(true);
        const right = new BTreeNode(true);

        left.nodes = leaf.nodes.slice(0, leftSize);
        right.nodes = leaf.nodes.slice(leftSize);

        left.size = left.nodes.length;
        right.size = right.nodes.length;


        left.previous = leaf.previous;
        left.next = right;

        right.previous = left;
        right.next = leaf.next;

        if (left.previous) {
            left.previous.next = left;
        }

        if (right.next) {
            right.next.previous = right;
        }

        // The key promoted to the parent is the max key of left.
        const promotedKey = left.nodes[left.nodes.length - 1].key;

        if (leaf === this.root) {
            this.createNewRoot(
                promotedKey,
                left,
                right
            );
        } else {
            const parent = leaf.parent;

            left.parent = parent;
            right.parent = parent;

            this.insertIntoParent(
                parent,
                promotedKey,
                left,
                right,
                leaf
            );
        }
    }

    /**
     * Create a new root after splitting the old root.
     */
    createNewRoot(promotedKey, left, right) {
        const newRoot = new BTreeNode(false);

        const separator = new BNode(promotedKey);

        newRoot.leftChild = left;

        separator.child = right;

        newRoot.nodes.push(separator);
        newRoot.size = 1;

        left.parent = newRoot;
        right.parent = newRoot;

        this.root = newRoot;
    }


    insertIntoParent(parent, promotedKey, left, right, oldChild) {

        const childIndex = this.getChildIndex(parent, oldChild);

        const separator = new BNode(promotedKey);


        if (childIndex === 0) {

            separator.child = right;

            parent.nodes.splice(0, 0, separator);
            parent.size++;

            parent.leftChild = left;
        } else {

            separator.child = right;

            parent.nodes.splice(childIndex, 0, separator);
            parent.size++;
        }

        left.parent = parent;
        right.parent = parent;

        /*
         * Parent has overflowed.
         */
        if (parent.size > this.maxKeys) {
            this.splitInternal(parent);
        }
    }

    getChildIndex(parent, child) {
        if (parent.leftChild === child) {
            return 0;
        }

        for (let i = 0; i < parent.nodes.length; i++) {
            if (parent.nodes[i].child === child) {
                return i + 1;
            }
        }

        throw new Error("Child not found in parent");
    }

    splitInternal(node) {
        const totalSize = node.size;

        const leftSize = Math.ceil((totalSize + 1) / 2);
        const rightSize = Math.floor((totalSize - 1) / 2);


        const allChildren = this.getChildren(node);

        const leftKeys = node.nodes.slice(0, leftSize);
        const rightKeys = node.nodes.slice(leftSize);


        const promotedKey =
            leftKeys[leftKeys.length - 1].key;


        const actualLeftKeys =
            leftKeys.slice(0, leftKeys.length - 1);

        const left = new BTreeNode(false);
        const right = new BTreeNode(false);

        left.nodes = actualLeftKeys;
        right.nodes = rightKeys;

        left.size = left.nodes.length;
        right.size = right.nodes.length;

        const leftChildren =
            allChildren.slice(0, actualLeftKeys.length + 1);

        const rightChildren =
            allChildren.slice(actualLeftKeys.length + 1);

        this.assignChildren(left, leftChildren);
        this.assignChildren(right, rightChildren);

        left.parent = node.parent;
        right.parent = node.parent;

        /*
         * Root split.
         */
        if (node === this.root) {
            this.createNewInternalRoot(
                promotedKey,
                left,
                right
            );

            return;
        }

        const parent = node.parent;

        this.insertIntoParent(
            parent,
            promotedKey,
            left,
            right,
            node
        );
    }

    /**
     * Get every child of an internal node in order.
     */
    getChildren(node) {
        const children = [];

        children.push(node.leftChild);

        for (const entry of node.nodes) {
            children.push(entry.child);
        }

        return children;
    }

    /**
     * Assign children to an internal node.
     */
    assignChildren(node, children) {
        if (children.length === 0) {
            throw new Error("Internal node must have children");
        }

        node.leftChild = children[0];

        for (let i = 0; i < children.length; i++) {
            children[i].parent = node;
        }
    }

    /**
     * Create a new root after splitting an internal node.
     */
    createNewInternalRoot(promotedKey, left, right) {
        const root = new BTreeNode(false);

        const separator = new BNode(promotedKey);

        root.leftChild = left;
        separator.child = right;

        root.nodes.push(separator);
        root.size = 1;

        left.parent = root;
        right.parent = root;

        this.root = root;
    }

    search(key) {
        if (!Number.isInteger(key)) {
            throw new TypeError("Only integer keys are supported");
        }

        const leaf = this.findLeaf(key);
        const index = this.findKeyIndex(leaf, key);

        if (index === -1) {
            return null;
        }

        return leaf.nodes[index].data;
    }

    /**
     * Return all key/value pairs in sorted order.
     */
    scan() {
        let leaf = this.getFirstLeaf();

        const result = [];

        while (leaf) {
            for (const node of leaf.nodes) {
                result.push({
                    key: node.key,
                    data: node.data
                });
            }

            leaf = leaf.next;
        }

        return result;
    }

    /**
     * Get the left-most leaf.
     */
    getFirstLeaf() {
        let current = this.root;

        while (!current.isLeaf) {
            current = current.leftChild;
        }

        return current;
    }

    /**
     * Debug representation of the tree.
     */
    print() {
        const levels = [];
        let currentLevel = [this.root];

        while (currentLevel.length > 0) {
            const nextLevel = [];
            const levelOutput = [];

            for (const node of currentLevel) {
                levelOutput.push(
                    node.nodes.map(n => n.key)
                );

                if (!node.isLeaf) {
                    nextLevel.push(node.leftChild);

                    for (const entry of node.nodes) {
                        nextLevel.push(entry.child);
                    }
                }
            }

            levels.push(levelOutput);
            currentLevel = nextLevel;
        }

        console.log(
            levels
                .map(
                    (level, index) =>
                        `Level ${index}: ${JSON.stringify(level)}`
                )
                .join("\n")
        );
    }
}