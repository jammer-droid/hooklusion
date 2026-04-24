import { describe, expect, it } from "vitest";

import type { CharacterEvent } from "../../../server/src/characterEvent.js";
import { createSessionKey } from "./sessionKey.js";
import { createSessionRegistry } from "./sessionRegistry.js";

const PROJECT_ROOT = "/Users/tester/dev/hooklusion";

describe("session registry", () => {
  it("registers project-scoped events by provider-qualified session key", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });
    const selection = registry.registerEvent(
      createEvent({ provider: "codex", sessionId: "same-id" }),
      100,
    );

    expect(selection).toEqual({
      mode: "auto",
      activeSessionKey: "codex:same-id",
      pinnedSessionKey: null,
      shouldDisplayEvent: true,
    });
    expect(registry.listSessions()).toMatchObject([
      {
        sessionKey: "codex:same-id",
        provider: "codex",
        sessionId: "same-id",
        state: "prompt_received",
        lastEventAt: 100,
      },
    ]);
  });

  it("ignores events outside the project scope", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });
    const selection = registry.registerEvent(
      createEvent({ cwd: "/tmp/other" }),
      100,
    );

    expect(selection).toEqual({
      mode: "auto",
      activeSessionKey: null,
      pinnedSessionKey: null,
      shouldDisplayEvent: false,
    });
    expect(registry.listSessions()).toEqual([]);
  });

  it("switches auto selection to a newer session when a session starts", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(
      createEvent({ provider: "claude", sessionId: "first" }),
      100,
    );
    const selection = registry.registerEvent(
      createEvent({
        provider: "codex",
        sessionId: "second",
        event: "SessionStart",
        state: "session_start",
      }),
      200,
    );

    expect(selection).toEqual({
      mode: "auto",
      activeSessionKey: "codex:second",
      pinnedSessionKey: null,
      shouldDisplayEvent: true,
    });
    expect(
      registry.listSessions().map((session) => session.sessionKey),
    ).toEqual(["codex:second", "claude:first"]);
  });

  it("keeps the current auto session for later non-start events from another session", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(
      createEvent({ provider: "claude", sessionId: "first" }),
      100,
    );
    const selection = registry.registerEvent(
      createEvent({
        provider: "codex",
        sessionId: "second",
        event: "PreToolUse",
        state: "tool_active",
      }),
      200,
    );

    expect(selection).toEqual({
      mode: "auto",
      activeSessionKey: "claude:first",
      pinnedSessionKey: null,
      shouldDisplayEvent: false,
    });
  });

  it("uses provider-qualified keys to keep matching raw session ids separate", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(
      createEvent({ provider: "claude", sessionId: "same-id" }),
      100,
    );
    registry.registerEvent(
      createEvent({ provider: "codex", sessionId: "same-id" }),
      200,
    );

    expect(
      registry.listSessions().map((session) => session.sessionKey),
    ).toEqual(["codex:same-id", "claude:same-id"]);
  });

  it("displays only the pinned session while pinned", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });
    const pinnedKey = createSessionKey("codex", "second");

    registry.registerEvent(
      createEvent({ provider: "claude", sessionId: "first" }),
      100,
    );
    registry.registerEvent(
      createEvent({ provider: "codex", sessionId: "second" }),
      200,
    );

    expect(registry.pinSession(pinnedKey)).toEqual({
      mode: "pinned",
      activeSessionKey: pinnedKey,
      pinnedSessionKey: pinnedKey,
      shouldDisplayEvent: true,
    });
    expect(
      registry.registerEvent(
        createEvent({ provider: "claude", sessionId: "first" }),
        300,
      ).shouldDisplayEvent,
    ).toBe(false);
    expect(
      registry.registerEvent(
        createEvent({ provider: "codex", sessionId: "second" }),
        400,
      ).shouldDisplayEvent,
    ).toBe(true);
  });

  it("lets manual session selection change the displayed session without pinning", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(
      createEvent({ provider: "claude", sessionId: "first" }),
      100,
    );
    registry.registerEvent(
      createEvent({ provider: "codex", sessionId: "second" }),
      200,
    );

    expect(registry.selectSession("codex:second")).toEqual({
      mode: "auto",
      activeSessionKey: "codex:second",
      pinnedSessionKey: null,
      shouldDisplayEvent: true,
    });
  });

  it("returns to auto policy when unpinned", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(
      createEvent({ provider: "claude", sessionId: "first" }),
      100,
    );
    registry.registerEvent(
      createEvent({ provider: "codex", sessionId: "second" }),
      200,
    );
    registry.pinSession("codex:second");

    expect(registry.unpinSession()).toEqual({
      mode: "auto",
      activeSessionKey: "claude:first",
      pinnedSessionKey: null,
      shouldDisplayEvent: true,
    });
  });

  it("accepts events from any managed project root", () => {
    const registry = createSessionRegistry({
      projectRoots: ["/tmp/project-a", "/tmp/project-b"],
    });

    const selection = registry.registerEvent(
      createEvent({ cwd: "/tmp/project-b/packages/app" }),
      100,
    );

    expect(selection.shouldDisplayEvent).toBe(true);
    expect(registry.listSessions()).toHaveLength(1);
  });

  it("drops sessions that no longer belong to the managed project list", () => {
    const registry = createSessionRegistry({
      projectRoots: ["/tmp/project-a", "/tmp/project-b"],
    });

    registry.registerEvent(
      createEvent({ cwd: "/tmp/project-a", sessionId: "a" }),
      100,
    );
    registry.registerEvent(
      createEvent({ cwd: "/tmp/project-b", sessionId: "b" }),
      200,
    );

    registry.setProjectRoots(["/tmp/project-a"]);

    expect(registry.listSessions().map((session) => session.sessionId)).toEqual(
      ["a"],
    );
  });

  it("captures the host pid from event metadata", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(createEvent({ pid: 4242 }), 100);

    expect(registry.listSessions()).toMatchObject([
      {
        sessionKey: "claude:session-1",
        pid: 4242,
      },
    ]);
  });

  it("prunes sessions whose tracked process is no longer alive", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(
      createEvent({ provider: "claude", sessionId: "alive", pid: 1111 }),
      100,
    );
    registry.registerEvent(
      createEvent({ provider: "codex", sessionId: "dead", pid: 2222 }),
      200,
    );
    registry.pinSession("codex:dead");

    expect(
      registry.pruneSessions({
        isProcessAlive(pid) {
          return pid === 1111;
        },
        staleAfterDeadPidMs: 30_000,
        staleWithoutPidAfterMs: 30_000,
        prunedAt: 30_500,
      }),
    ).toEqual({
      removedSessionKeys: ["codex:dead"],
      selection: {
        mode: "auto",
        activeSessionKey: "claude:alive",
        pinnedSessionKey: null,
        shouldDisplayEvent: false,
      },
    });
    expect(
      registry.listSessions().map((session) => session.sessionKey),
    ).toEqual(["claude:alive"]);
  });

  it("keeps recently exited pid-backed sessions in the menu during the grace window", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(
      createEvent({ provider: "codex", sessionId: "recent", pid: 2222 }),
      100,
    );

    expect(
      registry.pruneSessions({
        isProcessAlive() {
          return false;
        },
        staleAfterDeadPidMs: 30_000,
        staleWithoutPidAfterMs: 30_000,
        prunedAt: 500,
      }),
    ).toEqual({
      removedSessionKeys: [],
      selection: {
        mode: "auto",
        activeSessionKey: "codex:recent",
        pinnedSessionKey: null,
        shouldDisplayEvent: false,
      },
    });
    expect(
      registry.listSessions().map((session) => session.sessionKey),
    ).toEqual(["codex:recent"]);
  });

  it("keeps sessions without pid when inactivity TTL is disabled", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });

    registry.registerEvent(
      createEvent({ provider: "claude", sessionId: "stale" }),
      100,
    );
    registry.registerEvent(
      createEvent({ provider: "codex", sessionId: "fresh" }),
      200,
    );

    expect(
      registry.pruneSessions({
        isProcessAlive() {
          return true;
        },
        staleAfterDeadPidMs: 30_000,
        staleWithoutPidAfterMs: null,
        prunedAt: 320,
      }),
    ).toEqual({
      removedSessionKeys: [],
      selection: {
        mode: "auto",
        activeSessionKey: "claude:stale",
        pinnedSessionKey: null,
        shouldDisplayEvent: false,
      },
    });
    expect(
      registry.listSessions().map((session) => session.sessionKey),
    ).toEqual(["codex:fresh", "claude:stale"]);
  });
});

function createEvent({
  provider = "claude",
  sessionId = "session-1",
  cwd = PROJECT_ROOT,
  event = "UserPromptSubmit",
  state = "prompt_received",
  pid = null,
}: {
  provider?: CharacterEvent["provider"];
  sessionId?: string;
  cwd?: string;
  event?: CharacterEvent["event"];
  state?: CharacterEvent["canonicalStateHint"];
  pid?: number | null;
}): CharacterEvent {
  return {
    provider,
    sessionId,
    turnId: "turn-1",
    event,
    canonicalStateHint: state,
    providerState: null,
    raw: {
      hook_event_name: event,
      session_id: sessionId,
      turn_id: "turn-1",
      cwd,
      ...(pid === null ? {} : { project_c_pid: pid }),
    },
  };
}
