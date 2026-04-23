import type { CharacterDesktopSnapshot } from "../../shared/characterDesktop.js";
import {
  type PackStateName,
  resolvePackState,
} from "../../shared/packState.js";

export function resolveSnapshotPackState(
  snapshot: CharacterDesktopSnapshot,
  availableStates: readonly PackStateName[],
) {
  return resolvePackState({
    state: snapshot.state,
    providerState: snapshot.providerState,
    availableStates,
  });
}
