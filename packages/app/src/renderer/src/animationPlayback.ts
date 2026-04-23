import type { AnimationDefinition } from "./animationPack.js";

export interface AnimationPlaybackState {
  animation: AnimationDefinition;
  elapsedMs: number;
  frameIndex: number;
  framePath: string;
  completed: boolean;
}

export function createPlaybackState(
  animation: AnimationDefinition,
): AnimationPlaybackState {
  return {
    animation,
    elapsedMs: 0,
    frameIndex: 0,
    framePath: animation.frames[0],
    completed: false,
  };
}

export function advancePlayback(
  playback: AnimationPlaybackState,
  elapsedMs: number,
): AnimationPlaybackState {
  const totalDuration = playback.animation.durationsMs.reduce(
    (sum, durationMs) => sum + durationMs,
    0,
  );

  let normalizedElapsedMs = elapsedMs;
  let completed = false;

  if (playback.animation.loop) {
    normalizedElapsedMs %= totalDuration;
  } else if (normalizedElapsedMs >= totalDuration) {
    normalizedElapsedMs = totalDuration - 1;
    completed = true;
  }

  let runningDuration = 0;
  let frameIndex = playback.animation.frames.length - 1;

  for (
    let index = 0;
    index < playback.animation.durationsMs.length;
    index += 1
  ) {
    runningDuration += playback.animation.durationsMs[index];

    if (normalizedElapsedMs < runningDuration) {
      frameIndex = index;
      break;
    }
  }

  return {
    animation: playback.animation,
    elapsedMs,
    frameIndex,
    framePath: playback.animation.frames[frameIndex],
    completed,
  };
}

export function getPlaybackTransitionMs(
  playback: AnimationPlaybackState,
): number {
  return playback.animation.transitionMs;
}
