import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const HOOKLUSION_MARKER = "hooklusion-claude-hook";
const LEGACY_PROJECT_C_MARKER = "project-c-claude-hook";
const DEFAULT_SERVER_URL = "http://127.0.0.1:47321/event";

type ClaudeHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "Stop";

interface ClaudeHookCommand {
  type: "command";
  command: string;
}

interface ClaudeHookMatcher {
  matcher?: string;
  hooks: ClaudeHookCommand[];
}

interface ClaudeSettings {
  hooks?: Partial<Record<ClaudeHookEvent, ClaudeHookMatcher[]>> &
    Record<string, unknown>;
  [key: string]: unknown;
}

interface ClaudeHooksOptions {
  settingsPath: string;
  serverUrl?: string;
}

const HOOK_EVENTS: ClaudeHookEvent[] = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
];

export async function installClaudeHooks({
  settingsPath,
  serverUrl = DEFAULT_SERVER_URL,
}: ClaudeHooksOptions) {
  const settings = await readClaudeSettings(settingsPath);
  const hooks = { ...(settings.hooks ?? {}) };

  for (const eventName of HOOK_EVENTS) {
    const existingEntries = Array.isArray(hooks[eventName])
      ? [...hooks[eventName]]
      : [];
    const projectCEntry = createHookEntry(eventName, serverUrl);

    hooks[eventName] = [
      ...existingEntries.filter((entry) => !isProjectCHookEntry(entry)),
      projectCEntry,
    ];
  }

  await writeClaudeSettings(settingsPath, {
    ...settings,
    hooks,
  });
}

export async function uninstallClaudeHooks({
  settingsPath,
}: ClaudeHooksOptions) {
  const settings = await readClaudeSettings(settingsPath);
  const hooks = { ...(settings.hooks ?? {}) };

  for (const eventName of HOOK_EVENTS) {
    const existingEntries = Array.isArray(hooks[eventName])
      ? [...hooks[eventName]]
      : [];
    const remainingEntries = existingEntries.filter(
      (entry) => !isProjectCHookEntry(entry),
    );

    if (remainingEntries.length === 0) {
      delete hooks[eventName];
      continue;
    }

    hooks[eventName] = remainingEntries;
  }

  await writeClaudeSettings(settingsPath, {
    ...settings,
    hooks,
  });
}

function createHookEntry(
  eventName: ClaudeHookEvent,
  serverUrl: string,
): ClaudeHookMatcher {
  const command = [
    `HOOKLUSION_CLAUDE_HOOK=${eventName}`,
    `HOOKLUSION_CLAUDE_HOOK_MARKER=${HOOKLUSION_MARKER}`,
    "sh -c",
    `'curl -fsS --max-time 1 -X POST "${serverUrl}" -H "content-type: application/json" -H "x-hooklusion-host-pid: $PPID" --data-binary @- >/dev/null 2>&1 || true'`,
  ].join(" ");

  if (eventName === "PreToolUse" || eventName === "PostToolUse") {
    return {
      matcher: "*",
      hooks: [{ type: "command", command }],
    };
  }

  return {
    hooks: [{ type: "command", command }],
  };
}

function isProjectCHookEntry(entry: unknown): entry is ClaudeHookMatcher {
  if (!isHookMatcher(entry)) {
    return false;
  }

  return entry.hooks.some(
    (hook) =>
      hook.type === "command" &&
      [HOOKLUSION_MARKER, LEGACY_PROJECT_C_MARKER].some((marker) =>
        hook.command.includes(marker),
      ),
  );
}

function isHookMatcher(value: unknown): value is ClaudeHookMatcher {
  if (typeof value !== "object" || value === null || !("hooks" in value)) {
    return false;
  }

  const hooks = (value as { hooks?: unknown }).hooks;
  return Array.isArray(hooks);
}

async function readClaudeSettings(
  settingsPath: string,
): Promise<ClaudeSettings> {
  try {
    return JSON.parse(await readFile(settingsPath, "utf8")) as ClaudeSettings;
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return {};
    }

    throw error;
  }
}

async function writeClaudeSettings(
  settingsPath: string,
  settings: ClaudeSettings,
) {
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(
    settingsPath,
    `${JSON.stringify(settings, null, 2)}\n`,
    "utf8",
  );
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
