import type { AnimationProfile } from "../../shared/animationProfile.js";
import type { CharacterDesktopSnapshot } from "../../shared/characterDesktop.js";
import type {
  DragInteractionPackStateName,
  InteractionPackStateName,
  PackStateName,
  TransientInteractionPackStateName,
} from "../../shared/packState.js";
import { resolveSnapshotPackState } from "./rendererPackState.js";

export interface ResolvePresentedPackStateOptions {
  snapshot: CharacterDesktopSnapshot;
  interactionState: InteractionPackStateName | null;
  profile: AnimationProfile;
  availableStates: readonly PackStateName[];
  focused?: boolean;
}

export function resolvePresentedPackState({
  snapshot,
  interactionState,
  profile,
  availableStates,
  focused = true,
}: ResolvePresentedPackStateOptions): PackStateName {
  const baseState = resolveSnapshotPackState(snapshot, availableStates);
  const baseStateInterruptible =
    profile.states[baseState]?.interruptible !== false;

  if (interactionState === null) {
    return baseState;
  }

  if (!availableStates.includes(interactionState)) {
    return baseState;
  }

  if (!focused && isDragInteractionState(interactionState)) {
    return baseState;
  }

  if (
    isHookActivityVisible(snapshot) &&
    (!baseStateInterruptible ||
      !allowsDuringHookActivity(profile, interactionState))
  ) {
    return baseState;
  }

  return interactionState;
}

export function readInteractionAnimationDurationMs(
  profile: AnimationProfile,
  interactionState: TransientInteractionPackStateName,
): number | null {
  const animationName = profile.states[interactionState]?.animation;

  if (animationName === undefined) {
    return null;
  }

  const animation = profile.animations[animationName];

  if (animation === undefined) {
    return null;
  }

  return animation.totalDurationMs;
}

function allowsDuringHookActivity(
  profile: AnimationProfile,
  interactionState: InteractionPackStateName,
) {
  return profile.states[interactionState]?.allowDuringHookActivity === true;
}

function isHookActivityVisible(snapshot: CharacterDesktopSnapshot) {
  return snapshot.state !== "idle";
}

function isDragInteractionState(
  interactionState: InteractionPackStateName,
): interactionState is DragInteractionPackStateName {
  return (
    interactionState === "drag" ||
    interactionState === "drag_up" ||
    interactionState === "drag_down" ||
    interactionState === "drag_left" ||
    interactionState === "drag_right"
  );
}
