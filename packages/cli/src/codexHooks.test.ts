import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { installCodexHooks, uninstallCodexHooks } from "./codexHooks.js";

const execFileAsync = promisify(execFile);

describe("Codex hook installer", () => {
  it("appends hooklusion hook commands without removing unrelated hooks", async () => {
    const { hooksPath, configPath } = await createCodexFiles({
      hooks: {
        Stop: [
          {
            matcher: "*",
            hooks: [{ type: "command", command: "echo keep-me", timeout: 10 }],
          },
        ],
      },
    });

    await installCodexHooks({ hooksPath, configPath });

    const hooks = await readHooks(hooksPath);

    expect(hooks.hooks.Stop).toHaveLength(1);
    expect(hooks.hooks.Stop[0].matcher).toBe("*");
    expect(hooks.hooks.Stop[0].hooks).toHaveLength(2);
    expect(hooks.hooks.Stop[0].hooks[0].command).toBe("echo keep-me");
    expect(hooks.hooks.Stop[0].hooks[0].timeout).toBe(10);
    expect(hooks.hooks.Stop[0].hooks[1].command).toContain("hooklusion");
    expect(hooks.hooks.SessionStart[0].hooks[0].command).toContain(
      "hooklusion",
    );
    expect(hooks.hooks.PreToolUse[0].hooks[0].command).toContain(
      "x-hooklusion-provider: codex",
    );
    expect(hooks.hooks.SessionStart[0].hooks[0].command).toContain(
      "x-hooklusion-host-pid: $PPID",
    );
  });

  it("is idempotent when install runs twice", async () => {
    const { hooksPath, configPath } = await createCodexFiles({});

    await installCodexHooks({ hooksPath, configPath });
    await installCodexHooks({ hooksPath, configPath });

    const hooks = await readHooks(hooksPath);

    expect(hooks.hooks.Stop).toHaveLength(1);
    expect(hooks.hooks.UserPromptSubmit).toHaveLength(1);
  });

  it("replaces legacy project-c owned entries during install", async () => {
    const { hooksPath, configPath } = await createCodexFiles({
      hooks: {
        SessionStart: [
          {
            hooks: [
              {
                type: "command",
                command:
                  'PROJECT_C_CODEX_HOOK=SessionStart PROJECT_C_CODEX_HOOK_MARKER=project-c-codex-hook sh -c \'curl -fsS --max-time 1 -X POST "http://127.0.0.1:47321/event" -H "content-type: application/json" -H "x-project-c-provider: codex" -H "x-project-c-host-pid: $PPID" --data-binary @- >/dev/null 2>&1 || true\'',
              },
            ],
          },
        ],
      },
    });

    await installCodexHooks({ hooksPath, configPath });

    const hooks = await readHooks(hooksPath);

    expect(hooks.hooks.SessionStart).toHaveLength(1);
    expect(hooks.hooks.SessionStart[0].hooks[0].command).toContain(
      "hooklusion-codex-hook",
    );
    expect(hooks.hooks.SessionStart[0].hooks[0].command).not.toContain(
      "project-c-codex-hook",
    );
  });

  it("enables codex_hooks without replacing other config", async () => {
    const { hooksPath, configPath } = await createCodexFiles(
      {},
      'model = "gpt-5.4"\n\n[features]\njs_repl = true\n',
    );

    await installCodexHooks({ hooksPath, configPath });

    const config = await readFile(configPath, "utf8");

    expect(config).toContain('model = "gpt-5.4"');
    expect(config).toContain("[features]");
    expect(config).toContain("js_repl = true");
    expect(config).toContain("codex_hooks = true");
  });

  it("installs hook commands that are valid shell commands", async () => {
    const { hooksPath, configPath } = await createCodexFiles({});

    await installCodexHooks({ hooksPath, configPath });

    const hooks = await readHooks(hooksPath);
    const command = hooks.hooks.SessionStart[0].hooks[0].command;

    await expect(
      execFileAsync("sh", ["-c", `printf '{}' | ${command}`]),
    ).resolves.toMatchObject({
      stderr: "",
    });
  });

  it("removes only hooklusion owned hook commands during uninstall", async () => {
    const { hooksPath, configPath } = await createCodexFiles({
      hooks: {
        Stop: [
          {
            matcher: "*",
            hooks: [{ type: "command", command: "echo keep-me", timeout: 10 }],
          },
        ],
      },
    });

    await installCodexHooks({ hooksPath, configPath });
    await uninstallCodexHooks({ hooksPath, configPath });

    const hooks = await readHooks(hooksPath);

    expect(hooks.hooks.Stop).toHaveLength(1);
    expect(hooks.hooks.Stop[0].matcher).toBe("*");
    expect(hooks.hooks.Stop[0].hooks).toHaveLength(1);
    expect(hooks.hooks.Stop[0].hooks[0].command).toBe("echo keep-me");
    expect(hooks.hooks.Stop[0].hooks[0].timeout).toBe(10);
    expect(hooks.hooks.SessionStart).toBeUndefined();
  });

  it("removes legacy project-c owned hook entries during uninstall", async () => {
    const { hooksPath, configPath } = await createCodexFiles({
      hooks: {
        SessionStart: [
          {
            hooks: [
              {
                type: "command",
                command:
                  'PROJECT_C_CODEX_HOOK=SessionStart PROJECT_C_CODEX_HOOK_MARKER=project-c-codex-hook sh -c \'curl -fsS --max-time 1 -X POST "http://127.0.0.1:47321/event" -H "content-type: application/json" -H "x-project-c-provider: codex" -H "x-project-c-host-pid: $PPID" --data-binary @- >/dev/null 2>&1 || true\'',
              },
            ],
          },
        ],
      },
    });

    await uninstallCodexHooks({ hooksPath, configPath });

    const hooks = await readHooks(hooksPath);

    expect(hooks.hooks.SessionStart).toBeUndefined();
  });
});

async function createCodexFiles(hooksContents: unknown, config = "") {
  const directory = await mkdtemp(join(tmpdir(), "hooklusion-codex-cli-"));
  const hooksPath = join(directory, "hooks.json");
  const configPath = join(directory, "config.toml");

  await writeFile(
    hooksPath,
    `${JSON.stringify(hooksContents, null, 2)}\n`,
    "utf8",
  );
  await writeFile(configPath, config, "utf8");

  return { hooksPath, configPath };
}

async function readHooks(hooksPath: string) {
  return JSON.parse(await readFile(hooksPath, "utf8")) as {
    hooks: Record<
      string,
      Array<{
        matcher?: string;
        hooks: Array<{ command: string; timeout?: number }>;
      }>
    >;
  };
}
