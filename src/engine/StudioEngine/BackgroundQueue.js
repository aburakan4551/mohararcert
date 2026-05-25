import { diagnosticsStore } from '../../utils/diagnosticsStore';

class BackgroundQueue {
    constructor() {
        this.tasks = [];
        this.activeCount = 0;
        this.concurrency = 2; // Process 2 PDFs at once
        this.subscribers = new Set();
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notify() {
        this.subscribers.forEach(cb => cb([...this.tasks]));
        // Telemetry update
        const stalled = this.tasks.filter(t => t.status === 'failed').length;
        diagnosticsStore.updateQueueState(this.activeCount, stalled);
    }

    enqueue(taskId, label, executeFn) {
        const existing = this.tasks.find(t => t.id === taskId);
        if (existing) return;

        const task = {
            id: taskId,
            label,
            status: 'pending', // 'pending', 'running', 'completed', 'failed', 'cancelled'
            progress: 0,
            error: null,
            executeFn,
            retryCount: 0
        };

        this.tasks.push(task);
        this.notify();
        this.processNext();
    }

    cancel(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && (task.status === 'pending' || task.status === 'running')) {
            task.status = 'cancelled';
            task.progress = 0;
            if (task.status === 'running') {
                this.activeCount = Math.max(0, this.activeCount - 1);
            }
            this.notify();
            this.processNext();
        }
    }

    retry(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && (task.status === 'failed' || task.status === 'cancelled')) {
            task.status = 'pending';
            task.progress = 0;
            task.error = null;
            task.retryCount += 1;
            diagnosticsStore.logQueueRetry(taskId, task.retryCount);
            this.notify();
            this.processNext();
        }
    }

    updateProgress(taskId, progress) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.status === 'running') {
            task.progress = progress;
            this.notify();
        }
    }

    async processNext() {
        if (this.activeCount >= this.concurrency) return;

        const next = this.tasks.find(t => t.status === 'pending');
        if (!next) return;

        next.status = 'running';
        next.progress = 5;
        this.activeCount += 1;
        this.notify();

        try {
            // Run the task callback passing progress hooks
            await next.executeFn(
                (p) => this.updateProgress(next.id, p)
            );
            
            next.status = 'completed';
            next.progress = 100;
        } catch (e) {
            console.error(`Task ${next.id} failed: `, e);
            next.status = 'failed';
            next.error = e.message;
        } finally {
            this.activeCount = Math.max(0, this.activeCount - 1);
            this.notify();
            this.processNext();
        }
    }

    getTasks() {
        return [...this.tasks];
    }
}

export const backgroundQueue = new BackgroundQueue();
export default BackgroundQueue;
