const TOMBSTONE = Symbol("TOMBSTONE");

class AVLNode {
    constructor(key, value) {
        this.key = key;
        this.value = value;

        this.left = null;
        this.right = null;

        this.height = 1;
    }
}

export default class MemTable {
    constructor(maxEntries = 1000) {
        this.root = null;
        this.count = 0;
        this.maxEntries = maxEntries;
    }

    height(node) {
        return node ? node.height : 0;
    }

    updateHeight(node) {
        node.height =
            1 +
            Math.max(
                this.height(node.left),
                this.height(node.right)
            );
    }

    balanceFactor(node) {
        return node
            ? this.height(node.left) -
              this.height(node.right)
            : 0;
    }

    rotateRight(y) {
        const x = y.left;
        const subtree = x.right;

        x.right = y;
        y.left = subtree;

        this.updateHeight(y);
        this.updateHeight(x);

        return x;
    }

    rotateLeft(x) {
        const y = x.right;
        const subtree = y.left;

        y.left = x;
        x.right = subtree;

        this.updateHeight(x);
        this.updateHeight(y);

        return y;
    }

    insert(node, key, value) {
        if (!node) {
            this.count++;
            return new AVLNode(key, value);
        }

        if (key < node.key) {
            node.left = this.insert(
                node.left,
                key,
                value
            );
        } else if (key > node.key) {
            node.right = this.insert(
                node.right,
                key,
                value
            );
        } else {
            node.value = value;
            return node;
        }

        this.updateHeight(node);

        const balance = this.balanceFactor(node);

        // Left Left
        if (
            balance > 1 &&
            key < node.left.key
        ) {
            return this.rotateRight(node);
        }

        // Right Right
        if (
            balance < -1 &&
            key > node.right.key
        ) {
            return this.rotateLeft(node);
        }

        // Left Right
        if (
            balance > 1 &&
            key > node.left.key
        ) {
            node.left =
                this.rotateLeft(node.left);

            return this.rotateRight(node);
        }

        // Right Left
        if (
            balance < -1 &&
            key < node.right.key
        ) {
            node.right =
                this.rotateRight(node.right);

            return this.rotateLeft(node);
        }

        return node;
    }

    put(key, value) {
        this.root = this.insert(
            this.root,
            key,
            value
        );
    }

    getNode(node, key) {
        if (!node) {
            return null;
        }

        if (key === node.key) {
            return node;
        }

        if (key < node.key) {
            return this.getNode(node.left, key);
        }

        return this.getNode(node.right, key);
    }

    get(key) {
        const node = this.getNode(
            this.root,
            key
        );

        if (!node) {
            return undefined;
        }

        return node.value;
    }

    delete(key) {
        this.put(key, TOMBSTONE);
    }

    has(key) {
        return this.getNode(
            this.root,
            key
        ) !== null;
    }

    isDeleted(key) {
        const node = this.getNode(
            this.root,
            key
        );

        return (
            node !== null &&
            node.value === TOMBSTONE
        );
    }

    size() {
        return this.count;
    }

    isEmpty() {
        return this.count === 0;
    }

    isFull() {
        return this.count >= this.maxEntries;
    }

    *inOrder(node) {
        if (!node) {
            return;
        }

        yield* this.inOrder(node.left);

        yield {
            key: node.key,
            value: node.value,
            deleted: node.value === TOMBSTONE
        };

        yield* this.inOrder(node.right);
    }

    *entries() {
        yield* this.inOrder(this.root);
    }

    toArray() {
        return [...this.entries()];
    }

    clear() {
        this.root = null;
        this.count = 0;
    }
}

export { TOMBSTONE };