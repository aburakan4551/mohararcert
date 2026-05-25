/**
 * 📊 diagnosticsStore.js — Memory-Safe Bounded Diagnostics & Observability Registry
 * High-performance, singleton telemetry store for operational platforms.
 * Uses non-blocking asynchronous logging to prevent thread obstruction.
 */

const MAX_ENTRIES = 50; // Strict retention limit to prevent memory accumulation

class DiagnosticsStore {
    constructor() {
        this.metrics = {
            exportFailures: [],
            renderTimings: [],
            autosaveMetrics: [],
            queueMetrics: {
                activeJobs: 0,
                stalledJobs: 0,
                longestExportMs: 0,
                totalRetries: 0
            },
            queueRetries: [],
            snapshotTimings: []
        };
        this.subscribers = new Set();
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        // Call immediately to sync
        callback({ ...this.metrics });
        return () => this.subscribers.delete(callback);
    }

    notify() {
        // Broadcast updates safely
        const snapshot = JSON.parse(JSON.stringify(this.metrics));
        this.subscribers.forEach(cb => {
            try {
                cb(snapshot);
            } catch (err) {
                console.error("Telemetry subscriber notification failed: ", err);
            }
        });
    }

    /**
     * Helper to run telemetry logging asynchronously (non-blocking)
     */
    runAsync(fn) {
        if (typeof window !== 'undefined') {
            if (window.requestIdleCallback) {
                window.requestIdleCallback(() => fn());
            } else {
                setTimeout(fn, 10);
            }
        } else {
            fn();
        }
    }

    logExportFailure(taskId, error, failedAssets = []) {
        this.runAsync(() => {
            const entry = {
                taskId,
                error: error?.message || String(error),
                failedAssets,
                timestamp: new Date().toLocaleTimeString()
            };
            this.metrics.exportFailures.unshift(entry);
            if (this.metrics.exportFailures.length > MAX_ENTRIES) {
                this.metrics.exportFailures.pop();
            }
            this.notify();
        });
    }

    logRenderTiming(label, durationMs, memorySpikeMb = 0) {
        this.runAsync(() => {
            const entry = {
                label,
                durationMs,
                memorySpikeMb,
                timestamp: new Date().toLocaleTimeString()
            };
            this.metrics.renderTimings.unshift(entry);
            if (this.metrics.renderTimings.length > MAX_ENTRIES) {
                this.metrics.renderTimings.pop();
            }

            // Update longest export
            if (durationMs > this.metrics.queueMetrics.longestExportMs) {
                this.metrics.queueMetrics.longestExportMs = durationMs;
            }
            this.notify();
        });
    }

    logAutosave(durationMs, status = 'success', debounceSavedCount = 1, collisionDetected = false) {
        this.runAsync(() => {
            const entry = {
                durationMs,
                status,
                debounceSavedCount,
                collisionDetected,
                timestamp: new Date().toLocaleTimeString()
            };
            this.metrics.autosaveMetrics.unshift(entry);
            if (this.metrics.autosaveMetrics.length > MAX_ENTRIES) {
                this.metrics.autosaveMetrics.pop();
            }
            this.notify();
        });
    }

    logQueueRetry(taskId, retryCount) {
        this.runAsync(() => {
            const entry = {
                taskId,
                retryCount,
                timestamp: new Date().toLocaleTimeString()
            };
            this.metrics.queueRetries.unshift(entry);
            if (this.metrics.queueRetries.length > MAX_ENTRIES) {
                this.metrics.queueRetries.pop();
            }

            this.metrics.queueMetrics.totalRetries += 1;
            this.notify();
        });
    }

    logSnapshotTiming(certId, durationMs) {
        this.runAsync(() => {
            const entry = {
                certId,
                durationMs,
                timestamp: new Date().toLocaleTimeString()
            };
            this.metrics.snapshotTimings.unshift(entry);
            if (this.metrics.snapshotTimings.length > MAX_ENTRIES) {
                this.metrics.snapshotTimings.pop();
            }
            this.notify();
        });
    }

    updateQueueState(active, stalled) {
        this.runAsync(() => {
            this.metrics.queueMetrics.activeJobs = active;
            this.metrics.queueMetrics.stalledJobs = stalled;
            this.notify();
        });
    }

    getMetrics() {
        return JSON.parse(JSON.stringify(this.metrics));
    }
}

export const diagnosticsStore = new DiagnosticsStore();
export default diagnosticsStore;
