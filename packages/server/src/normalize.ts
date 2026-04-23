import type { CharacterEvent } from "./characterEvent.js";
import { normalizeClaudeEvent } from "./providers/claude.js";
import { normalizeCodexEvent } from "./providers/codex.js";

export interface NormalizeEventInput {
  provider: string;
  payload: unknown;
}

export function normalizeEvent({
  provider,
  payload,
}: NormalizeEventInput): CharacterEvent | null {
  switch (provider) {
    case "claude": {
      const event = normalizeClaudeEvent(payload);

      if (event === null) {
        console.warn("[hooklusion/server] unsupported claude event");
      }

      return event;
    }
    case "codex": {
      const event = normalizeCodexEvent(payload);

      if (event === null) {
        console.warn("[hooklusion/server] unsupported codex event");
      }

      return event;
    }
    default:
      console.warn("[hooklusion/server] unsupported event provider", provider);
      return null;
  }
}
