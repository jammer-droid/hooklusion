import { appendFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createCharacterStateMachine } from "../../../server/src/characterStateMachine.js";
import {
  createLiveEventTailer,
  dispatchLoggedEventRecord,
  type LoggedEventRecord,
  parseLoggedEventChunk,
} from "./liveEventBridge.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseLoggedEventChunk", () => {
  it("parses complete JSONL records", () => {
    const firstRecord: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:00:00.000Z",
      provider: "claude",
      payload: {
        hook_event_name: "SessionStart",
        session_id: "session-1",
      },
    };
    const secondRecord: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:00:01.000Z",
      provider: "claude",
      payload: {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-1",
        turn_id: "turn-1",
      },
    };

    const result = parseLoggedEventChunk(
      `${JSON.stringify(firstRecord)}\n${JSON.stringify(secondRecord)}\n`,
    );

    expect(result).toEqual({
      records: [firstRecord, secondRecord],
      remainder: "",
    });
  });

  it("drops malformed JSON lines and keeps parsing later records", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const validRecord: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:00:02.000Z",
      provider: "claude",
      payload: {
        hook_event_name: "Stop",
        session_id: "session-1",
        turn_id: "turn-1",
      },
    };

    const result = parseLoggedEventChunk(
      `{"bad-json"\n${JSON.stringify(validRecord)}\n`,
    );

    expect(result).toEqual({
      records: [validRecord],
      remainder: "",
    });
    expect(warn).toHaveBeenCalledWith(
      "[hooklusion/app] dropping malformed live bridge log line",
    );
  });

  it("keeps an incomplete trailing line as remainder", () => {
    const completeRecord: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:00:03.000Z",
      provider: "claude",
      payload: {
        hook_event_name: "PreToolUse",
        session_id: "session-1",
        turn_id: "turn-2",
        tool_name: "Read",
      },
    };
    const trailingPartial =
      '{"receivedAt":"2026-04-21T00:00:04.000Z","provider":"claude"';

    const result = parseLoggedEventChunk(
      `${JSON.stringify(completeRecord)}\n${trailingPartial}`,
    );

    expect(result).toEqual({
      records: [completeRecord],
      remainder: trailingPartial,
    });
  });
});

describe("createLiveEventTailer", () => {
  it("reads only newly appended records", async () => {
    const tempDirectory = await mkdtemp(
      join(tmpdir(), "hooklusion-live-bridge-"),
    );
    const logFilePath = join(tempDirectory, "events.jsonl");
    const emitted: LoggedEventRecord[] = [];
    const firstRecord: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:01:00.000Z",
      provider: "claude",
      payload: {
        hook_event_name: "SessionStart",
        session_id: "session-1",
      },
    };
    const secondRecord: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:01:01.000Z",
      provider: "claude",
      payload: {
        hook_event_name: "Stop",
        session_id: "session-1",
        turn_id: "turn-1",
      },
    };

    await writeFile(logFilePath, `${JSON.stringify(firstRecord)}\n`, "utf8");

    const tailer = createLiveEventTailer({
      logFilePath,
      onRecord(record) {
        emitted.push(record);
      },
    });

    await tailer.pollOnce();
    expect(emitted).toEqual([firstRecord]);

    emitted.length = 0;
    await appendFile(logFilePath, `${JSON.stringify(secondRecord)}\n`, "utf8");

    await tailer.pollOnce();
    expect(emitted).toEqual([secondRecord]);
  });

  it("can ignore records that existed before the tailer was created", async () => {
    const tempDirectory = await mkdtemp(
      join(tmpdir(), "hooklusion-live-bridge-"),
    );
    const logFilePath = join(tempDirectory, "events.jsonl");
    const emitted: LoggedEventRecord[] = [];
    const existingRecord: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:01:02.000Z",
      provider: "codex",
      payload: {
        hook_event_name: "SessionStart",
        session_id: "session-existing",
      },
    };
    const appendedRecord: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:01:03.000Z",
      provider: "codex",
      payload: {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-new",
        turn_id: "turn-1",
      },
    };

    await writeFile(logFilePath, `${JSON.stringify(existingRecord)}\n`, "utf8");

    const tailer = createLiveEventTailer({
      logFilePath,
      skipExistingRecords: true,
      onRecord(record) {
        emitted.push(record);
      },
    });

    await tailer.pollOnce();
    expect(emitted).toEqual([]);

    await appendFile(
      logFilePath,
      `${JSON.stringify(appendedRecord)}\n`,
      "utf8",
    );

    await tailer.pollOnce();
    expect(emitted).toEqual([appendedRecord]);
  });

  it("tolerates a missing log file and resumes after it appears", async () => {
    const tempDirectory = await mkdtemp(
      join(tmpdir(), "hooklusion-live-bridge-"),
    );
    const logFilePath = join(tempDirectory, "events.jsonl");
    const emitted: LoggedEventRecord[] = [];
    const record: LoggedEventRecord = {
      receivedAt: "2026-04-21T00:01:02.000Z",
      provider: "claude",
      payload: {
        hook_event_name: "UserPromptSubmit",
        session_id: "session-2",
        turn_id: "turn-7",
      },
    };

    const tailer = createLiveEventTailer({
      logFilePath,
      onRecord(nextRecord) {
        emitted.push(nextRecord);
      },
    });

    await expect(tailer.pollOnce()).resolves.toBeUndefined();
    expect(emitted).toEqual([]);

    await writeFile(logFilePath, `${JSON.stringify(record)}\n`, "utf8");

    await tailer.pollOnce();
    expect(emitted).toEqual([record]);
  });
});

describe("dispatchLoggedEventRecord", () => {
  it("normalizes a logged hook record and dispatches it to the state machine", () => {
    const machine = createCharacterStateMachine();

    const didDispatch = dispatchLoggedEventRecord(
      {
        receivedAt: "2026-04-21T00:01:03.000Z",
        provider: "claude",
        payload: {
          hook_event_name: "UserPromptSubmit",
          session_id: "session-9",
          turn_id: "turn-3",
        },
      },
      (event) => {
        machine.dispatch(event);
      },
    );

    expect(didDispatch).toBe(true);
    expect(machine.getSnapshot()).toMatchObject({
      provider: "claude",
      sessionId: "session-9",
      turnId: "turn-3",
      state: "prompt_received",
      providerState: null,
    });

    machine.dispose();
  });

  it("returns false for unsupported records", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      dispatchLoggedEventRecord(
        {
          receivedAt: "2026-04-21T00:01:04.000Z",
          provider: "claude",
          payload: {
            hook_event_name: "UnsupportedEvent",
            session_id: "session-9",
          },
        },
        () => {
          throw new Error("dispatch should not be called");
        },
      ),
    ).toBe(false);

    expect(warn).toHaveBeenCalled();
  });
});
