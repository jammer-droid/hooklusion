export type CharacterState =
  | "idle"
  | "session_start"
  | "prompt_received"
  | "tool_active"
  | "thinking"
  | "done";

interface CharacterEventBase {
  provider: "claude" | "codex";
  sessionId: string;
  turnId: string | null;
  canonicalStateHint: CharacterState;
  providerState: string | null;
  raw: unknown;
}

interface CharacterSessionStartEvent extends CharacterEventBase {
  event: "SessionStart";
  providerState: null;
}

interface CharacterUserPromptSubmitEvent extends CharacterEventBase {
  event: "UserPromptSubmit";
  providerState: null;
}

interface CharacterPreToolUseEvent extends CharacterEventBase {
  event: "PreToolUse";
  toolName: string;
}

interface CharacterPostToolUseEvent extends CharacterEventBase {
  event: "PostToolUse";
  toolName: string;
  ok: boolean;
}

interface CharacterStopEvent extends CharacterEventBase {
  event: "Stop";
  providerState: null;
  ok: boolean;
}

export type CharacterEvent =
  | CharacterSessionStartEvent
  | CharacterUserPromptSubmitEvent
  | CharacterPreToolUseEvent
  | CharacterPostToolUseEvent
  | CharacterStopEvent;
