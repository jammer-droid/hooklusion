import { join, resolve } from "node:path";

import {
  type AnalyticsProvider,
  type AnalyticsRetentionPolicy,
  defaultAnalyticsDatabasePath,
  generateAnalyticsReport,
} from "../packages/cli/src/analytics.js";

interface GenerateOptions {
  databasePath: string;
  outputPath: string;
  range: AnalyticsRetentionPolicy;
  provider?: AnalyticsProvider;
  projectRoot?: string;
  sessionId?: string;
}

function createTimestampedDefaultOutputPath() {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  return resolve(
    process.cwd(),
    `hooklusion-analytics-report-${timestamp}.html`,
  );
}

function parseGenerateOptions(argv: string[]): GenerateOptions {
  let databasePath = defaultAnalyticsDatabasePath();
  let outputPath = createTimestampedDefaultOutputPath();
  let range: AnalyticsRetentionPolicy = "unlimited";
  let provider: AnalyticsProvider | undefined;
  let projectRoot: string | undefined;
  let sessionId: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--db") {
      databasePath = resolve(argv[index + 1] ?? databasePath);
      index += 1;
      continue;
    }

    if (token === "--output") {
      outputPath = resolve(argv[index + 1] ?? outputPath);
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
      projectRoot = resolve(argv[index + 1] ?? process.cwd());
      index += 1;
      continue;
    }

    if (token === "--session") {
      sessionId = argv[index + 1] ?? sessionId;
      index += 1;
    }
  }

  return {
    databasePath,
    outputPath,
    range,
    provider,
    projectRoot,
    sessionId,
  };
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  pnpm analytics:generate",
      "  pnpm analytics:generate -- --output /tmp/hooklusion-report.html",
      "  pnpm analytics:generate -- --range 7d --provider codex",
      "  pnpm analytics:generate -- --project /abs/path/to/project --session <session-id>",
    ].join("\n"),
  );
}

function main(argv = process.argv.slice(2)) {
  const command = argv[0];

  if (command !== "generate") {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const options = parseGenerateOptions(argv.slice(1));
  generateAnalyticsReport({
    databasePath: options.databasePath,
    outputPath: options.outputPath,
    range: options.range,
    provider: options.provider,
    projectRoot: options.projectRoot,
    sessionId: options.sessionId,
  });

  console.log(`Generated analytics report at ${options.outputPath}`);
  console.log(`Analytics database: ${options.databasePath}`);
}

main();
