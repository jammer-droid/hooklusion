import { afterEach, describe, expect, it, vi } from "vitest";

import type { CharacterEvent } from "./characterEvent.js";
import { createCharacterStateMachine } from "./characterStateMachine.js";

describe("createCharacterStateMachine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle before a provider session is active", () => {
    const machine = createCharacterStateMachine();

    expect(machine.getSnapshot()).toMatchObject({
      sessionId: null,
      turnId: null,
      state: "idle",
      providerState: null,
    });
  });

  it("keeps session_start, prompt_received, and done active until a later event replaces them", () => {
    vi.useFakeTimers();

    const machine = createCharacterStateMachine();

    machine.dispatch(createEvent({ event: "SessionStart" }));
    expect(machine.getSnapshot()).toMatchObject({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      state: "session_start",
      providerState: null,
    });

    vi.advanceTimersByTime(800);
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: null,
      state: "session_start",
      providerState: null,
    });

    machine.dispatch(
      createEvent({
        event: "UserPromptSubmit",
        turnId: "turn-1",
      }),
    );
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-1",
      state: "prompt_received",
      providerState: null,
    });

    vi.advanceTimersByTime(800);
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-1",
      state: "prompt_received",
      providerState: null,
    });

    machine.dispatch(
      createEvent({
        event: "PreToolUse",
        turnId: "turn-1",
        toolName: "Read",
        providerState: "tool:read",
      }),
    );
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-1",
      state: "tool_active",
      providerState: "tool:read",
    });

    machine.dispatch(
      createEvent({
        event: "PostToolUse",
        turnId: "turn-1",
        toolName: "Read",
        providerState: "tool:read",
        ok: true,
      }),
    );
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-1",
      state: "thinking",
      providerState: "tool:read",
    });

    machine.dispatch(
      createEvent({
        event: "Stop",
        turnId: "turn-1",
        ok: true,
      }),
    );
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-1",
      state: "done",
      providerState: null,
    });

    vi.advanceTimersByTime(800);
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-1",
      state: "done",
      providerState: null,
    });

    machine.dispatch(
      createEvent({
        event: "UserPromptSubmit",
        turnId: "turn-2",
      }),
    );
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-2",
      state: "prompt_received",
      providerState: null,
    });
  });

  it("cancels a transient auto-return when a new event arrives for the same session", () => {
    vi.useFakeTimers();

    const machine = createCharacterStateMachine();

    machine.dispatch(createEvent({ event: "SessionStart" }));
    vi.advanceTimersByTime(400);

    machine.dispatch(
      createEvent({
        event: "PreToolUse",
        turnId: "turn-1",
        toolName: "Bash",
        providerState: "tool:test",
      }),
    );

    vi.advanceTimersByTime(400);
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-1",
      state: "tool_active",
      providerState: "tool:test",
    });
  });

  it("ignores stale events from an older turn after a newer turn becomes active", () => {
    vi.useFakeTimers();

    const machine = createCharacterStateMachine();

    machine.dispatch(
      createEvent({
        event: "PreToolUse",
        turnId: "turn-1",
        toolName: "Read",
        providerState: "tool:read",
      }),
    );

    machine.dispatch(
      createEvent({
        event: "UserPromptSubmit",
        turnId: "turn-2",
      }),
    );
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-2",
      state: "prompt_received",
    });

    machine.dispatch(
      createEvent({
        event: "PostToolUse",
        turnId: "turn-1",
        toolName: "Read",
        providerState: "tool:read",
        ok: true,
      }),
    );
    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-2",
      state: "prompt_received",
      providerState: null,
    });
  });

  it("shows the most recent session that emitted an accepted event", () => {
    vi.useFakeTimers();

    const machine = createCharacterStateMachine();

    machine.dispatch(
      createEvent({
        sessionId: "session-1",
        event: "PreToolUse",
        turnId: "turn-1",
        toolName: "Read",
        providerState: "tool:read",
      }),
    );

    machine.dispatch(
      createEvent({
        provider: "codex",
        sessionId: "session-2",
        event: "UserPromptSubmit",
        turnId: "turn-9",
      }),
    );

    expect(machine.getSnapshot()).toMatchObject({
      provider: "codex",
      sessionId: "session-2",
      turnId: "turn-9",
      state: "prompt_received",
    });
  });

  it("can read the last snapshot for a specific session without changing the active session", () => {
    const machine = createCharacterStateMachine();

    machine.dispatch(
      createEvent({
        sessionId: "session-1",
        event: "PreToolUse",
        turnId: "turn-1",
        toolName: "Read",
        providerState: "tool:read",
      }),
    );
    machine.dispatch(
      createEvent({
        provider: "codex",
        sessionId: "session-2",
        event: "UserPromptSubmit",
        turnId: "turn-9",
      }),
    );

    expect(machine.getSnapshot()).toMatchObject({
      sessionId: "session-2",
      state: "prompt_received",
    });
    expect(machine.getSnapshot("session-1")).toMatchObject({
      sessionId: "session-1",
      state: "tool_active",
      providerState: "tool:read",
    });
  });
});

function createEvent(
  overrides: Partial<CharacterEvent> & Pick<CharacterEvent, "event">,
): CharacterEvent {
  const provider = overrides.provider ?? "claude";
  const sessionId = overrides.sessionId ?? "session-1";
  const turnId = overrides.turnId ?? null;
  const raw = overrides.raw ?? {
    hook_event_name: overrides.event,
    session_id: sessionId,
    turn_id: turnId,
  };

  switch (overrides.event) {
    case "SessionStart":
      return {
        provider,
        sessionId,
        turnId,
        event: "SessionStart",
        canonicalStateHint: "session_start",
        providerState: null,
        raw,
      };
    case "UserPromptSubmit":
      return {
        provider,
        sessionId,
        turnId,
        event: "UserPromptSubmit",
        canonicalStateHint: "prompt_received",
        providerState: null,
        raw,
      };
    case "PreToolUse":
      return {
        provider,
        sessionId,
        turnId,
        event: "PreToolUse",
        canonicalStateHint: "tool_active",
        toolName: overrides.toolName ?? "Bash",
        providerState: overrides.providerState ?? null,
        raw,
      };
    case "PostToolUse":
      return {
        provider,
        sessionId,
        turnId,
        event: "PostToolUse",
        canonicalStateHint: "thinking",
        toolName: overrides.toolName ?? "Bash",
        providerState: overrides.providerState ?? null,
        ok: overrides.ok ?? true,
        raw,
      };
    case "Stop":
      return {
        provider,
        sessionId,
        turnId,
        event: "Stop",
        canonicalStateHint: "done",
        providerState: null,
        ok: overrides.ok ?? true,
        raw,
      };
  }
}
