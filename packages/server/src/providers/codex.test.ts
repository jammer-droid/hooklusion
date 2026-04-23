import { describe, expect, it } from "vitest";

import { normalizeCodexEvent } from "./codex.js";

describe("normalizeCodexEvent", () => {
  it("normalizes SessionStart payloads", () => {
    const payload = {
      hook_event_name: "SessionStart",
      session_id: "session-1",
      source: "startup",
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "SessionStart",
      canonicalStateHint: "session_start",
      providerState: null,
      raw: payload,
    });
  });

  it.each([
    ["PreToolUse", "Read", "tool:read", "tool_active", false],
    ["PreToolUse", "Grep", "tool:search", "tool_active", false],
    ["PreToolUse", "Glob", "tool:explore", "tool_active", false],
    ["PreToolUse", "Write", "tool:vcs_write", "tool_active", false],
    ["PreToolUse", "Edit", "tool:vcs_write", "tool_active", false],
    ["PreToolUse", "MultiEdit", "tool:vcs_write", "tool_active", false],
    ["PostToolUse", "Read", "tool:read", "thinking", true],
    ["PostToolUse", "Grep", "tool:search", "thinking", true],
    ["PostToolUse", "Glob", "tool:explore", "thinking", true],
    ["PostToolUse", "Write", "tool:vcs_write", "thinking", true],
  ])("normalizes %s payloads for non-Bash tools", (_, toolName, providerState, canonicalStateHint, ok) => {
    const payload = {
      hook_event_name: _,
      session_id: "session-1",
      turn_id: "turn-1",
      tool_name: toolName,
      tool_input: {
        command: "cat src/app.ts",
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: "turn-1",
      event: _,
      canonicalStateHint,
      toolName,
      providerState,
      ...(ok ? { ok: true } : {}),
      raw: payload,
    });
  });

  it("classifies Bash PreToolUse payloads as tool:read", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      turn_id: "turn-1",
      tool_name: "Bash",
      tool_input: {
        command: "cat src/app.ts",
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: "turn-1",
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: "tool:read",
      raw: payload,
    });
  });

  it.each([
    "cat $(echo README.md)",
    'cat "$(echo README.md)"',
    "cat <(echo README.md)",
  ])("falls back conservatively for nested Bash syntax: %s", (command) => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command,
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: null,
      raw: payload,
    });
  });

  it("classifies Bash PreToolUse payloads as tool:search", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: 'rg "needle" src',
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: "tool:search",
      raw: payload,
    });
  });

  it("classifies Bash PreToolUse payloads as tool:vcs_read", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "git show HEAD~1 --stat",
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: "tool:vcs_read",
      raw: payload,
    });
  });

  it("classifies quoted pipe literals without compound fallback", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "rg 'foo|bar' src",
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: "tool:search",
      raw: payload,
    });
  });

  it("classifies quoted ampersand literals without compound fallback", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "curl 'https://example.com/?a=1&b=2'",
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: "tool:web",
      raw: payload,
    });
  });

  it("classifies quoted semicolon literals without compound fallback", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "git commit -m 'fix; update'",
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: "tool:vcs_write",
      raw: payload,
    });
  });

  it.each([
    ["tool:test", "env NODE_ENV=test pnpm test", "tool:test"],
    ["tool:build", "env CI=1 pnpm build", "tool:build"],
  ])("classifies env-prefixed Bash commands as %s", (_, command, providerState) => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command,
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState,
      raw: payload,
    });
  });

  it.each([
    ["tool:test", "env -i NODE_ENV=test pnpm test", "tool:test"],
    ["tool:build", "env -u FOO pnpm build", "tool:build"],
  ])("classifies env-flagged Bash commands as %s", (_, command, providerState) => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command,
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState,
      raw: payload,
    });
  });

  it.each([
    ["tool:build", "pnpm build", "tool:build"],
    ["tool:test", "pnpm test", "tool:test"],
    ["tool:web", "curl -fsS https://example.com", "tool:web"],
    ["tool:explore", "ls src", "tool:explore"],
    ["tool:vcs_write", 'git commit -m "update"', "tool:vcs_write"],
  ])("classifies Bash PreToolUse payloads as %s", (_, command, providerState) => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command,
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState,
      raw: payload,
    });
  });

  it.each([
    "cat README.md && python script.py",
    "cat README.md | rg TODO",
  ])("falls back conservatively for compound Bash commands: %s", (command) => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command,
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: null,
      raw: payload,
    });
  });

  it("falls back conservatively for unquoted redirection", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "cat README.md > output.txt",
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: null,
      raw: payload,
    });
  });

  it("falls back conservatively for ambiguous Bash commands", () => {
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      tool_name: "Bash",
      tool_input: {
        command: "python script.py",
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: null,
      event: "PreToolUse",
      canonicalStateHint: "tool_active",
      toolName: "Bash",
      providerState: null,
      raw: payload,
    });
  });

  it("preserves the core shape for PostToolUse payloads", () => {
    const payload = {
      hook_event_name: "PostToolUse",
      session_id: "session-1",
      turn_id: "turn-2",
      tool_name: "Bash",
      tool_input: {
        command: "cat README.md",
      },
      tool_response: {
        exit_code: 0,
      },
    };

    expect(normalizeCodexEvent(payload)).toEqual({
      provider: "codex",
      sessionId: "session-1",
      turnId: "turn-2",
      event: "PostToolUse",
      canonicalStateHint: "thinking",
      toolName: "Bash",
      providerState: "tool:read",
      ok: true,
      raw: payload,
    });
  });

  it("returns null for unsupported Codex payloads", () => {
    expect(
      normalizeCodexEvent({
        hook_event_name: "PermissionRequest",
        session_id: "session-1",
      }),
    ).toBeNull();

    expect(
      normalizeCodexEvent({
        hook_event_name: "PreToolUse",
        session_id: "session-1",
        tool_name: null,
      }),
    ).toBeNull();
  });
});
