/**
 * EcoVolt Job Worker Queue
 * Asynchronous job dispatcher and worker pool for dynamic multi-user ML prediction and background tasks.
 */

export interface Job<T = any> {
  id: string;
  name: string;
  data: T;
  timestamp: number;
  attempts: number;
}

export type JobHandler<T = any> = (job: Job<T>) => Promise<void>;

export class JobQueue {
  private queue: Job[] = [];
  private handlers: Map<string, JobHandler> = new Map();
  private isProcessing = false;
  private concurrency: number;
  private activeWorkers = 0;

  constructor(concurrency = 4) {
    this.concurrency = concurrency;
  }

  /**
   * Register a handler for a job name
   */
  process<T = any>(jobName: string, handler: JobHandler<T>): void {
    this.handlers.set(jobName, handler as JobHandler);
  }

  /**
   * Add a job to the queue
   */
  async add<T = any>(jobName: string, data: T): Promise<Job<T>> {
    const job: Job<T> = {
      id: `${jobName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: jobName,
      data,
      timestamp: Date.now(),
      attempts: 0,
    };

    this.queue.push(job);
    this.triggerProcessing();
    return job;
  }

  /**
   * Add a batch of jobs
   */
  async addBulk<T = any>(jobName: string, dataItems: T[]): Promise<Job<T>[]> {
    const jobs = await Promise.all(dataItems.map((item) => this.add(jobName, item)));
    return jobs;
  }

  /**
   * Trigger the processing loop
   */
  private async triggerProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeWorkers < this.concurrency) {
      const job = this.queue.shift();
      if (!job) break;

      const handler = this.handlers.get(job.name);
      if (!handler) {
        console.warn(`[JobQueue] No handler registered for job: ${job.name}`);
        continue;
      }

      this.activeWorkers++;
      job.attempts++;

      // Process concurrently without blocking the main event loop
      handler(job)
        .catch((err) => {
          console.error(`[JobQueue] Job ${job.id} (${job.name}) failed:`, err);
        })
        .finally(() => {
          this.activeWorkers--;
          this.triggerProcessing();
        });
    }

    this.isProcessing = false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      pending: this.queue.length,
      activeWorkers: this.activeWorkers,
      concurrency: this.concurrency,
    };
  }
}

export const predictionQueue = new JobQueue(6);
