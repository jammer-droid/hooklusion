import {
  deriveAnimationDurations,
  type ProfileAnimation,
} from "../../shared/animationProfile.js";

export interface StudioTimeline {
  totalDurationMs: number;
  frames: StudioTimelineFrame[];
}

export interface StudioTimelineFrame {
  index: number;
  indexLabel: string;
  path: string;
  weight: number;
  widthPercent: number;
  derivedDurationMs: number;
  selected: boolean;
}

export function buildStudioTimeline(
  animation: ProfileAnimation,
  selectedFrameIndex: number,
): StudioTimeline {
  const totalWeight = animation.frameWeights.reduce(
    (sum, weight) => sum + weight,
    0,
  );
  const durations = deriveAnimationDurations(animation);

  return {
    totalDurationMs: animation.totalDurationMs,
    frames: animation.frames.map((path, index) => ({
      index,
      indexLabel: String(index + 1).padStart(2, "0"),
      path,
      weight: animation.frameWeights[index] ?? 1,
      widthPercent:
        totalWeight === 0
          ? 0
          : ((animation.frameWeights[index] ?? 1) / totalWeight) * 100,
      derivedDurationMs: durations[index] ?? 1,
      selected: index === selectedFrameIndex,
    })),
  };
}
