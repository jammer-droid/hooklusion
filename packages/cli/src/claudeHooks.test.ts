import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { installClaudeHooks, uninstallClaudeHooks } from "./claudeHooks.js";

const execFileAsync = promisify(execFile);

describe("Claude hook installer", () => {
  it("installs hooklusion hook entries without removing unrelated hooks", async () => {
    const settingsPath = await createSettingsFile({
      hooks: {
        Stop: [
          {
            hooks: [{ type: "command", command: "echo keep-me" }],
          },
        ],
      },
    });

    await installClaudeHooks({ settingsPath });

    const settings = await readSettings(settingsPath);

    expect(settings.hooks.Stop).toHaveLength(2);
    expect(settings.hooks.Stop[0].hooks[0].command).toBe("echo keep-me");
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain(
      "hooklusion",
    );
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain(
      "x-hooklusion-host-pid: $PPID",
    );
    expect(settings.hooks.PreToolUse[0].matcher).toBe("*");
  });

  it("is idempotent when install runs twice", async () => {
    const settingsPath = await createSettingsFile({});

    await installClaudeHooks({ settingsPath });
    await installClaudeHooks({ settingsPath });

    const settings = await readSettings(settingsPath);

    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
  });

  it("replaces legacy project-c owned entries during install", async () => {
    const settingsPath = await createSettingsFile({
      hooks: {
        SessionStart: [
          {
            hooks: [
              {
                type: "command",
                command:
                  'PROJECT_C_CLAUDE_HOOK=SessionStart PROJECT_C_CLAUDE_HOOK_MARKER=project-c-claude-hook sh -c \'curl -fsS --max-time 1 -X POST "http://127.0.0.1:47321/event" -H "content-type: application/json" -H "x-project-c-host-pid: $PPID" --data-binary @- >/dev/null 2>&1 || true\'',
              },
            ],
          },
        ],
      },
    });

    await installClaudeHooks({ settingsPath });

    const settings = await readSettings(settingsPath);

    expect(settings.hooks.SessionStart).toHaveLength(1);
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain(
      "hooklusion-claude-hook",
    );
    expect(settings.hooks.SessionStart[0].hooks[0].command).not.toContain(
      "project-c-claude-hook",
    );
  });

  it("installs hook commands that are valid shell commands", async () => {
    const settingsPath = await createSettingsFile({});

    await installClaudeHooks({ settingsPath });

    const settings = await readSettings(settingsPath);
    const command = settings.hooks.SessionStart[0].hooks[0].command;

    await expect(
      execFileAsync("sh", ["-c", `printf '{}' | ${command}`]),
    ).resolves.toMatchObject({
      stderr: "",
    });
  });

  it("removes only hooklusion owned hook entries during uninstall", async () => {
    const settingsPath = await createSettingsFile({
      hooks: {
        Stop: [
          {
            hooks: [{ type: "command", command: "echo keep-me" }],
          },
        ],
      },
    });

    await installClaudeHooks({ settingsPath });
    await uninstallClaudeHooks({ settingsPath });

    const settings = await readSettings(settingsPath);

    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.Stop[0].hooks[0].command).toBe("echo keep-me");
    expect(settings.hooks.SessionStart).toBeUndefined();
  });

  it("removes legacy project-c owned hook entries during uninstall", async () => {
    const settingsPath = await createSettingsFile({
      hooks: {
        SessionStart: [
          {
            hooks: [
              {
                type: "command",
                command:
                  'PROJECT_C_CLAUDE_HOOK=SessionStart PROJECT_C_CLAUDE_HOOK_MARKER=project-c-claude-hook sh -c \'curl -fsS --max-time 1 -X POST "http://127.0.0.1:47321/event" -H "content-type: application/json" -H "x-project-c-host-pid: $PPID" --data-binary @- >/dev/null 2>&1 || true\'',
              },
            ],
          },
        ],
      },
    });

    await uninstallClaudeHooks({ settingsPath });

    const settings = await readSettings(settingsPath);

    expect(settings.hooks.SessionStart).toBeUndefined();
  });
});

async function createSettingsFile(contents: unknown) {
  const directory = await mkdtemp(join(tmpdir(), "hooklusion-cli-"));
  const settingsPath = join(directory, "settings.json");

  await writeFile(
    settingsPath,
    `${JSON.stringify(contents, null, 2)}\n`,
    "utf8",
  );

  return settingsPath;
}

async function readSettings(settingsPath: string) {
  return JSON.parse(await readFile(settingsPath, "utf8")) as {
    hooks: Record<
      string,
      Array<{ matcher?: string; hooks: Array<{ command: string }> }>
    >;
  };
}
