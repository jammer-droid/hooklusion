import { join, resolve } from "node:path";

import {
  type ManagedProjectConfig,
  readAppConfig,
  removeManagedProject,
  type SmokeTestStatus,
  upsertManagedProject,
  writeAppConfig,
} from "./appConfig.js";
import { buildSetupManualPrompt } from "./setupManualPrompt.js";

interface ClaudeInstaller {
  settingsPath: string;
}

interface CodexInstaller {
  hooksPath: string;
  configPath: string;
}

export interface SetupInstaller {
  installClaudeHooks(args: ClaudeInstaller): Promise<void>;
  removeClaudeHooks(args: ClaudeInstaller): Promise<void>;
  installCodexHooks(args: CodexInstaller): Promise<void>;
  removeCodexHooks(args: CodexInstaller): Promise<void>;
}

export interface SetupControllerOptions {
  configPath: string;
  installer: SetupInstaller;
  now?: () => string;
  homeDir: string;
}

export function createSetupController({
  configPath,
  installer,
  now = () => new Date().toISOString(),
  homeDir,
}: SetupControllerOptions) {
  async function listManagedProjects() {
    return (await readAppConfig(configPath)).managedProjects;
  }

  async function addManagedProject(projectRoot: string) {
    const config = await readAppConfig(configPath);
    const next = upsertManagedProject(config, projectRoot);
    await writeAppConfig(configPath, next);
    return next.managedProjects;
  }

  async function deleteManagedProject(projectRoot: string) {
    const config = await readAppConfig(configPath);
    const next = removeManagedProject(config, projectRoot);
    await writeAppConfig(configPath, next);
    return next.managedProjects;
  }

  async function installClaude(projectRoot: string) {
    const targets = resolveLocalSetupTargets(projectRoot);
    await installer.installClaudeHooks({
      settingsPath: targets.claudeSettingsPath,
    });
    return saveProject(projectRoot, {
      claudeInstalled: true,
      lastSetupAt: now(),
    });
  }

  async function removeClaude(projectRoot: string) {
    const targets = resolveLocalSetupTargets(projectRoot);
    await installer.removeClaudeHooks({
      settingsPath: targets.claudeSettingsPath,
    });
    return saveProject(projectRoot, {
      claudeInstalled: false,
      lastSetupAt: now(),
    });
  }

  async function installCodex(projectRoot: string) {
    const targets = resolveLocalSetupTargets(projectRoot);
    await installer.installCodexHooks({
      hooksPath: targets.codexHooksPath,
      configPath: targets.codexConfigPath,
    });
    return saveProject(projectRoot, {
      codexInstalled: true,
      lastSetupAt: now(),
    });
  }

  async function removeCodex(projectRoot: string) {
    const targets = resolveLocalSetupTargets(projectRoot);
    await installer.removeCodexHooks({
      hooksPath: targets.codexHooksPath,
      configPath: targets.codexConfigPath,
    });
    return saveProject(projectRoot, {
      codexInstalled: false,
      lastSetupAt: now(),
    });
  }

  function getSetupManualPrompt(projectRoot: string) {
    return buildSetupManualPrompt({
      projectRoot,
      providers: ["claude", "codex"],
      homeDir,
    });
  }

  async function recordSmokeTestResult(
    projectRoot: string,
    status: SmokeTestStatus,
    completedAt = now(),
  ) {
    return saveProject(projectRoot, {
      lastSmokeTestAt: completedAt,
      lastSmokeTestStatus: status,
    });
  }

  async function saveProject(
    projectRoot: string,
    updates: Partial<Omit<ManagedProjectConfig, "projectRoot">>,
  ) {
    const config = await readAppConfig(configPath);
    const next = upsertManagedProject(config, projectRoot, updates);
    await writeAppConfig(configPath, next);
    return (
      next.managedProjects.find(
        (project) => project.projectRoot === resolve(projectRoot),
      ) ?? null
    );
  }

  return {
    listManagedProjects,
    addManagedProject,
    removeManagedProject: deleteManagedProject,
    installClaudeHooks: installClaude,
    removeClaudeHooks: removeClaude,
    installCodexHooks: installCodex,
    removeCodexHooks: removeCodex,
    getSetupManualPrompt,
    recordSmokeTestResult,
  };
}

function resolveLocalSetupTargets(projectRoot: string) {
  const resolvedProjectRoot = resolve(projectRoot);

  return {
    claudeSettingsPath: join(resolvedProjectRoot, ".claude", "settings.json"),
    codexHooksPath: join(resolvedProjectRoot, ".codex", "hooks.json"),
    codexConfigPath: join(resolvedProjectRoot, ".codex", "config.toml"),
  };
}
