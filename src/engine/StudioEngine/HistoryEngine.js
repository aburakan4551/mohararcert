/**
 * ⏳ HistoryEngine.js
 * Decoupled state undo/redo manager with an immutable stack.
 */
class HistoryEngine {
    constructor(maxSize = 50) {
        this.stack = [];
        this.currentIndex = -1;
        this.maxSize = maxSize;
    }

    initialize(initialState) {
        this.stack = [JSON.parse(JSON.stringify(initialState))];
        this.currentIndex = 0;
    }

    push(state) {
        const newHistory = this.stack.slice(0, this.currentIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state)));
        
        if (newHistory.length > this.maxSize) {
            newHistory.shift();
        }
        
        this.stack = newHistory;
        this.currentIndex = this.stack.length - 1;
    }

    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex -= 1;
            return JSON.parse(JSON.stringify(this.stack[this.currentIndex]));
        }
        return null;
    }

    redo() {
        if (this.currentIndex < this.stack.length - 1) {
            this.currentIndex += 1;
            return JSON.parse(JSON.stringify(this.stack[this.currentIndex]));
        }
        return null;
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.stack.length - 1;
    }

    getCurrentState() {
        if (this.currentIndex >= 0 && this.currentIndex < this.stack.length) {
            return this.stack[this.currentIndex];
        }
        return null;
    }
}

export default HistoryEngine;
