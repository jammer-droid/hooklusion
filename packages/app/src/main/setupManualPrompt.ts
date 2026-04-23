import { join, resolve } from "node:path";

export interface SetupManualPromptOptions {
  projectRoot: string;
  providers: Array<"claude" | "codex">;
  homeDir: string;
}

export function buildSetupManualPrompt({
  projectRoot,
  providers,
  homeDir,
}: SetupManualPromptOptions) {
  const resolvedProjectRoot = resolve(projectRoot);
  const localClaudeSettingsPath = join(
    resolvedProjectRoot,
    ".claude",
    "settings.json",
  );
  const localCodexHooksPath = join(resolvedProjectRoot, ".codex", "hooks.json");
  const localCodexConfigPath = join(
    resolvedProjectRoot,
    ".codex",
    "config.toml",
  );
  const globalClaudeSettingsPath = join(homeDir, ".claude", "settings.json");
  const globalCodexHooksPath = join(homeDir, ".codex", "hooks.json");
  const globalCodexConfigPath = join(homeDir, ".codex", "config.toml");
  const providerList = providers
    .map((provider) => (provider === "claude" ? "Claude" : "Codex"))
    .join(", ");

  return [
    `Configure Hooklusion hooks for ${providerList} in the project ${resolvedProjectRoot}.`,
    "Prefer local project setup first, but also mention optional global setup for advanced users.",
    "",
    "Local config files:",
    `- Claude: ${localClaudeSettingsPath}`,
    `- Codex hooks: ${localCodexHooksPath}`,
    `- Codex config: ${localCodexConfigPath}`,
    "",
    "Optional global config files:",
    `- Claude: ${globalClaudeSettingsPath}`,
    `- Codex hooks: ${globalCodexHooksPath}`,
    `- Codex config: ${globalCodexConfigPath}`,
    "",
    "Desired behavior:",
    "- Hook events should POST incoming JSON to http://127.0.0.1:47321/event",
    "- The hook command should stay fail-open if Hooklusion is not reachable",
    "- Keep unrelated user hook settings intact",
  ].join("\n");
}
