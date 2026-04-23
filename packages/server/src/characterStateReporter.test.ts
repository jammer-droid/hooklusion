import { afterEach, describe, expect, it, vi } from "vitest";

import type { CharacterEvent } from "./characterEvent.js";
import { createCharacterStateMachine } from "./characterStateMachine.js";
import {
  formatCharacterSnapshot,
  reportCharacterSnapshot,
} from "./characterStateReporter.js";

describe("character state reporting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("formats snapshots with provider state only when present", () => {
    expect(
      formatCharacterSnapshot({
        provider: "claude",
        sessionId: "session-1",
        turnId: "turn-1",
        state: "tool_active",
        providerState: "tool:read",
      }),
    ).toBe(
      "[hooklusion/server] character session=session-1 turn=turn-1 state=tool_active providerState=tool:read",
    );

    expect(
      formatCharacterSnapshot({
        provider: "claude",
        sessionId: "session-1",
        turnId: null,
        state: "thinking",
        providerState: null,
      }),
    ).toBe(
      "[hooklusion/server] character session=session-1 turn=null state=thinking",
    );
  });

  it("logs the expected transition order for a recorded event sequence", () => {
    vi.useFakeTimers();

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const machine = createCharacterStateMachine({
      onTransition(snapshot) {
        reportCharacterSnapshot(snapshot);
      },
    });

    machine.dispatch(createEvent({ event: "SessionStart" }));
    vi.advanceTimersByTime(800);

    machine.dispatch(
      createEvent({
        event: "UserPromptSubmit",
        turnId: "turn-1",
      }),
    );
    vi.advanceTimersByTime(800);

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
        event: "PostToolUse",
        turnId: "turn-1",
        toolName: "Read",
        providerState: "tool:read",
        ok: true,
      }),
    );
    machine.dispatch(
      createEvent({
        event: "Stop",
        turnId: "turn-1",
        ok: true,
      }),
    );
    vi.advanceTimersByTime(800);

    expect(log.mock.calls.map(([line]) => line)).toEqual([
      "[hooklusion/server] character session=session-1 turn=null state=session_start",
      "[hooklusion/server] character session=session-1 turn=null state=idle",
      "[hooklusion/server] character session=session-1 turn=turn-1 state=prompt_received",
      "[hooklusion/server] character session=session-1 turn=turn-1 state=idle",
      "[hooklusion/server] character session=session-1 turn=turn-1 state=tool_active providerState=tool:read",
      "[hooklusion/server] character session=session-1 turn=turn-1 state=thinking providerState=tool:read",
      "[hooklusion/server] character session=session-1 turn=turn-1 state=done",
      "[hooklusion/server] character session=session-1 turn=turn-1 state=idle",
    ]);

    machine.dispose();
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
