import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createSetupController } from "./setupController.js";

describe("setupController", () => {
  it("adds and removes managed projects through app config", async () => {
    const controller = await createTestController();

    const added = await controller.addManagedProject("/tmp/project-a");
    expect(added).toHaveLength(1);
    expect(added[0].projectRoot).toBe("/tmp/project-a");

    const remaining = await controller.removeManagedProject("/tmp/project-a");
    expect(remaining).toEqual([]);
  });

  it("installs local Claude hooks and updates managed project status", async () => {
    const installer = {
      installClaudeHooks: vi.fn(async () => {}),
      removeClaudeHooks: vi.fn(async () => {}),
      installCodexHooks: vi.fn(async () => {}),
      removeCodexHooks: vi.fn(async () => {}),
    };
    const controller = await createTestController({ installer });

    const status = await controller.installClaudeHooks("/tmp/project-a");

    expect(installer.installClaudeHooks).toHaveBeenCalledWith({
      settingsPath: "/tmp/project-a/.claude/settings.json",
    });
    expect(status?.claudeInstalled).toBe(true);
    expect(status?.codexInstalled).toBe(false);
    expect(status?.lastSetupAt).toBe("2026-04-22T12:00:00.000Z");
  });

  it("removes local Codex hooks without deleting the managed project", async () => {
    const installer = {
      installClaudeHooks: vi.fn(async () => {}),
      removeClaudeHooks: vi.fn(async () => {}),
      installCodexHooks: vi.fn(async () => {}),
      removeCodexHooks: vi.fn(async () => {}),
    };
    const controller = await createTestController({ installer });

    await controller.installCodexHooks("/tmp/project-a");
    const status = await controller.removeCodexHooks("/tmp/project-a");

    expect(installer.removeCodexHooks).toHaveBeenCalledWith({
      hooksPath: "/tmp/project-a/.codex/hooks.json",
      configPath: "/tmp/project-a/.codex/config.toml",
    });
    expect(status?.projectRoot).toBe("/tmp/project-a");
    expect(status?.codexInstalled).toBe(false);

    const projects = await controller.listManagedProjects();
    expect(projects).toHaveLength(1);
  });
});

async function createTestController(
  options: {
    installer?: {
      installClaudeHooks(args: { settingsPath: string }): Promise<void>;
      removeClaudeHooks(args: { settingsPath: string }): Promise<void>;
      installCodexHooks(args: {
        hooksPath: string;
        configPath: string;
      }): Promise<void>;
      removeCodexHooks(args: {
        hooksPath: string;
        configPath: string;
      }): Promise<void>;
    };
  } = {},
) {
  const configPath = join(
    await mkdtemp(join(tmpdir(), "hooklusion-setup-controller-")),
    "config.json",
  );

  return createSetupController({
    configPath,
    installer: options.installer ?? {
      installClaudeHooks: async () => {},
      removeClaudeHooks: async () => {},
      installCodexHooks: async () => {},
      removeCodexHooks: async () => {},
    },
    now: () => "2026-04-22T12:00:00.000Z",
    homeDir: "/Users/tester",
  });
}
