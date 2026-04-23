import type { CharacterEvent } from "../../../server/src/characterEvent.js";
import type { SessionKey } from "./sessionKey.js";
import type { createSessionRegistry } from "./sessionRegistry.js";

type SessionRegistry = ReturnType<typeof createSessionRegistry>;

export function routeLiveCharacterEvent(
  registry: SessionRegistry,
  event: CharacterEvent,
  dispatchEvent: (event: CharacterEvent) => void,
) {
  const selection = registry.registerEvent(event);

  if (!selection.shouldDisplayEvent || selection.activeSessionKey === null) {
    return false;
  }

  dispatchEvent(withDisplaySessionKey(event, selection.activeSessionKey));
  return true;
}

function withDisplaySessionKey(
  event: CharacterEvent,
  sessionKey: SessionKey,
): CharacterEvent {
  return {
    ...event,
    sessionId: sessionKey,
  };
}
