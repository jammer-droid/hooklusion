import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";

import type { CharacterEvent } from "../../../server/src/characterEvent.js";
import { normalizeEvent } from "../../../server/src/normalize.js";

export interface LoggedEventRecord {
  receivedAt: string;
  provider: "claude" | "codex";
  payload: unknown;
}

export interface ParsedLoggedEventChunk {
  records: LoggedEventRecord[];
  remainder: string;
}

export interface CreateLiveEventTailerOptions {
  logFilePath: string;
  onRecord: (record: LoggedEventRecord) => void;
  pollIntervalMs?: number;
  skipExistingRecords?: boolean;
}

export function parseLoggedEventChunk(chunk: string): ParsedLoggedEventChunk {
  const lines = chunk.split("\n");
  const remainder = lines.pop() ?? "";
  const records: LoggedEventRecord[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    try {
      const parsed = JSON.parse(line) as LoggedEventRecord;
      records.push(parsed);
    } catch {
      console.warn("[hooklusion/app] dropping malformed live bridge log line");
    }
  }

  return {
    records,
    remainder,
  };
}

export function createLiveEventTailer({
  logFilePath,
  onRecord,
  pollIntervalMs = 500,
  skipExistingRecords = false,
}: CreateLiveEventTailerOptions) {
  let offsetBytes = skipExistingRecords ? readFileSize(logFilePath) : 0;
  let remainder = "";
  let timer: ReturnType<typeof setInterval> | null = null;

  async function pollOnce() {
    let fileContents: Buffer;

    try {
      fileContents = await readFile(logFilePath);
    } catch (error: unknown) {
      if (isMissingFileError(error)) {
        return;
      }

      throw error;
    }

    if (fileContents.byteLength < offsetBytes) {
      offsetBytes = 0;
      remainder = "";
    }

    const appendedContents = fileContents.subarray(offsetBytes);
    offsetBytes = fileContents.byteLength;

    if (appendedContents.byteLength === 0) {
      return;
    }

    const parsed = parseLoggedEventChunk(
      remainder + appendedContents.toString("utf8"),
    );
    remainder = parsed.remainder;

    for (const record of parsed.records) {
      onRecord(record);
    }
  }

  function start() {
    if (timer !== null) {
      return;
    }

    timer = setInterval(() => {
      void pollOnce().catch((error: unknown) => {
        console.error("[hooklusion/app] live bridge poll failed", error);
      });
    }, pollIntervalMs);
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    pollOnce,
    start,
    stop,
  };
}

export function dispatchLoggedEventRecord(
  record: LoggedEventRecord,
  dispatchEvent: (event: CharacterEvent) => void,
): boolean {
  const event = normalizeEvent({
    provider: record.provider,
    payload: record.payload,
  });

  if (event === null) {
    console.warn("[hooklusion/app] dropping unsupported live bridge record");
    return false;
  }

  dispatchEvent(event);
  return true;
}

function readFileSize(filePath: string) {
  try {
    return statSync(filePath).size;
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return 0;
    }

    throw error;
  }
}

function isMissingFileError(
  error: unknown,
): error is NodeJS.ErrnoException & { code: "ENOENT" } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
