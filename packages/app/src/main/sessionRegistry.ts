import type {
  CharacterEvent,
  CharacterState,
} from "../../../server/src/characterEvent.js";
import {
  isManagedProjectScopedCwd,
  isManagedProjectScopedEvent,
} from "./projectScope.js";
import {
  createSessionKey,
  type SessionKey,
  type SessionProvider,
} from "./sessionKey.js";

export type SessionPolicyMode = "auto" | "pinned";

export interface SessionSummary {
  sessionKey: SessionKey;
  provider: SessionProvider;
  sessionId: string;
  state: CharacterState;
  providerState: string | null;
  turnId: string | null;
  cwd: string | null;
  pid: number | null;
  lastEventAt: number;
}

export interface SessionSelection {
  mode: SessionPolicyMode;
  activeSessionKey: SessionKey | null;
  pinnedSessionKey: SessionKey | null;
  shouldDisplayEvent: boolean;
}

interface CreateSessionRegistryOptions {
  projectRoots: string[];
  now?: () => number;
}

interface PruneSessionsOptions {
  isProcessAlive(pid: number): boolean;
  staleAfterDeadPidMs: number | null;
  staleWithoutPidAfterMs: number | null;
  prunedAt?: number;
}

interface PruneSessionsResult {
  removedSessionKeys: SessionKey[];
  selection: SessionSelection;
}

export function createSessionRegistry({
  projectRoots: initialProjectRoots,
  now = () => Date.now(),
}: CreateSessionRegistryOptions) {
  const sessions = new Map<SessionKey, SessionSummary>();
  let projectRoots = [...initialProjectRoots];
  let autoSessionKey: SessionKey | null = null;
  let displaySessionKey: SessionKey | null = null;
  let pinnedSessionKey: SessionKey | null = null;

  function getMode(): SessionPolicyMode {
    return pinnedSessionKey === null ? "auto" : "pinned";
  }

  function getActiveSessionKey() {
    return pinnedSessionKey ?? displaySessionKey ?? autoSessionKey;
  }

  function createSelection(shouldDisplayEvent: boolean): SessionSelection {
    return {
      mode: getMode(),
      activeSessionKey: getActiveSessionKey(),
      pinnedSessionKey,
      shouldDisplayEvent,
    };
  }

  function registerEvent(
    event: CharacterEvent,
    receivedAt = now(),
  ): SessionSelection {
    if (!isManagedProjectScopedEvent(event, projectRoots)) {
      return createSelection(false);
    }

    const sessionKey = createSessionKey(event.provider, event.sessionId);
    const existingSummary = sessions.get(sessionKey);
    const summary: SessionSummary = {
      sessionKey,
      provider: event.provider,
      sessionId: event.sessionId,
      state: event.canonicalStateHint,
      providerState: event.providerState,
      turnId: event.turnId,
      cwd: readEventCwd(event),
      pid: readEventPid(event) ?? existingSummary?.pid ?? null,
      lastEventAt: receivedAt,
    };

    sessions.set(sessionKey, summary);

    if (autoSessionKey === null) {
      autoSessionKey = sessionKey;
    } else if (pinnedSessionKey === null && event.event === "SessionStart") {
      autoSessionKey = sessionKey;
    }

    return createSelection(getActiveSessionKey() === sessionKey);
  }

  function pinSession(sessionKey: SessionKey): SessionSelection {
    pinnedSessionKey = sessionKey;
    return createSelection(true);
  }

  function selectSession(sessionKey: SessionKey): SessionSelection {
    displaySessionKey = sessionKey;
    return createSelection(true);
  }

  function unpinSession(): SessionSelection {
    pinnedSessionKey = null;
    return createSelection(true);
  }

  function listSessions() {
    return [...sessions.values()].sort(
      (left, right) => right.lastEventAt - left.lastEventAt,
    );
  }

  function getSelection() {
    return createSelection(false);
  }

  function setProjectRoots(nextProjectRoots: string[]) {
    projectRoots = [...nextProjectRoots];

    for (const [sessionKey, summary] of sessions.entries()) {
      if (
        summary.cwd === null ||
        !isManagedProjectScopedCwd(summary.cwd, projectRoots)
      ) {
        sessions.delete(sessionKey);
      }
    }

    if (pinnedSessionKey !== null && !sessions.has(pinnedSessionKey)) {
      pinnedSessionKey = null;
    }

    if (displaySessionKey !== null && !sessions.has(displaySessionKey)) {
      displaySessionKey = null;
    }

    if (autoSessionKey !== null && !sessions.has(autoSessionKey)) {
      autoSessionKey = listSessions()[0]?.sessionKey ?? null;
    }

    return getSelection();
  }

  function pruneSessions({
    isProcessAlive,
    staleAfterDeadPidMs,
    staleWithoutPidAfterMs,
    prunedAt = now(),
  }: PruneSessionsOptions): PruneSessionsResult {
    const removedSessionKeys: SessionKey[] = [];

    for (const [sessionKey, summary] of sessions.entries()) {
      const shouldRemove =
        summary.pid !== null
          ? !isProcessAlive(summary.pid) &&
            staleAfterDeadPidMs !== null &&
            prunedAt - summary.lastEventAt >= staleAfterDeadPidMs
          : staleWithoutPidAfterMs !== null &&
            prunedAt - summary.lastEventAt >= staleWithoutPidAfterMs;

      if (!shouldRemove) {
        continue;
      }

      sessions.delete(sessionKey);
      removedSessionKeys.push(sessionKey);
    }

    if (removedSessionKeys.length === 0) {
      return {
        removedSessionKeys,
        selection: getSelection(),
      };
    }

    if (pinnedSessionKey !== null && !sessions.has(pinnedSessionKey)) {
      pinnedSessionKey = null;
    }

    if (displaySessionKey !== null && !sessions.has(displaySessionKey)) {
      displaySessionKey = null;
    }

    if (autoSessionKey !== null && !sessions.has(autoSessionKey)) {
      autoSessionKey = listSessions()[0]?.sessionKey ?? null;
    }

    return {
      removedSessionKeys,
      selection: getSelection(),
    };
  }

  return {
    registerEvent,
    getSelection,
    pinSession,
    selectSession,
    unpinSession,
    listSessions,
    pruneSessions,
    setProjectRoots,
  };
}

function readEventCwd(event: CharacterEvent) {
  if (typeof event.raw !== "object" || event.raw === null) {
    return null;
  }

  const cwd = (event.raw as { cwd?: unknown }).cwd;
  return typeof cwd === "string" ? cwd : null;
}

function readEventPid(event: CharacterEvent) {
  if (typeof event.raw !== "object" || event.raw === null) {
    return null;
  }

  const pid = (event.raw as { project_c_pid?: unknown }).project_c_pid;
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}
