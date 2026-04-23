import { describe, expect, it } from "vitest";

import { resolveSetupPaths } from "./setupPaths.js";

describe("resolveSetupPaths", () => {
  it("derives local and global hook config paths from a project root", () => {
    expect(
      resolveSetupPaths("/Users/tester/dev/hooklusion", {
        homeDir: "/Users/tester",
      }),
    ).toEqual({
      projectRoot: "/Users/tester/dev/hooklusion",
      localClaudeSettingsPath:
        "/Users/tester/dev/hooklusion/.claude/settings.json",
      localCodexHooksPath: "/Users/tester/dev/hooklusion/.codex/hooks.json",
      localCodexConfigPath: "/Users/tester/dev/hooklusion/.codex/config.toml",
      globalClaudeSettingsPath: "/Users/tester/.claude/settings.json",
      globalCodexHooksPath: "/Users/tester/.codex/hooks.json",
      globalCodexConfigPath: "/Users/tester/.codex/config.toml",
    });
  });

  it("normalizes relative project roots to absolute paths", () => {
    const paths = resolveSetupPaths("./hooklusion", {
      cwd: "/Users/tester/dev",
      homeDir: "/Users/tester",
    });

    expect(paths.projectRoot).toBe("/Users/tester/dev/hooklusion");
    expect(paths.localClaudeSettingsPath).toBe(
      "/Users/tester/dev/hooklusion/.claude/settings.json",
    );
  });
});
