#!/usr/bin/env node

import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AnalyticsRetentionPolicy,
  createAnalyticsStore,
  defaultAnalyticsDatabasePath,
  generateAnalyticsReport,
} from "./analytics.js";
import { installClaudeHooks, uninstallClaudeHooks } from "./claudeHooks.js";
import { installCodexHooks, uninstallCodexHooks } from "./codexHooks.js";

export interface CliOptions {
  command: string | undefined;
  subcommand: string | undefined;
  settingsPath: string;
  codexHooksPath: string;
  codexConfigPath: string;
  analyticsDatabasePath: string;
  range: AnalyticsRetentionPolicy;
  provider: "claude" | "codex" | undefined;
  projectPath: string | undefined;
  sessionId: string | undefined;
  outputPath: string | undefined;
  retentionPolicy: AnalyticsRetentionPolicy | undefined;
}

export function parseCliOptions(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): CliOptions {
  const resolvedHomeDir = env.HOME ?? env.USERPROFILE ?? "";
  let command: string | undefined;
  let subcommand: string | undefined;
  let settingsPath =
    env.HOOKLUSION_CLAUDE_SETTINGS_PATH ??
    join(resolvedHomeDir, ".claude", "settings.json");
  let codexHooksPath =
    env.HOOKLUSION_CODEX_HOOKS_PATH ??
    join(resolvedHomeDir, ".codex", "hooks.json");
  let codexConfigPath =
    env.HOOKLUSION_CODEX_CONFIG_PATH ??
    join(resolvedHomeDir, ".codex", "config.toml");
  let analyticsDatabasePath =
    env.HOOKLUSION_ANALYTICS_DB_PATH ??
    defaultAnalyticsDatabasePath(resolvedHomeDir);
  let range: AnalyticsRetentionPolicy = "unlimited";
  let provider: "claude" | "codex" | undefined;
  let projectPath: string | undefined;
  let sessionId: string | undefined;
  let outputPath: string | undefined;
  let retentionPolicy: AnalyticsRetentionPolicy | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (command === undefined && !token.startsWith("--")) {
      command = token;
      continue;
    }

    if (subcommand === undefined && !token.startsWith("--")) {
      subcommand = token;
      continue;
    }

    if (token === "--settings-path") {
      settingsPath = argv[index + 1] ?? settingsPath;
      index += 1;
      continue;
    }

    if (token === "--codex-hooks-path") {
      codexHooksPath = argv[index + 1] ?? codexHooksPath;
      index += 1;
      continue;
    }

    if (token === "--codex-config-path") {
      codexConfigPath = argv[index + 1] ?? codexConfigPath;
      index += 1;
      continue;
    }

    if (token === "--analytics-db-path") {
      analyticsDatabasePath = argv[index + 1] ?? analyticsDatabasePath;
      index += 1;
      continue;
    }

    if (token === "--range") {
      const value = argv[index + 1];
      if (
        value === "1d" ||
        value === "7d" ||
        value === "30d" ||
        value === "unlimited"
      ) {
        range = value;
      }
      index += 1;
      continue;
    }

    if (token === "--provider") {
      const value = argv[index + 1];
      if (value === "claude" || value === "codex") {
        provider = value;
      }
      index += 1;
      continue;
    }

    if (token === "--project") {
      projectPath = argv[index + 1] ?? projectPath;
      index += 1;
      continue;
    }

    if (token === "--session") {
      sessionId = argv[index + 1] ?? sessionId;
      index += 1;
      continue;
    }

    if (token === "--output") {
      outputPath = argv[index + 1] ?? outputPath;
      index += 1;
      continue;
    }

    if (token === "--policy") {
      const value = argv[index + 1];
      if (
        value === "1d" ||
        value === "7d" ||
        value === "30d" ||
        value === "unlimited"
      ) {
        retentionPolicy = value;
      }
      index += 1;
    }
  }

  return {
    command,
    subcommand,
    settingsPath,
    codexHooksPath,
    codexConfigPath,
    analyticsDatabasePath,
    range,
    provider,
    projectPath,
    sessionId,
    outputPath,
    retentionPolicy,
  };
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const {
    command,
    subcommand,
    settingsPath,
    codexHooksPath,
    codexConfigPath,
    analyticsDatabasePath,
    range,
    provider,
    projectPath,
    sessionId,
    outputPath,
    retentionPolicy,
  } = parseCliOptions(argv, env);

  if (command === "install") {
    await installClaudeHooks({ settingsPath });
    console.log(`Installed Claude hooks in ${settingsPath}`);
    return;
  }

  if (command === "uninstall") {
    await uninstallClaudeHooks({ settingsPath });
    console.log(`Removed hooklusion Claude hooks from ${settingsPath}`);
    return;
  }

  if (command === "install-codex") {
    await installCodexHooks({
      hooksPath: codexHooksPath,
      configPath: codexConfigPath,
    });
    console.log(
      `Installed Codex hooks in ${codexHooksPath} and enabled codex_hooks in ${codexConfigPath}`,
    );
    return;
  }

  if (command === "uninstall-codex") {
    await uninstallCodexHooks({
      hooksPath: codexHooksPath,
      configPath: codexConfigPath,
    });
    console.log(`Removed hooklusion Codex hooks from ${codexHooksPath}`);
    return;
  }

  if (command === "analytics" && subcommand === "generate") {
    const resolvedOutputPath =
      outputPath ?? join(process.cwd(), "hooklusion-analytics-report.html");
    generateAnalyticsReport({
      databasePath: analyticsDatabasePath,
      outputPath: resolvedOutputPath,
      range,
      provider,
      projectRoot: projectPath,
      sessionId,
    });
    console.log(`Generated analytics report at ${resolvedOutputPath}`);
    return;
  }

  if (command === "analytics" && subcommand === "retention") {
    const store = createAnalyticsStore({
      databasePath: analyticsDatabasePath,
    });

    if (argv[2] === "show") {
      console.log(store.getRetentionPolicy());
      return;
    }

    if (argv[2] === "set" && retentionPolicy !== undefined) {
      store.setRetentionPolicy(retentionPolicy);
      store.pruneExpiredRecords();
      console.log(`Set analytics retention policy to ${retentionPolicy}`);
      return;
    }
  }

  console.log(
    "Usage: hooklusion <install|uninstall|install-codex|uninstall-codex|analytics>",
  );
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
