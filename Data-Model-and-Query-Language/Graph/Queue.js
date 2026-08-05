export default class Queue {
  constructor() {
    this.items = [];
  }

  // Add to the back
  enqueue(element) {
    this.items.push(element);
  }

  // Remove from the front
  dequeue() {
    if (this.isEmpty()) return "Underflow";
    return this.items.shift();
  }

  // View front item
  peek() {
    return this.isEmpty() ? null : this.items[0];
  }

  // Check if empty
  isEmpty() {
    return this.items.length === 0;
  }
}