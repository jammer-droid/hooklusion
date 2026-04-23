import { describe, expect, it } from "vitest";

import { buildSetupManualPrompt } from "./setupManualPrompt.js";

describe("buildSetupManualPrompt", () => {
  it("includes the selected project root and both local and global paths", () => {
    const prompt = buildSetupManualPrompt({
      projectRoot: "/Users/tester/dev/hooklusion",
      providers: ["claude", "codex"],
      homeDir: "/Users/tester",
    });

    expect(prompt).toContain("/Users/tester/dev/hooklusion");
    expect(prompt).toContain(
      "/Users/tester/dev/hooklusion/.claude/settings.json",
    );
    expect(prompt).toContain("/Users/tester/dev/hooklusion/.codex/hooks.json");
    expect(prompt).toContain("/Users/tester/.claude/settings.json");
    expect(prompt).toContain("/Users/tester/.codex/hooks.json");
  });

  it("describes fail-open POST behavior for Hooklusion hooks", () => {
    const prompt = buildSetupManualPrompt({
      projectRoot: "/Users/tester/dev/hooklusion",
      providers: ["claude"],
      homeDir: "/Users/tester",
    });

    expect(prompt).toContain("http://127.0.0.1:47321/event");
    expect(prompt).toContain("fail-open");
    expect(prompt).toContain("Claude");
  });
});
