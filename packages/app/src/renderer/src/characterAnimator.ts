import {
  type AnimationDefinition,
  type AnimationPack,
  type AnimationStateName,
  resolveAnimationState,
} from "./animationPack.js";
import {
  advancePlayback,
  createPlaybackState,
  getPlaybackTransitionMs,
} from "./animationPlayback.js";

export interface CharacterRenderModel {
  state: AnimationStateName;
  frameUrl: string;
  previousFrameUrl: string | null;
  transitionId: number;
  transitionMs: number;
  motionTransform: string;
}

export function createRuntimeMotionTransform(elapsedMs: number): string {
  const phase = (elapsedMs / 1600) * Math.PI * 2;
  const floatY = Math.sin(phase) * 2.4;
  const scale = 1 + ((Math.sin(phase - Math.PI / 2) + 1) / 2) * 0.012;

  return `translate3d(0, ${floatY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
}

export function createCharacterAnimator(pack: AnimationPack, baseUrl: URL) {
  let activePack = pack;
  let activeState = resolveAnimationState(pack, "idle");
  let playback = createPlaybackState(
    readAnimationDefinition(activePack, activeState),
  );
  let previousFrameUrl: string | null = null;
  let transitionId = 0;
  let elapsedMs = 0;
  let temporaryAnimation: {
    playback: ReturnType<typeof createPlaybackState>;
    onComplete?: () => void;
  } | null = null;

  function toFrameUrl(framePath: string): string {
    return new URL(framePath, baseUrl).href;
  }

  function readAnimationDefinition(
    currentPack: AnimationPack,
    state: AnimationStateName,
  ) {
    const definition = currentPack.states[state];

    if (definition === undefined) {
      throw new Error(
        `Animation pack ${currentPack.name} does not define state ${state}.`,
      );
    }

    return definition;
  }

  function getRenderModel(): CharacterRenderModel {
    const activePlayback = temporaryAnimation?.playback ?? playback;

    return {
      state: activeState,
      frameUrl: toFrameUrl(activePlayback.framePath),
      previousFrameUrl,
      transitionId,
      transitionMs: getPlaybackTransitionMs(activePlayback),
      motionTransform: createRuntimeMotionTransform(elapsedMs),
    };
  }

  function setState(
    requestedState: AnimationStateName,
    options: { transition?: boolean } = {},
  ) {
    const activePlayback = temporaryAnimation?.playback ?? playback;

    previousFrameUrl = toFrameUrl(activePlayback.framePath);
    activeState = resolveAnimationState(activePack, requestedState);
    playback = createPlaybackState(
      readAnimationDefinition(activePack, activeState),
    );
    elapsedMs = 0;

    if (options.transition !== false) {
      transitionId += 1;
    }
  }

  function setPack(
    nextPack: AnimationPack,
    options: { transition?: boolean; state?: AnimationStateName } = {},
  ) {
    const activePlayback = temporaryAnimation?.playback ?? playback;

    previousFrameUrl = toFrameUrl(activePlayback.framePath);
    activePack = nextPack;
    activeState = resolveAnimationState(
      activePack,
      options.state ?? activeState,
    );
    playback = createPlaybackState(
      readAnimationDefinition(activePack, activeState),
    );
    elapsedMs = 0;

    if (options.transition !== false) {
      transitionId += 1;
    }
  }

  function playTemporaryAnimation(
    animation: AnimationDefinition,
    options: {
      onComplete?: () => void;
    } = {},
  ) {
    previousFrameUrl = toFrameUrl(
      (temporaryAnimation?.playback ?? playback).framePath,
    );
    temporaryAnimation = {
      playback: createPlaybackState(animation),
      onComplete: options.onComplete,
    };
    elapsedMs = 0;
    transitionId += 1;
  }

  function tick(deltaMs: number) {
    elapsedMs += deltaMs;

    if (temporaryAnimation !== null) {
      temporaryAnimation.playback = advancePlayback(
        temporaryAnimation.playback,
        elapsedMs,
      );

      if (temporaryAnimation.playback.completed) {
        const onComplete = temporaryAnimation.onComplete;
        temporaryAnimation = null;
        elapsedMs = 0;
        onComplete?.();
      }

      return;
    }

    playback = advancePlayback(playback, elapsedMs);
  }

  return {
    getRenderModel,
    playTemporaryAnimation,
    setState,
    setPack,
    tick,
  };
}
