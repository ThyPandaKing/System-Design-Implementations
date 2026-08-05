import Queue from "./Queue.js";

export default class Graph {
    constructor(name) {
        this._name = name;

        // nodeId -> [neighborNodeIds]
        this.adjList = {};
    }

    addNode(node) {
        if (!(node.id in this.adjList)) {
            this.adjList[node.id] = [];
        }
    }

    removeNode(node) {
        const nodeId = node.id;

        if (!(nodeId in this.adjList)) return;

        // Remove incoming edges
        for (const source in this.adjList) {
            this.adjList[source] = this.adjList[source].filter(
                id => id !== nodeId
            );
        }

        // Remove node
        delete this.adjList[nodeId];
    }

    addEdge(fromNode, toNode) {
        const fromId = fromNode.id;
        const toId = toNode.id;

        this.addNode(fromNode);
        this.addNode(toNode);

        if (!this.adjList[fromId].includes(toId)) {
            this.adjList[fromId].push(toId);
        }
    }

    removeEdge(fromNode, toNode) {
        const fromId = fromNode.id;
        const toId = toNode.id;

        if (!(fromId in this.adjList)) return;

        this.adjList[fromId] = this.adjList[fromId].filter(
            id => id !== toId
        );
    }

    provideNodes(node) {
        const nodeId = node.id;

        if (!(nodeId in this.adjList)) {
            return [];
        }

        return this.adjList[nodeId];
    }

    bfs(startNode, maxDepthAllowed = Infinity) {
        const startId = startNode.id;

        if (!(startId in this.adjList)) {
            return [];
        }

        const queue = new Queue();
        const visited = new Set();
        const result = [];

        queue.enqueue({
            currNode: startId,
            currDepth: 0,
        });

        visited.add(startId);

        while (!queue.isEmpty()) {
            const { currNode, currDepth } = queue.dequeue();

            result.push(currNode);

            if (currDepth === maxDepthAllowed) {
                continue;
            }

            for (const nextNode of this.adjList[currNode]) {
                if (!visited.has(nextNode)) {
                    visited.add(nextNode);

                    queue.enqueue({
                        currNode: nextNode,
                        currDepth: currDepth + 1,
                    });
                }
            }
        }

        return result;
    }
}