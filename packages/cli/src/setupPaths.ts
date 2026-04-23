import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface SetupPaths {
  projectRoot: string;
  localClaudeSettingsPath: string;
  localCodexHooksPath: string;
  localCodexConfigPath: string;
  globalClaudeSettingsPath: string;
  globalCodexHooksPath: string;
  globalCodexConfigPath: string;
}

export function resolveSetupPaths(
  projectRoot: string,
  options: {
    cwd?: string;
    homeDir?: string;
  } = {},
): SetupPaths {
  const resolvedProjectRoot = resolve(
    options.cwd ?? process.cwd(),
    projectRoot,
  );
  const resolvedHomeDir = options.homeDir ?? homedir();

  return {
    projectRoot: resolvedProjectRoot,
    localClaudeSettingsPath: join(
      resolvedProjectRoot,
      ".claude",
      "settings.json",
    ),
    localCodexHooksPath: join(resolvedProjectRoot, ".codex", "hooks.json"),
    localCodexConfigPath: join(resolvedProjectRoot, ".codex", "config.toml"),
    globalClaudeSettingsPath: join(resolvedHomeDir, ".claude", "settings.json"),
    globalCodexHooksPath: join(resolvedHomeDir, ".codex", "hooks.json"),
    globalCodexConfigPath: join(resolvedHomeDir, ".codex", "config.toml"),
  };
}
