import {
  type AnimationProfile,
  deriveAnimationDurations,
  PROFILE_TRANSITION_ANIMATION_NAMES,
  type ProfileStateName,
} from "../../shared/animationProfile.js";
import {
  isInteractionPackState,
  isTransientInteractionPackState,
} from "../../shared/packState.js";
import { formatProfileAssetPath } from "../../shared/profileAssetUrl.js";

export interface BuildStudioInspectorOptions {
  profile: AnimationProfile;
  animationName: string;
  selectedFrameIndex: number;
  selectedStateName: ProfileStateName | null;
}

export const STATE_POLICY_FIELD_HELP = {
  durationMs:
    "Total playback time for the selected animation, in milliseconds.",
  loop: "Repeats the selected animation until another state changes it.",
  minDwellMs:
    "Minimum time this state must remain active before it can change.",
  interruptible:
    "Allows a new state request to interrupt this state before dwell or cycle limits finish.",
  allowDuringHookActivity:
    "Allows this interaction state to override hook-driven animation while hook activity is visible.",
  holdLastFrame:
    "Keeps the final transient interaction frame visible until another state change replaces it.",
} as const;

export function buildStatePolicySectionTitle(
  stateName: ProfileStateName | null,
) {
  return stateName === null ? "Transition" : "State policy";
}

export function shouldShowStudioLoopControl(
  animationName: string,
  selectedStateName: ProfileStateName | null,
) {
  if (
    PROFILE_TRANSITION_ANIMATION_NAMES.includes(
      animationName as (typeof PROFILE_TRANSITION_ANIMATION_NAMES)[number],
    )
  ) {
    return false;
  }

  if (
    selectedStateName !== null &&
    isTransientInteractionPackState(selectedStateName)
  ) {
    return false;
  }

  return true;
}

export function shouldShowStudioMinDwellControl(interruptible: boolean) {
  return interruptible === false;
}

export function buildStudioInspector({
  profile,
  animationName,
  selectedFrameIndex,
  selectedStateName,
}: BuildStudioInspectorOptions) {
  const animation = profile.animations[animationName];

  if (animation === undefined) {
    throw new Error(`Animation ${animationName} was not found.`);
  }

  const selectedFramePath = animation.frames[selectedFrameIndex] ?? "";
  const usedByStates = Object.entries(profile.states)
    .filter(([, mapping]) => mapping?.animation === animationName)
    .map(([stateName]) => ({
      stateName,
      editing: stateName === selectedStateName,
    }));
  const statePolicy =
    selectedStateName === null ? undefined : profile.states[selectedStateName];

  return {
    viewing: {
      profileName: profile.name,
      animationName,
      frameLabel: `${String(selectedFrameIndex + 1).padStart(2, "0")} / ${String(animation.frames.length).padStart(2, "0")}`,
      framePath: formatProfileAssetPath(selectedFramePath),
    },
    usedByStates,
    statePolicy:
      selectedStateName === null
        ? null
        : {
            stateName: selectedStateName,
            animationName: statePolicy?.animation ?? animationName,
            minDwellMs: statePolicy?.minDwellMs ?? 0,
            interruptible: statePolicy?.interruptible ?? true,
            ...(isInteractionPackState(selectedStateName)
              ? {
                  allowDuringHookActivity:
                    statePolicy?.allowDuringHookActivity ?? false,
                }
              : {}),
            ...(isTransientInteractionPackState(selectedStateName)
              ? {
                  holdLastFrame: statePolicy?.holdLastFrame ?? false,
                }
              : {}),
          },
    derived: {
      frameDurationsMs: deriveAnimationDurations(animation),
      totalDurationMs: animation.totalDurationMs,
      loop: animation.loop,
    },
  };
}
