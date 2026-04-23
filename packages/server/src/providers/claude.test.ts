import { describe, expect, it } from "vitest";

import { normalizeClaudeEvent } from "./claude.js";

describe("normalizeClaudeEvent", () => {
  it("normalizes SessionStart payloads", () => {
    const payload = {
      hook_event_name: "SessionStart",
      session_id: "session-1",
      source: "startup",
      model: "claude-sonnet-4-6",
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "SessionStart",
      canonicalStateHint: "session_start",
      providerState: null,
      raw: payload,
    });
  });

  it("normalizes UserPromptSubmit payloads", () => {
    const payload = {
      hook_event_name: "UserPromptSubmit",
      session_id: "session-1",
      prompt: "hello",
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "UserPromptSubmit",
      canonicalStateHint: "prompt_received",
      providerState: null,
      raw: payload,
    });
  });

  it("normalizes Bash PreToolUse payloads onto the generic fallback", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_use_id: "toolu_1",
      tool_input: {
        command: "pnpm test",
      },
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: null,
      raw: payload,
    });
  });

  it.each([
    ["Read", "tool:read"],
    ["Glob", "tool:explore"],
    ["Grep", "tool:search"],
    ["WebFetch", "tool:web"],
    ["WebSearch", "tool:web"],
  ])("maps Claude %s tool usage into providerState %s", (toolName, providerState) => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: toolName,
      tool_input: {},
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName,
      providerState,
      raw: payload,
    });
  });

  it("keeps Claude Bash commands on the generic fallback without heuristic enrichment", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "cat src/app.ts",
      },
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: null,
      raw: payload,
    });
  });

  it("keeps ambiguous Claude Bash commands on the generic fallback", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "python scripts/custom_task.py",
      },
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: null,
      raw: payload,
    });
  });

  it("normalizes PostToolUse payloads", () => {
    const payload = {
      hook_event_name: "PostToolUse",
      session_id: "session-1",
      tool_name: "Write",
      tool_use_id: "toolu_2",
      tool_input: {
        file_path: "src/app.ts",
        content: "console.log('hi');",
      },
      tool_response: {
        filePath: "src/app.ts",
        success: true,
      },
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "PostToolUse",
      canonicalStateHint: "thinking",
      toolName: "Write",
      providerState: "tool:vcs_write",
      ok: true,
      raw: payload,
    });
  });

  it("preserves providerState mapping for Claude PostToolUse events", () => {
    const payload = {
      hook_event_name: "PostToolUse",
      session_id: "session-1",
      tool_name: "WebSearch",
      tool_input: {
        query: "claude hooks",
      },
      tool_response: {
        ok: true,
      },
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "PostToolUse",
      canonicalStateHint: "thinking",
      toolName: "WebSearch",
      providerState: "tool:web",
      ok: true,
      raw: payload,
    });
  });

  it("keeps Claude Bash PostToolUse events on the generic fallback", () => {
    const payload = {
      hook_event_name: "PostToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "pnpm build",
      },
      tool_response: {
        ok: true,
      },
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "PostToolUse",
      canonicalStateHint: "thinking",
      toolName: "Bash",
      providerState: null,
      ok: true,
      raw: payload,
    });
  });

  it("normalizes Stop payloads", () => {
    const payload = {
      hook_event_name: "Stop",
      session_id: "session-1",
      stop_hook_active: false,
      last_assistant_message: "done",
    };

    expect(normalizeClaudeEvent(payload)).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "Stop",
      canonicalStateHint: "done",
      providerState: null,
      ok: true,
      raw: payload,
    });
  });

  it("returns null for unsupported Claude payloads", () => {
    expect(
      normalizeClaudeEvent({
        hook_event_name: "TaskCreated",
        session_id: "session-1",
      }),
    ).toBeNull();
  });

  it("returns null for non-object payloads", () => {
    expect(normalizeClaudeEvent(null)).toBeNull();
    expect(normalizeClaudeEvent("not-json")).toBeNull();
  });

  it("returns null when session_id is missing", () => {
    expect(
      normalizeClaudeEvent({
        hook_event_name: "SessionStart",
        source: "startup",
      }),
    ).toBeNull();
  });

  it("treats empty turn_id as null", () => {
    expect(
      normalizeClaudeEvent({
        hook_event_name: "SessionStart",
        session_id: "session-1",
        turn_id: "",
        source: "startup",
      }),
    ).toEqual({
      provider: "claude",
      sessionId: "session-1",
      turnId: null,
      event: "SessionStart",
      canonicalStateHint: "session_start",
      providerState: null,
      raw: {
        hook_event_name: "SessionStart",
        session_id: "session-1",
        turn_id: "",
        source: "startup",
      },
    });
  });

  it("returns null when hook_event_name is missing", () => {
    expect(
      normalizeClaudeEvent({
        session_id: "session-1",
        source: "startup",
      }),
    ).toBeNull();
  });

  it("returns null when tool_name is missing for PreToolUse and PostToolUse", () => {
    expect(
      normalizeClaudeEvent({
        hook_event_name: "PreToolUse",
        session_id: "session-1",
        tool_use_id: "toolu_1",
      }),
    ).toBeNull();

    expect(
      normalizeClaudeEvent({
        hook_event_name: "PostToolUse",
        session_id: "session-1",
        tool_use_id: "toolu_2",
      }),
    ).toBeNull();
  });
});
