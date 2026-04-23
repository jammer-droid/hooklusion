import type { CharacterSnapshot } from "./characterStateMachine.js";

export function formatCharacterSnapshot(snapshot: CharacterSnapshot): string {
  const parts = [
    "[hooklusion/server] character",
    `session=${snapshot.sessionId ?? "null"}`,
    `turn=${snapshot.turnId ?? "null"}`,
    `state=${snapshot.state}`,
  ];

  if (snapshot.providerState !== null) {
    parts.push(`providerState=${snapshot.providerState}`);
  }

  return parts.join(" ");
}

export function reportCharacterSnapshot(snapshot: CharacterSnapshot) {
  console.log(formatCharacterSnapshot(snapshot));
}
