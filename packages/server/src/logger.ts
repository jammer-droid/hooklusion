import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface EventLogger {
  enqueue(payload: unknown, options?: EnqueueEventOptions): void;
}

export type EventProvider = "claude" | "codex";

interface EnqueueEventOptions {
  provider?: EventProvider;
}

interface CreateEventLoggerOptions {
  logDirectory: string;
  maxQueueSize?: number;
}

interface EventRecord {
  receivedAt: string;
  provider: EventProvider;
  payload: unknown;
}

export function createEventLogger({
  logDirectory,
  maxQueueSize = 1000,
}: CreateEventLoggerOptions): EventLogger {
  const queue: EventRecord[] = [];
  let drainScheduled = false;

  async function drainQueue() {
    drainScheduled = false;

    if (queue.length === 0) {
      return;
    }

    const records = queue.splice(0, queue.length);

    await mkdir(logDirectory, { recursive: true });

    const filePath = join(logDirectory, "events.jsonl");
    const contents = records
      .map((record) => `${JSON.stringify(record)}\n`)
      .join("");

    await appendFile(filePath, contents, "utf8");

    if (queue.length > 0) {
      scheduleDrain();
    }
  }

  function scheduleDrain() {
    if (drainScheduled) {
      return;
    }

    drainScheduled = true;

    queueMicrotask(() => {
      void drainQueue().catch((error: unknown) => {
        drainScheduled = false;
        console.error("[hooklusion/server] failed to write event log", error);
      });
    });
  }

  return {
    enqueue(payload, options = {}) {
      if (queue.length >= maxQueueSize) {
        console.warn(
          "[hooklusion/server] event queue overflow, dropping hook payload",
        );
        return;
      }

      queue.push({
        receivedAt: new Date().toISOString(),
        provider: options.provider ?? "claude",
        payload,
      });

      scheduleDrain();
    },
  };
}
