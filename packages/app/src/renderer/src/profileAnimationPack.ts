import {
  type AnimationProfile,
  deriveAnimationDurations,
  PROFILE_TRANSITION_ANIMATION_NAMES,
  validateAnimationProfile,
} from "../../shared/animationProfile.js";
import {
  CANONICAL_PACK_STATES,
  EXTENDED_TOOL_PACK_STATES,
  INTERACTION_PACK_STATES,
  isTransientInteractionPackState,
  type PackStateName,
} from "../../shared/packState.js";
import type {
  AnimationDefinition,
  AnimationPack,
  AnimationStateName,
} from "./animationPack.js";
import { materializeProfileFramePath } from "./profileFramePath.js";

export interface CreateAnimationPackFromProfileOptions {
  resolveFrameUrl?: (framePath: string) => string;
}

export function createAnimationPackFromProfile(
  profile: AnimationProfile,
  options: CreateAnimationPackFromProfileOptions = {},
): AnimationPack {
  const validProfile = validateAnimationProfile(profile);
  const states: Partial<Record<AnimationStateName, AnimationDefinition>> = {};

  for (const stateName of CANONICAL_PACK_STATES) {
    states[stateName] = createAnimationDefinition(
      validProfile,
      stateName,
      options,
    );
  }

  for (const stateName of EXTENDED_TOOL_PACK_STATES) {
    if (validProfile.states[stateName] === undefined) {
      continue;
    }

    states[stateName] = createAnimationDefinition(
      validProfile,
      stateName,
      options,
    );
  }

  for (const stateName of INTERACTION_PACK_STATES) {
    if (validProfile.states[stateName] === undefined) {
      continue;
    }

    states[stateName] = createAnimationDefinition(
      validProfile,
      stateName,
      options,
    );
  }

  return {
    name: validProfile.name,
    states,
    transitions: Object.fromEntries(
      PROFILE_TRANSITION_ANIMATION_NAMES.flatMap((animationName) =>
        validProfile.animations[animationName] === undefined
          ? []
          : [
              [
                animationName,
                createAnimationDefinitionFromAnimation(
                  validProfile,
                  validProfile.animations[animationName],
                  options,
                ),
              ],
            ],
      ),
    ),
  };
}

function createAnimationDefinition(
  profile: AnimationProfile,
  stateName: PackStateName,
  options: CreateAnimationPackFromProfileOptions,
): AnimationDefinition {
  const mapping = profile.states[stateName];

  if (mapping === undefined) {
    throw new Error(
      `Animation profile ${profile.name} cannot resolve ${stateName}.`,
    );
  }

  const animation = profile.animations[mapping.animation];

  if (animation === undefined) {
    throw new Error(
      `Animation state ${stateName} references missing animation ${mapping.animation}.`,
    );
  }

  return {
    ...createAnimationDefinitionFromAnimation(profile, animation, options),
    ...(isTransientInteractionPackState(stateName) ? { loop: false } : {}),
  };
}

function createAnimationDefinitionFromAnimation(
  profile: AnimationProfile,
  animation: AnimationProfile["animations"][string],
  options: CreateAnimationPackFromProfileOptions,
): AnimationDefinition {
  return {
    frames: animation.frames.map((frame) =>
      materializeFramePath(profile, frame, options),
    ),
    durationsMs: deriveAnimationDurations(animation),
    loop: animation.loop,
    transitionMs: animation.transitionMs,
  };
}

function materializeFramePath(
  profile: AnimationProfile,
  frame: string,
  options: CreateAnimationPackFromProfileOptions,
) {
  return materializeProfileFramePath(profile, frame, options);
}
