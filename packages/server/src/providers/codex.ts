import type { CharacterEvent } from "../characterEvent.js";
import {
  classifyBashProviderState,
  resolveNonBashProviderState,
} from "./toolProviderState.js";

type CodexHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "Stop";

type RawCodexPayload = Record<string, unknown> & {
  hook_event_name?: unknown;
  session_id?: unknown;
  turn_id?: unknown;
  tool_name?: unknown;
  tool_input?: unknown;
};

export function normalizeCodexEvent(payload: unknown): CharacterEvent | null {
  if (!isRecord(payload)) {
    return null;
  }

  const eventName = readString(payload.hook_event_name);
  const sessionId = readString(payload.session_id);

  if (eventName === null || sessionId === null) {
    return null;
  }

  const turnId = readOptionalString(payload.turn_id);

  switch (eventName as CodexHookEvent) {
    case "SessionStart":
      return normalizeSessionStart(payload, sessionId, turnId);
    case "UserPromptSubmit":
      return normalizeUserPromptSubmit(payload, sessionId, turnId);
    case "PreToolUse":
      return normalizePreToolUse(payload, sessionId, turnId);
    case "PostToolUse":
      return normalizePostToolUse(payload, sessionId, turnId);
    case "Stop":
      return normalizeStop(payload, sessionId, turnId);
    default:
      return null;
  }
}

function normalizeSessionStart(
  payload: RawCodexPayload,
  sessionId: string,
  turnId: string | null,
): CharacterEvent {
  return {
    provider: "codex",
    sessionId,
    turnId,
    event: "SessionStart",
    canonicalStateHint: "session_start",
    providerState: null,
    raw: payload,
  };
}

function normalizeUserPromptSubmit(
  payload: RawCodexPayload,
  sessionId: string,
  turnId: string | null,
): CharacterEvent {
  return {
    provider: "codex",
    sessionId,
    turnId,
    event: "UserPromptSubmit",
    canonicalStateHint: "prompt_received",
    providerState: null,
    raw: payload,
  };
}

function normalizePreToolUse(
  payload: RawCodexPayload,
  sessionId: string,
  turnId: string | null,
): CharacterEvent | null {
  const toolName = readString(payload.tool_name);

  if (toolName === null) {
    return null;
  }

  return {
    provider: "codex",
    sessionId,
    turnId,
    event: "PreToolUse",
    canonicalStateHint: "tool_active",
    toolName,
    providerState:
      toolName === "Bash"
        ? classifyBashProviderState(payload.tool_input)
        : resolveNonBashProviderState(toolName),
    raw: payload,
  };
}

function normalizePostToolUse(
  payload: RawCodexPayload,
  sessionId: string,
  turnId: string | null,
): CharacterEvent | null {
  const toolName = readString(payload.tool_name);

  if (toolName === null) {
    return null;
  }

  return {
    provider: "codex",
    sessionId,
    turnId,
    event: "PostToolUse",
    canonicalStateHint: "thinking",
    toolName,
    providerState:
      toolName === "Bash"
        ? classifyBashProviderState(payload.tool_input)
        : resolveNonBashProviderState(toolName),
    ok: true,
    raw: payload,
  };
}

function normalizeStop(
  payload: RawCodexPayload,
  sessionId: string,
  turnId: string | null,
): CharacterEvent {
  return {
    provider: "codex",
    sessionId,
    turnId,
    event: "Stop",
    canonicalStateHint: "done",
    providerState: null,
    ok: true,
    raw: payload,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
