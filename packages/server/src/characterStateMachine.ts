import type { CharacterEvent, CharacterState } from "./characterEvent.js";

const DEFAULT_TRANSIENT_STATE_DURATION_MS = 800;
const TRANSIENT_STATES = new Set<CharacterState>([]);

export interface CharacterSnapshot {
  provider: CharacterEvent["provider"] | null;
  sessionId: string | null;
  turnId: string | null;
  state: CharacterState;
  providerState: string | null;
}

export interface CreateCharacterStateMachineOptions {
  transientStateDurationMs?: number;
  onTransition?: (snapshot: CharacterSnapshot) => void;
}

interface SessionRuntime {
  activeTurnId: string | null;
  snapshot: CharacterSnapshot;
  timer: ReturnType<typeof setTimeout> | null;
}

const EMPTY_SNAPSHOT: CharacterSnapshot = {
  provider: null,
  sessionId: null,
  turnId: null,
  state: "idle",
  providerState: null,
};

export function createCharacterStateMachine(
  options: CreateCharacterStateMachineOptions = {},
) {
  const transientStateDurationMs =
    options.transientStateDurationMs ?? DEFAULT_TRANSIENT_STATE_DURATION_MS;
  const onTransition = options.onTransition;
  const sessions = new Map<string, SessionRuntime>();
  let activeSessionId: string | null = null;

  function emitTransition(snapshot: CharacterSnapshot) {
    onTransition?.({ ...snapshot });
  }

  function getSession(sessionId: string): SessionRuntime {
    const existing = sessions.get(sessionId);

    if (existing !== undefined) {
      return existing;
    }

    const created: SessionRuntime = {
      activeTurnId: null,
      snapshot: {
        ...EMPTY_SNAPSHOT,
        sessionId,
      },
      timer: null,
    };

    sessions.set(sessionId, created);
    return created;
  }

  function clearSessionTimer(session: SessionRuntime) {
    if (session.timer !== null) {
      clearTimeout(session.timer);
      session.timer = null;
    }
  }

  function scheduleTransientReturn(
    sessionId: string,
    expectedTurnId: string | null,
  ) {
    const session = sessions.get(sessionId);

    if (session === undefined) {
      return;
    }

    session.timer = setTimeout(() => {
      const current = sessions.get(sessionId);

      if (current === undefined) {
        return;
      }

      current.timer = null;

      if (expectedTurnId !== null && current.activeTurnId !== expectedTurnId) {
        return;
      }

      current.snapshot = {
        ...current.snapshot,
        state: "idle",
        providerState: null,
      };
      emitTransition(current.snapshot);
    }, transientStateDurationMs);
  }

  function shouldAcceptEvent(
    session: SessionRuntime,
    event: CharacterEvent,
  ): boolean {
    if (event.turnId === null) {
      return true;
    }

    if (
      session.activeTurnId === null ||
      session.activeTurnId === event.turnId
    ) {
      return true;
    }

    return event.event === "UserPromptSubmit";
  }

  function dispatch(event: CharacterEvent): CharacterSnapshot {
    const session = getSession(event.sessionId);

    if (!shouldAcceptEvent(session, event)) {
      return getSnapshot();
    }

    clearSessionTimer(session);

    if (event.turnId !== null) {
      session.activeTurnId = event.turnId;
    }

    session.snapshot = {
      provider: event.provider,
      sessionId: event.sessionId,
      turnId: event.turnId ?? session.activeTurnId,
      state: event.canonicalStateHint,
      providerState: event.providerState,
    };

    activeSessionId = event.sessionId;

    if (TRANSIENT_STATES.has(event.canonicalStateHint)) {
      scheduleTransientReturn(event.sessionId, session.activeTurnId);
    }

    emitTransition(session.snapshot);

    return { ...session.snapshot };
  }

  function getSnapshot(
    sessionId: string | null = activeSessionId,
  ): CharacterSnapshot {
    if (sessionId === null) {
      return { ...EMPTY_SNAPSHOT };
    }

    const session = sessions.get(sessionId);

    if (session === undefined) {
      return { ...EMPTY_SNAPSHOT };
    }

    return { ...session.snapshot };
  }

  function dispose() {
    for (const session of sessions.values()) {
      clearSessionTimer(session);
    }
  }

  return {
    dispatch,
    getSnapshot,
    dispose,
  };
}
