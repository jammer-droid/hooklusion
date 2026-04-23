import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeEvent } from "./normalize.js";

describe("normalizeEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes Claude payloads to the Claude adapter", () => {
    const payload = {
      hook_event_name: "SessionStart",
      session_id: "session-1",
      source: "startup",
      model: "claude-sonnet-4-6",
    };

    expect(
      normalizeEvent({
        provider: "claude",
        payload,
      }),
    ).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "SessionStart",
      canonicalStateHint: "session_start",
      providerState: null,
      raw: payload,
    });
  });

  it("routes Codex payloads to the Codex adapter", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "pnpm test",
      },
    };

    expect(
      normalizeEvent({
        provider: "codex",
        payload,
      }),
    ).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: "tool:test",
      raw: payload,
    });
  });

  it("returns null for unsupported providers", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      normalizeEvent({
        provider: "anthropic",
        payload: {
          hook_event_name: "SessionStart",
          session_id: "session-1",
        },
      }),
    ).toBeNull();

    expect(warn).toHaveBeenCalledWith(
      "[hooklusion/server] unsupported event provider",
      "anthropic",
    );
  });

  it("returns null and warns for unsupported Claude events", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      normalizeEvent({
        provider: "claude",
        payload: {
          hook_event_name: "TaskCreated",
          session_id: "session-1",
        },
      }),
    ).toBeNull();

    expect(warn).toHaveBeenCalledWith(
      "[hooklusion/server] unsupported claude event",
    );
  });

  it("returns null and warns for unsupported Codex events", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      normalizeEvent({
        provider: "codex",
        payload: {
          hook_event_name: "TaskCreated",
          session_id: "session-1",
        },
      }),
    ).toBeNull();

    expect(warn).toHaveBeenCalledWith(
      "[hooklusion/server] unsupported codex event",
    );
  });
});
