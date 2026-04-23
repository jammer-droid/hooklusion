import { describe, expect, it, vi } from "vitest";

import type { CharacterEvent } from "../../../server/src/characterEvent.js";
import { createSetupSmokeTestMonitor } from "./setupSmokeTest.js";

describe("createSetupSmokeTestMonitor", () => {
  it("records success when the next matching project event arrives", async () => {
    const recorded: Array<{
      projectRoot: string;
      status: "ok" | "failed";
      at: string;
    }> = [];
    const monitor = createSetupSmokeTestMonitor({
      timeoutMs: 1_000,
      now: () => "2026-04-22T12:30:00.000Z",
      isProjectEvent(event, projectRoot) {
        return event.raw?.cwd === projectRoot;
      },
      onResult(projectRoot, status, at) {
        recorded.push({ projectRoot, status, at });
      },
    });

    const run = monitor.start("/tmp/project-a");
    monitor.observeEvent(createEvent("/tmp/project-a"));

    await expect(run.completed).resolves.toEqual({
      projectRoot: "/tmp/project-a",
      status: "ok",
      completedAt: "2026-04-22T12:30:00.000Z",
    });
    expect(recorded).toEqual([
      {
        projectRoot: "/tmp/project-a",
        status: "ok",
        at: "2026-04-22T12:30:00.000Z",
      },
    ]);
  });

  it("records failure on timeout and ignores unrelated project events", async () => {
    vi.useFakeTimers();
    const recorded: Array<{
      projectRoot: string;
      status: "ok" | "failed";
      at: string;
    }> = [];
    const monitor = createSetupSmokeTestMonitor({
      timeoutMs: 1_000,
      now: () => "2026-04-22T12:31:00.000Z",
      isProjectEvent(event, projectRoot) {
        return event.raw?.cwd === projectRoot;
      },
      onResult(projectRoot, status, at) {
        recorded.push({ projectRoot, status, at });
      },
    });

    const run = monitor.start("/tmp/project-a");
    monitor.observeEvent(createEvent("/tmp/other-project"));
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(run.completed).resolves.toEqual({
      projectRoot: "/tmp/project-a",
      status: "failed",
      completedAt: "2026-04-22T12:31:00.000Z",
    });
    expect(recorded).toEqual([
      {
        projectRoot: "/tmp/project-a",
        status: "failed",
        at: "2026-04-22T12:31:00.000Z",
      },
    ]);

    vi.useRealTimers();
  });
});

function createEvent(cwd: string): CharacterEvent {
  return {
    provider: "claude",
    sessionId: "session-1",
    turnId: "turn-1",
    event: "UserPromptSubmit",
    canonicalStateHint: "prompt_received",
    providerState: null,
    raw: {
      cwd,
      hook_event_name: "UserPromptSubmit",
      session_id: "session-1",
    },
  };
}
