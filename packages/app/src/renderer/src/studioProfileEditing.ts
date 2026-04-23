import type {
  AnimationProfile,
  ProfileAnimation,
  ProfileStateMapping,
  ProfileStateName,
} from "../../shared/animationProfile.js";

export interface AnimationTimingUpdate {
  totalDurationMs?: number;
  frameWeights?: number[];
}

export interface StatePolicyUpdate {
  minDwellMs?: number;
  minCycles?: number;
  interruptible?: boolean;
  allowDuringHookActivity?: boolean;
  holdLastFrame?: boolean;
}

export function cloneAnimationProfile(
  profile: AnimationProfile,
  existingProfileIds: string[],
): AnimationProfile {
  const id = createCopyId(profile.id, existingProfileIds);

  return {
    ...profile,
    id,
    name: `${profile.name} Copy`,
  };
}

export function setProfileFloatingMotion(
  profile: AnimationProfile,
  floatingMotion: boolean,
): AnimationProfile {
  return {
    ...profile,
    presentation: {
      ...profile.presentation,
      floatingMotion,
    },
  };
}

export function renameAnimationProfile(
  profile: AnimationProfile,
  name: string,
): AnimationProfile {
  return {
    ...profile,
    name,
  };
}

export function updateAnimationTiming(
  profile: AnimationProfile,
  animationName: string,
  update: AnimationTimingUpdate,
): AnimationProfile {
  return updateAnimation(profile, animationName, (animation) => ({
    ...animation,
    totalDurationMs: update.totalDurationMs ?? animation.totalDurationMs,
    frameWeights: update.frameWeights ?? animation.frameWeights,
  }));
}

export function addAnimationFrame(
  profile: AnimationProfile,
  animationName: string,
  frame: string,
): AnimationProfile {
  return updateAnimation(profile, animationName, (animation) => ({
    ...animation,
    frames: [...animation.frames, frame],
    frameWeights: [...animation.frameWeights, 1],
  }));
}

export function removeAnimationFrame(
  profile: AnimationProfile,
  animationName: string,
  frameIndex: number,
): AnimationProfile {
  return updateAnimation(profile, animationName, (animation) => ({
    ...animation,
    frames: animation.frames.filter((_, index) => index !== frameIndex),
    frameWeights: animation.frameWeights.filter(
      (_, index) => index !== frameIndex,
    ),
  }));
}

export function reorderAnimationFrame(
  profile: AnimationProfile,
  animationName: string,
  fromIndex: number,
  toIndex: number,
): AnimationProfile {
  return updateAnimation(profile, animationName, (animation) => ({
    ...animation,
    frames: moveItem(animation.frames, fromIndex, toIndex),
    frameWeights: moveItem(animation.frameWeights, fromIndex, toIndex),
  }));
}

export function setAnimationLoop(
  profile: AnimationProfile,
  animationName: string,
  loop: boolean,
): AnimationProfile {
  return updateAnimation(profile, animationName, (animation) => ({
    ...animation,
    loop,
  }));
}

export function setAnimationTransition(
  profile: AnimationProfile,
  animationName: string,
  transitionMs: number,
): AnimationProfile {
  return updateAnimation(profile, animationName, (animation) => ({
    ...animation,
    transitionMs,
  }));
}

export function setAnimationFrameWeight(
  profile: AnimationProfile,
  animationName: string,
  frameIndex: number,
  weight: number,
): AnimationProfile {
  return updateAnimation(profile, animationName, (animation) => ({
    ...animation,
    frameWeights: animation.frameWeights.map((currentWeight, index) =>
      index === frameIndex ? weight : currentWeight,
    ),
  }));
}

export function replaceAnimationFrame(
  profile: AnimationProfile,
  animationName: string,
  frameIndex: number,
  frame: string,
): AnimationProfile {
  return updateAnimation(profile, animationName, (animation) => ({
    ...animation,
    frames: animation.frames.map((currentFrame, index) =>
      index === frameIndex ? frame : currentFrame,
    ),
  }));
}

export function mapAnimationState(
  profile: AnimationProfile,
  stateName: ProfileStateName,
  animationName: string,
): AnimationProfile {
  const currentMapping = profile.states[stateName];

  return {
    ...profile,
    states: {
      ...profile.states,
      [stateName]: {
        ...currentMapping,
        animation: animationName,
      },
    },
  };
}

export function updateStatePolicy(
  profile: AnimationProfile,
  stateName: ProfileStateName,
  update: StatePolicyUpdate,
): AnimationProfile {
  const currentMapping = readStateMapping(profile, stateName);

  return {
    ...profile,
    states: {
      ...profile.states,
      [stateName]: {
        ...currentMapping,
        ...update,
      },
    },
  };
}

function updateAnimation(
  profile: AnimationProfile,
  animationName: string,
  update: (animation: ProfileAnimation) => ProfileAnimation,
): AnimationProfile {
  const animation = profile.animations[animationName];

  if (animation === undefined) {
    throw new Error(`Animation ${animationName} was not found.`);
  }

  return {
    ...profile,
    animations: {
      ...profile.animations,
      [animationName]: update(animation),
    },
  };
}

function readStateMapping(
  profile: AnimationProfile,
  stateName: ProfileStateName,
): ProfileStateMapping {
  const mapping = profile.states[stateName];

  if (mapping !== undefined) {
    return mapping;
  }

  const fallbackAnimation = profile.states.idle?.animation;

  if (fallbackAnimation === undefined) {
    throw new Error(`Animation state ${stateName} cannot be initialized.`);
  }

  return {
    animation: fallbackAnimation,
  };
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const moved = [...items];
  const [item] = moved.splice(fromIndex, 1);

  if (item === undefined) {
    return moved;
  }

  moved.splice(toIndex, 0, item);
  return moved;
}

function createCopyId(profileId: string, existingProfileIds: string[]) {
  const baseCopyId = `${profileId}-copy`;
  let candidateId = baseCopyId;
  let copyIndex = 2;

  while (existingProfileIds.includes(candidateId)) {
    candidateId = `${baseCopyId}-${copyIndex}`;
    copyIndex += 1;
  }

  return candidateId;
}
