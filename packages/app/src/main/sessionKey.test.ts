import { describe, expect, it } from "vitest";

import {
  createSessionKey,
  formatSessionLabel,
  parseSessionKey,
} from "./sessionKey.js";

describe("session key helpers", () => {
  it("creates provider-qualified session keys", () => {
    expect(createSessionKey("codex", "abc")).toBe("codex:abc");
    expect(createSessionKey("claude", "session-1")).toBe("claude:session-1");
  });

  it("parses provider-qualified session keys", () => {
    expect(parseSessionKey("claude:abc")).toEqual({
      provider: "claude",
      sessionId: "abc",
    });
    expect(parseSessionKey("codex:session-9")).toEqual({
      provider: "codex",
      sessionId: "session-9",
    });
  });

  it.each([
    "",
    "abc",
    "openai:abc",
    "codex:",
    ":abc",
    "codex:a:b",
  ])("returns null for invalid session keys: %s", (sessionKey) => {
    expect(parseSessionKey(sessionKey)).toBeNull();
  });

  it("formats compact tray labels", () => {
    expect(
      formatSessionLabel({
        provider: "codex",
        sessionId: "019db022-4d0f-73a1-b9d9-18a59327d129",
        state: "tool_active",
        cwd: null,
      }),
    ).toBe("Unknown Project · Codex · 019db022 · tool_active");
  });
});
