import { basename } from "node:path";
import type {
  CharacterEvent,
  CharacterState,
} from "../../../server/src/characterEvent.js";

export type SessionProvider = CharacterEvent["provider"];
export type SessionKey = `${SessionProvider}:${string}`;

export interface ParsedSessionKey {
  provider: SessionProvider;
  sessionId: string;
}

export interface SessionLabelInput extends ParsedSessionKey {
  state: CharacterState;
  cwd: string | null;
}

export function createSessionKey(
  provider: SessionProvider,
  sessionId: string,
): SessionKey {
  return `${provider}:${sessionId}`;
}

export function parseSessionKey(sessionKey: string): ParsedSessionKey | null {
  const parts = sessionKey.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const [provider, sessionId] = parts;

  if (!isSessionProvider(provider) || sessionId.length === 0) {
    return null;
  }

  return { provider, sessionId };
}

export function formatSessionLabel({
  provider,
  sessionId,
  state,
  cwd,
}: SessionLabelInput) {
  return `${formatSessionAlias(cwd)} · ${formatProviderLabel(
    provider,
  )} · ${formatShortSessionId(sessionId)} · ${state}`;
}

function isSessionProvider(value: string): value is SessionProvider {
  return value === "claude" || value === "codex";
}

function formatProviderLabel(provider: SessionProvider) {
  return provider === "claude" ? "Claude" : "Codex";
}

function formatShortSessionId(sessionId: string) {
  if (sessionId.length <= 12) {
    return sessionId;
  }

  return sessionId.slice(0, 8);
}

function formatSessionAlias(cwd: string | null) {
  if (cwd === null) {
    return "Unknown Project";
  }

  const alias = basename(cwd);
  return alias.length > 0 ? alias : cwd;
}
