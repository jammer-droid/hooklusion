import { describe, expect, it } from "vitest";

import { parseCliOptions } from "./index.js";

describe("parseCliOptions", () => {
  it("uses default paths when explicit paths are not provided", () => {
    const options = parseCliOptions(["install"], {
      HOME: "/Users/tester",
    });

    expect(options.command).toBe("install");
    expect(options.settingsPath).toBe("/Users/tester/.claude/settings.json");
  });

  it("accepts an explicit Claude settings path from CLI args", () => {
    const options = parseCliOptions(
      ["install", "--settings-path", "/tmp/project/.claude/settings.json"],
      {
        HOME: "/Users/tester",
      },
    );

    expect(options.command).toBe("install");
    expect(options.settingsPath).toBe("/tmp/project/.claude/settings.json");
  });

  it("prefers explicit args over environment overrides", () => {
    const options = parseCliOptions(
      ["install", "--settings-path", "/tmp/project/.claude/settings.json"],
      {
        HOME: "/Users/tester",
        HOOKLUSION_CLAUDE_SETTINGS_PATH: "/tmp/global-override/settings.json",
      },
    );

    expect(options.settingsPath).toBe("/tmp/project/.claude/settings.json");
  });

  it("keeps env-based overrides working for existing callers", () => {
    const options = parseCliOptions(["install"], {
      HOME: "/Users/tester",
      HOOKLUSION_CLAUDE_SETTINGS_PATH: "/tmp/custom/settings.json",
    });

    expect(options.settingsPath).toBe("/tmp/custom/settings.json");
  });

  it("accepts explicit Codex hook paths from CLI args", () => {
    const options = parseCliOptions(
      [
        "install-codex",
        "--codex-hooks-path",
        "/tmp/project/.codex/hooks.json",
        "--codex-config-path",
        "/tmp/project/.codex/config.toml",
      ],
      {
        HOME: "/Users/tester",
      },
    );

    expect(options.command).toBe("install-codex");
    expect(options.codexHooksPath).toBe("/tmp/project/.codex/hooks.json");
    expect(options.codexConfigPath).toBe("/tmp/project/.codex/config.toml");
  });

  it("parses analytics generate options", () => {
    const options = parseCliOptions(
      [
        "analytics",
        "generate",
        "--range",
        "7d",
        "--provider",
        "codex",
        "--project",
        "/tmp/project",
        "--session",
        "session-123",
        "--output",
        "/tmp/report.html",
      ],
      {
        HOME: "/Users/tester",
      },
    );

    expect(options.command).toBe("analytics");
    expect(options.subcommand).toBe("generate");
    expect(options.range).toBe("7d");
    expect(options.provider).toBe("codex");
    expect(options.projectPath).toBe("/tmp/project");
    expect(options.sessionId).toBe("session-123");
    expect(options.outputPath).toBe("/tmp/report.html");
  });
});
