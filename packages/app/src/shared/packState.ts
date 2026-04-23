export type CanonicalPackStateName =
  | "idle"
  | "session_start"
  | "prompt_received"
  | "thinking"
  | "tool_active"
  | "done";

export type ExtendedToolPackStateName =
  | "tool_read"
  | "tool_search"
  | "tool_explore"
  | "tool_web"
  | "tool_vcs_read"
  | "tool_vcs_write"
  | "tool_test"
  | "tool_build"
  | "tool_bash";

export type TransientInteractionPackStateName =
  | "hover_in"
  | "hover_out"
  | "click";

export type DirectionalDragInteractionPackStateName =
  | "drag_up"
  | "drag_down"
  | "drag_left"
  | "drag_right";

export type DragInteractionPackStateName =
  | "drag"
  | DirectionalDragInteractionPackStateName;

export type InteractionPackStateName =
  | TransientInteractionPackStateName
  | DragInteractionPackStateName;

export type PackStateName =
  | CanonicalPackStateName
  | ExtendedToolPackStateName
  | InteractionPackStateName;

export const CANONICAL_PACK_STATES: CanonicalPackStateName[] = [
  "idle",
  "session_start",
  "prompt_received",
  "thinking",
  "tool_active",
  "done",
];

export const EXTENDED_TOOL_PACK_STATES: ExtendedToolPackStateName[] = [
  "tool_read",
  "tool_search",
  "tool_explore",
  "tool_web",
  "tool_vcs_read",
  "tool_vcs_write",
  "tool_test",
  "tool_build",
  "tool_bash",
];

export const INTERACTION_PACK_STATES: InteractionPackStateName[] = [
  "hover_in",
  "hover_out",
  "drag",
  "drag_up",
  "drag_down",
  "drag_left",
  "drag_right",
  "click",
];

export const TRANSIENT_INTERACTION_PACK_STATES: TransientInteractionPackStateName[] =
  ["hover_in", "hover_out", "click"];

export const PACK_STATE_NAMES: PackStateName[] = [
  ...CANONICAL_PACK_STATES,
  ...EXTENDED_TOOL_PACK_STATES,
  ...INTERACTION_PACK_STATES,
];

const PROVIDER_STATE_TO_PACK_STATE: Record<string, ExtendedToolPackStateName> =
  {
    "tool:build": "tool_build",
    "tool:explore": "tool_explore",
    "tool:read": "tool_read",
    "tool:search": "tool_search",
    "tool:test": "tool_test",
    "tool:vcs_read": "tool_vcs_read",
    "tool:vcs_write": "tool_vcs_write",
    "tool:web": "tool_web",
  };

export interface ResolvePackStateOptions {
  state: CanonicalPackStateName;
  providerState: string | null;
  availableStates: readonly PackStateName[];
}

export function mapProviderStateToPackState(
  providerState: string | null,
): ExtendedToolPackStateName | null {
  if (providerState === null) {
    return null;
  }

  return PROVIDER_STATE_TO_PACK_STATE[providerState] ?? null;
}

export function isInteractionPackState(
  state: PackStateName,
): state is InteractionPackStateName {
  return INTERACTION_PACK_STATES.includes(state as InteractionPackStateName);
}

export function isTransientInteractionPackState(
  state: PackStateName,
): state is TransientInteractionPackStateName {
  return TRANSIENT_INTERACTION_PACK_STATES.includes(
    state as TransientInteractionPackStateName,
  );
}

export function resolvePackState({
  state,
  providerState,
  availableStates,
}: ResolvePackStateOptions): PackStateName {
  const available = new Set(availableStates);

  for (const candidate of buildPackStateCandidates(state, providerState)) {
    if (available.has(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not resolve a pack state for ${state}.`);
}

function buildPackStateCandidates(
  state: CanonicalPackStateName,
  providerState: string | null,
): PackStateName[] {
  if (state !== "tool_active" && state !== "thinking") {
    return [state];
  }

  const specificState = mapProviderStateToPackState(providerState);
  const candidates: PackStateName[] = [];

  if (specificState !== null) {
    candidates.push(specificState);
  }

  if (state === "tool_active") {
    candidates.push("tool_active", "thinking");
    return candidates;
  }

  candidates.push("thinking", "tool_active");
  return candidates;
}
