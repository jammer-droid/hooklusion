import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  readAppConfig,
  removeManagedProject,
  resolveConfiguredDefaultProfileId,
  upsertManagedProject,
  writeAppConfig,
} from "./appConfig.js";

describe("appConfig", () => {
  it("returns an empty default config when the file is missing", async () => {
    const configPath = join(
      await mkdtemp(join(tmpdir(), "hooklusion-app-config-")),
      "config.json",
    );

    await expect(readAppConfig(configPath)).resolves.toEqual({
      managedProjects: [],
      profiles: {
        defaultProfileId: null,
      },
      sessionSelection: {
        pinnedSessionKey: null,
      },
      characterWindow: {
        bounds: null,
      },
    });
  });

  it("stores managed projects with absolute root paths", async () => {
    const configPath = await createConfigPath();
    const config = upsertManagedProject(
      {
        managedProjects: [],
        profiles: {
          defaultProfileId: null,
        },
        sessionSelection: {
          pinnedSessionKey: null,
        },
        characterWindow: {
          bounds: null,
        },
      },
      "./repo",
      {
        claudeInstalled: true,
      },
    );

    await writeAppConfig(configPath, config);

    const reloaded = await readAppConfig(configPath);
    expect(reloaded.managedProjects).toHaveLength(1);
    expect(isAbsolute(reloaded.managedProjects[0].projectRoot)).toBe(true);
    expect(reloaded.managedProjects[0].claudeInstalled).toBe(true);
  });

  it("preserves hook and smoke test metadata when saving and reloading", async () => {
    const configPath = await createConfigPath();

    await writeAppConfig(
      configPath,
      upsertManagedProject(
        {
          managedProjects: [],
          profiles: {
            defaultProfileId: null,
          },
          sessionSelection: {
            pinnedSessionKey: null,
          },
          characterWindow: {
            bounds: null,
          },
        },
        "/tmp/hooklusion-target",
        {
          claudeInstalled: true,
          codexInstalled: false,
          lastSetupAt: "2026-04-22T09:00:00.000Z",
          lastSmokeTestAt: "2026-04-22T09:05:00.000Z",
          lastSmokeTestStatus: "ok",
        },
      ),
    );

    const reloaded = await readAppConfig(configPath);
    expect(reloaded.managedProjects[0]).toEqual({
      projectRoot: "/tmp/hooklusion-target",
      claudeInstalled: true,
      codexInstalled: false,
      lastSetupAt: "2026-04-22T09:00:00.000Z",
      lastSmokeTestAt: "2026-04-22T09:05:00.000Z",
      lastSmokeTestStatus: "ok",
    });
    expect(reloaded.sessionSelection).toEqual({
      pinnedSessionKey: null,
    });
    expect(reloaded.profiles).toEqual({
      defaultProfileId: null,
    });
    expect(reloaded.characterWindow).toEqual({
      bounds: null,
    });
  });

  it("removes only the requested managed project record", async () => {
    const configPath = await createConfigPath();
    const initial = upsertManagedProject(
      upsertManagedProject(
        {
          managedProjects: [],
          profiles: {
            defaultProfileId: null,
          },
          sessionSelection: {
            pinnedSessionKey: "codex:session-42",
          },
          characterWindow: {
            bounds: null,
          },
        },
        "/tmp/first",
        {
          claudeInstalled: true,
        },
      ),
      "/tmp/second",
      {
        codexInstalled: true,
      },
    );

    await writeAppConfig(configPath, initial);

    const next = removeManagedProject(
      await readAppConfig(configPath),
      "/tmp/first",
    );
    expect(next.managedProjects).toEqual([
      {
        projectRoot: "/tmp/second",
        claudeInstalled: false,
        codexInstalled: true,
        lastSetupAt: null,
        lastSmokeTestAt: null,
        lastSmokeTestStatus: null,
      },
    ]);
    expect(next.sessionSelection).toEqual({
      pinnedSessionKey: "codex:session-42",
    });
    expect(next.profiles).toEqual({
      defaultProfileId: null,
    });
    expect(next.characterWindow).toEqual({
      bounds: null,
    });
  });

  it("writes normalized json with a trailing newline", async () => {
    const configPath = await createConfigPath();

    await writeAppConfig(
      configPath,
      upsertManagedProject(
        {
          managedProjects: [],
          profiles: {
            defaultProfileId: null,
          },
          sessionSelection: {
            pinnedSessionKey: null,
          },
          characterWindow: {
            bounds: null,
          },
        },
        "/tmp/hooklusion-target",
      ),
    );

    await expect(readFile(configPath, "utf8")).resolves.toMatch(/\n$/);
  });

  it("persists pinned session selection metadata", async () => {
    const configPath = await createConfigPath();

    await writeAppConfig(configPath, {
      managedProjects: [],
      profiles: {
        defaultProfileId: "custom-profile",
      },
      sessionSelection: {
        pinnedSessionKey: "codex:session-42",
      },
      characterWindow: {
        bounds: null,
      },
    });

    await expect(readAppConfig(configPath)).resolves.toEqual({
      managedProjects: [],
      profiles: {
        defaultProfileId: "custom-profile",
      },
      sessionSelection: {
        pinnedSessionKey: "codex:session-42",
      },
      characterWindow: {
        bounds: null,
      },
    });
  });

  it("normalizes missing profile config to a null default profile id", async () => {
    const configPath = await createConfigPath();

    await writeAppConfig(configPath, {
      managedProjects: [],
      profiles: {
        defaultProfileId: null,
      },
      sessionSelection: {
        pinnedSessionKey: null,
      },
      characterWindow: {
        bounds: null,
      },
    });

    await expect(readAppConfig(configPath)).resolves.toEqual({
      managedProjects: [],
      profiles: {
        defaultProfileId: null,
      },
      sessionSelection: {
        pinnedSessionKey: null,
      },
      characterWindow: {
        bounds: null,
      },
    });
  });

  it("persists character window bounds metadata", async () => {
    const configPath = await createConfigPath();

    await writeAppConfig(configPath, {
      managedProjects: [],
      profiles: {
        defaultProfileId: null,
      },
      sessionSelection: {
        pinnedSessionKey: null,
      },
      characterWindow: {
        bounds: {
          x: 120,
          y: 240,
          width: 300,
          height: 386,
        },
      },
    });

    await expect(readAppConfig(configPath)).resolves.toEqual({
      managedProjects: [],
      profiles: {
        defaultProfileId: null,
      },
      sessionSelection: {
        pinnedSessionKey: null,
      },
      characterWindow: {
        bounds: {
          x: 120,
          y: 240,
          width: 300,
          height: 386,
        },
      },
    });
  });

  it("keeps a configured default profile id when it exists", () => {
    expect(
      resolveConfiguredDefaultProfileId(
        {
          managedProjects: [],
          profiles: {
            defaultProfileId: "custom-profile",
          },
          sessionSelection: {
            pinnedSessionKey: null,
          },
          characterWindow: {
            bounds: null,
          },
        },
        ["gpchan-default", "custom-profile"],
        "gpchan-default",
      ),
    ).toBe("custom-profile");
  });

  it("falls back to the safe default when the configured profile is missing", () => {
    expect(
      resolveConfiguredDefaultProfileId(
        {
          managedProjects: [],
          profiles: {
            defaultProfileId: "missing-profile",
          },
          sessionSelection: {
            pinnedSessionKey: null,
          },
          characterWindow: {
            bounds: null,
          },
        },
        ["gpchan-default", "office-assistant-default"],
        "gpchan-default",
      ),
    ).toBe("gpchan-default");
  });
});

async function createConfigPath() {
  return join(
    await mkdtemp(join(tmpdir(), "hooklusion-app-config-")),
    "config.json",
  );
}
