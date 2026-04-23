import type { ProfileStateName } from "../../shared/animationProfile.js";
import type {
  PackStateName,
  TransientInteractionPackStateName,
} from "../../shared/packState.js";

export interface HeldTransientInteractionState {
  interactionState: TransientInteractionPackStateName;
  baseState: PackStateName;
}

export function shouldHoldTransientInteraction({
  interactionState,
  holdLastFrame,
  presentedState,
}: {
  interactionState: TransientInteractionPackStateName;
  holdLastFrame: boolean;
  presentedState: ProfileStateName;
}) {
  return holdLastFrame && presentedState === interactionState;
}

export function resolveHeldTransientInteractionState({
  heldInteraction,
  baseState,
  availableStates,
}: {
  heldInteraction: HeldTransientInteractionState | null;
  baseState: PackStateName;
  availableStates: readonly PackStateName[];
}): TransientInteractionPackStateName | null {
  if (heldInteraction === null) {
    return null;
  }

  if (heldInteraction.baseState !== baseState) {
    return null;
  }

  if (!availableStates.includes(heldInteraction.interactionState)) {
    return null;
  }

  return heldInteraction.interactionState;
}
