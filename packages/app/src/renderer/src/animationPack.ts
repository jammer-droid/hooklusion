import type { ProfileTransitionAnimationName } from "../../shared/animationProfile.js";
import type { PackStateName } from "../../shared/packState.js";

export type AnimationStateName = PackStateName;

export interface AnimationDefinition {
  frames: string[];
  durationsMs: number[];
  loop: boolean;
  transitionMs: number;
}

export interface AnimationPack {
  name: string;
  states: Partial<Record<AnimationStateName, AnimationDefinition>>;
  transitions?: Partial<
    Record<ProfileTransitionAnimationName, AnimationDefinition>
  >;
}

export function validateAnimationPack(pack: AnimationPack): AnimationPack {
  for (const [stateName, definition] of Object.entries({
    ...pack.states,
    ...pack.transitions,
  })) {
    if (definition === undefined) {
      continue;
    }

    if (definition.frames.length === 0) {
      throw new Error(
        `Animation state ${stateName} must define at least one frame.`,
      );
    }

    if (definition.frames.length !== definition.durationsMs.length) {
      throw new Error(
        `Animation state ${stateName} must define the same number of frames and durations.`,
      );
    }

    for (const durationMs of definition.durationsMs) {
      if (!Number.isInteger(durationMs) || durationMs <= 0) {
        throw new Error(
          `Animation state ${stateName} must use positive integer frame durations.`,
        );
      }
    }

    if (
      !Number.isInteger(definition.transitionMs) ||
      definition.transitionMs < 0
    ) {
      throw new Error(
        `Animation state ${stateName} must use a non-negative integer transition.`,
      );
    }
  }

  return pack;
}

export function resolveAnimationState(
  pack: AnimationPack,
  requestedState: AnimationStateName,
): AnimationStateName {
  if (pack.states[requestedState] !== undefined) {
    return requestedState;
  }

  throw new Error(
    `Animation pack ${pack.name} does not define state ${requestedState}.`,
  );
}
