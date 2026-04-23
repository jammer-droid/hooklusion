import { CANONICAL_PACK_STATES, type PackStateName } from "./packState.js";

export type ProfileStateName = PackStateName;
export type SpriteSetSourceType = "directory" | "zip";
export type SpriteSetApplyMode =
  | "create_profile"
  | "replace_profile"
  | "replace_states";
export type ProfilePackageSourceType = "directory" | "zip";
export type ProfilePackageImportMode = "create_profile" | "replace_profile";
export type ProfilePackageExportFormat = "directory" | "zip";
export type ProfileTransitionAnimationName = "transition_in" | "transition_out";

export const PROFILE_TRANSITION_IN_ANIMATION = "transition_in";
export const PROFILE_TRANSITION_OUT_ANIMATION = "transition_out";
export const PROFILE_TRANSITION_ANIMATION_NAMES = [
  PROFILE_TRANSITION_IN_ANIMATION,
  PROFILE_TRANSITION_OUT_ANIMATION,
] as const;

export interface ProfileAnimation {
  frames: string[];
  totalDurationMs: number;
  frameWeights: number[];
  loop: boolean;
  transitionMs: number;
}

export interface ProfileStateMapping {
  animation: string;
  minDwellMs?: number;
  minCycles?: number;
  interruptible?: boolean;
  allowDuringHookActivity?: boolean;
  holdLastFrame?: boolean;
}

export interface AnimationProfile {
  schemaVersion: 1;
  assetSchemaVersion?: 1 | 2 | 3 | 4;
  id: string;
  name: string;
  spriteRoot: string;
  presentation?: {
    floatingMotion?: boolean;
  };
  animations: Record<string, ProfileAnimation>;
  states: Partial<Record<ProfileStateName, ProfileStateMapping>>;
}

export interface SpriteSetImportRequest {
  sourcePath: string;
  sourceType: SpriteSetSourceType;
  applyMode: SpriteSetApplyMode;
  targetProfileId: string;
  targetProfileName?: string;
  replaceStates?: ProfileStateName[];
}

export interface ProfilePackageImportRequest {
  sourcePath: string;
  sourceType: ProfilePackageSourceType;
  applyMode: ProfilePackageImportMode;
  targetProfileId?: string;
  targetProfileName?: string;
}

export interface ProfilePackageExportRequest {
  profileId: string;
  destinationPath: string;
  format: ProfilePackageExportFormat;
}

export function isFloatingMotionEnabled(profile: AnimationProfile) {
  return profile.presentation?.floatingMotion ?? true;
}

export function validateAnimationProfile(
  profile: AnimationProfile,
): AnimationProfile {
  for (const stateName of CANONICAL_PACK_STATES) {
    if (profile.states[stateName] === undefined) {
      throw new Error(
        `Animation profile ${profile.name} must define canonical state ${stateName}.`,
      );
    }
  }

  for (const [animationName, animation] of Object.entries(profile.animations)) {
    validateProfileAnimation(animationName, animation);
  }

  for (const [stateName, mapping] of Object.entries(profile.states)) {
    if (mapping === undefined) {
      continue;
    }

    if (profile.animations[mapping.animation] === undefined) {
      throw new Error(
        `Animation state ${stateName} references missing animation ${mapping.animation}.`,
      );
    }

    validateNonNegativeInteger(stateName, "minDwellMs", mapping.minDwellMs);
    validateNonNegativeInteger(stateName, "minCycles", mapping.minCycles);
    validateOptionalBoolean(
      stateName,
      "allowDuringHookActivity",
      mapping.allowDuringHookActivity,
    );
    validateOptionalBoolean(stateName, "holdLastFrame", mapping.holdLastFrame);
  }

  return profile;
}

export function deriveAnimationDurations(
  animation: ProfileAnimation,
): number[] {
  const directDurations = distributeDurations(
    animation.totalDurationMs,
    animation.frameWeights,
  );

  if (directDurations.every((duration) => duration > 0)) {
    return directDurations;
  }

  const durations = Array.from({ length: animation.frames.length }, () => 1);
  const remainingDuration = animation.totalDurationMs - animation.frames.length;

  if (remainingDuration === 0) {
    return durations;
  }

  const extraDurations = distributeDurations(
    remainingDuration,
    animation.frameWeights,
  );

  return durations.map((duration, index) => duration + extraDurations[index]);
}

function distributeDurations(
  totalDurationMs: number,
  frameWeights: number[],
): number[] {
  const totalWeight = frameWeights.reduce((sum, weight) => sum + weight, 0);
  const durations = frameWeights.map((weight) =>
    Math.floor((totalDurationMs * weight) / totalWeight),
  );
  let remainder =
    totalDurationMs - durations.reduce((sum, value) => sum + value, 0);

  for (let index = 0; remainder > 0; index = (index + 1) % durations.length) {
    durations[index] += 1;
    remainder -= 1;
  }

  return durations;
}

function validateProfileAnimation(
  animationName: string,
  animation: ProfileAnimation,
) {
  if (animation.frames.length === 0) {
    throw new Error(
      `Animation ${animationName} must define at least one frame.`,
    );
  }

  if (animation.frames.length !== animation.frameWeights.length) {
    throw new Error(
      `Animation ${animationName} must define one frame weight per frame.`,
    );
  }

  if (
    !Number.isInteger(animation.totalDurationMs) ||
    animation.totalDurationMs <= 0
  ) {
    throw new Error(
      `Animation ${animationName} must use a positive total duration.`,
    );
  }

  if (animation.totalDurationMs < animation.frames.length) {
    throw new Error(
      `Animation ${animationName} must use a total duration of at least ${animation.frames.length}.`,
    );
  }

  for (const weight of animation.frameWeights) {
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(
        `Animation ${animationName} must use positive frame weights.`,
      );
    }
  }

  if (!Number.isInteger(animation.transitionMs) || animation.transitionMs < 0) {
    throw new Error(
      `Animation ${animationName} must use a non-negative transition.`,
    );
  }
}

function validateNonNegativeInteger(
  stateName: string,
  fieldName: string,
  value: number | undefined,
) {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Animation state ${stateName} must use a non-negative ${fieldName}.`,
    );
  }
}

function validateOptionalBoolean(
  stateName: string,
  fieldName: string,
  value: boolean | undefined,
) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "boolean") {
    throw new Error(
      `Animation state ${stateName} must use a boolean ${fieldName} flag.`,
    );
  }
}
