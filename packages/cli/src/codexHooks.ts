import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const HOOKLUSION_MARKER = "hooklusion-codex-hook";
const LEGACY_PROJECT_C_MARKER = "project-c-codex-hook";
const DEFAULT_SERVER_URL = "http://127.0.0.1:47321/event";

type CodexHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "Stop";

interface CodexHookCommand {
  type: "command";
  command: string;
  [key: string]: unknown;
}

interface CodexHookEntry {
  matcher?: string;
  hooks: CodexHookCommand[];
  [key: string]: unknown;
}

interface CodexHooksConfig {
  hooks?: Partial<Record<CodexHookEvent, CodexHookEntry[]>> &
    Record<string, unknown>;
  [key: string]: unknown;
}

interface CodexHooksOptions {
  hooksPath: string;
  configPath: string;
  serverUrl?: string;
}

const HOOK_EVENTS: CodexHookEvent[] = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
];

export async function installCodexHooks({
  hooksPath,
  configPath,
  serverUrl = DEFAULT_SERVER_URL,
}: CodexHooksOptions) {
  const config = await readCodexHooks(hooksPath);
  const hooks = { ...(config.hooks ?? {}) };

  for (const eventName of HOOK_EVENTS) {
    const existingEntries = Array.isArray(hooks[eventName])
      ? removeProjectCHookCommands(hooks[eventName])
      : [];

    hooks[eventName] = appendHookCommand(
      existingEntries,
      createHookCommand(eventName, serverUrl),
    );
  }

  await writeCodexHooks(hooksPath, {
    ...config,
    hooks,
  });
  await enableCodexHooksFeature(configPath);
}

export async function uninstallCodexHooks({ hooksPath }: CodexHooksOptions) {
  const config = await readCodexHooks(hooksPath);
  const hooks = { ...(config.hooks ?? {}) };

  for (const eventName of HOOK_EVENTS) {
    const existingEntries = Array.isArray(hooks[eventName])
      ? hooks[eventName]
      : [];
    const remainingEntries = removeProjectCHookCommands(existingEntries);

    if (remainingEntries.length === 0) {
      delete hooks[eventName];
      continue;
    }

    hooks[eventName] = remainingEntries;
  }

  await writeCodexHooks(hooksPath, {
    ...config,
    hooks,
  });
}

function createHookCommand(
  eventName: CodexHookEvent,
  serverUrl: string,
): CodexHookCommand {
  const command = [
    `HOOKLUSION_CODEX_HOOK=${eventName}`,
    `HOOKLUSION_CODEX_HOOK_MARKER=${HOOKLUSION_MARKER}`,
    "sh -c",
    `'curl -fsS --max-time 1 -X POST "${serverUrl}" -H "content-type: application/json" -H "x-hooklusion-provider: codex" -H "x-hooklusion-host-pid: $PPID" --data-binary @- >/dev/null 2>&1 || true'`,
  ].join(" ");

  return { type: "command", command };
}

function appendHookCommand(entries: unknown[], hookCommand: CodexHookCommand) {
  const nextEntries: unknown[] = [];
  let appended = false;

  for (const entry of entries) {
    if (!isHookEntry(entry)) {
      nextEntries.push(entry);
      continue;
    }

    if (appended) {
      nextEntries.push(entry);
      continue;
    }

    nextEntries.push({
      ...entry,
      hooks: [...entry.hooks, hookCommand],
    });
    appended = true;
  }

  if (!appended) {
    nextEntries.push({ hooks: [hookCommand] });
  }

  return nextEntries as CodexHookEntry[];
}

function removeProjectCHookCommands(entries: unknown[]) {
  return entries.flatMap((entry) => {
    if (!isHookEntry(entry)) {
      return [entry as CodexHookEntry];
    }

    const hooks = entry.hooks.filter((hook) => !isProjectCHookCommand(hook));
    return hooks.length > 0 ? [{ ...entry, hooks }] : [];
  });
}

function isProjectCHookCommand(hook: CodexHookCommand) {
  return (
    hook.type === "command" &&
    [HOOKLUSION_MARKER, LEGACY_PROJECT_C_MARKER].some((marker) =>
      hook.command.includes(marker),
    )
  );
}

function isHookEntry(value: unknown): value is CodexHookEntry {
  if (typeof value !== "object" || value === null || !("hooks" in value)) {
    return false;
  }

  const hooks = (value as { hooks?: unknown }).hooks;
  return Array.isArray(hooks);
}

async function readCodexHooks(hooksPath: string): Promise<CodexHooksConfig> {
  try {
    return JSON.parse(await readFile(hooksPath, "utf8")) as CodexHooksConfig;
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return {};
    }

    throw error;
  }
}

async function writeCodexHooks(hooksPath: string, config: CodexHooksConfig) {
  await mkdir(dirname(hooksPath), { recursive: true });
  await writeFile(hooksPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function enableCodexHooksFeature(configPath: string) {
  const existingConfig = await readTextFileIfExists(configPath);
  const nextConfig = setTomlFeatureFlag(existingConfig, "codex_hooks", true);

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, nextConfig, "utf8");
}

function setTomlFeatureFlag(
  source: string,
  featureName: string,
  value: boolean,
) {
  const lines = source.length > 0 ? source.split("\n") : [];
  const featureHeaderIndex = lines.findIndex(
    (line) => line.trim() === "[features]",
  );
  const assignment = `${featureName} = ${value ? "true" : "false"}`;

  if (featureHeaderIndex === -1) {
    const prefix = source.trimEnd();
    return `${prefix}${prefix.length > 0 ? "\n\n" : ""}[features]\n${assignment}\n`;
  }

  let insertIndex = lines.length;

  for (let index = featureHeaderIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\s*\[[^\]]+\]\s*$/.test(line)) {
      insertIndex = index;
      break;
    }

    if (new RegExp(`^\\s*${escapeRegExp(featureName)}\\s*=`).test(line)) {
      lines[index] = assignment;
      return ensureTrailingNewline(lines.join("\n"));
    }
  }

  lines.splice(insertIndex, 0, assignment);
  return ensureTrailingNewline(lines.join("\n"));
}

async function readTextFileIfExists(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return "";
    }

    throw error;
  }
}

function ensureTrailingNewline(value: string) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
