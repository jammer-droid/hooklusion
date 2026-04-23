export interface StudioPlaybackState {
  selectedFrameIndex: number;
  playing: boolean;
}

export interface FrameSelectionInput {
  frameCount: number;
  selectedFrameIndex: number;
}

export interface ScheduledPlaybackAdvanceInput extends FrameSelectionInput {
  playing: boolean;
  scheduledPlaybackEpoch: number;
  currentPlaybackEpoch: number;
}

export function moveToPreviousFrame({
  frameCount,
  selectedFrameIndex,
}: FrameSelectionInput): StudioPlaybackState {
  if (frameCount <= 0) {
    return { selectedFrameIndex: 0, playing: false };
  }

  return {
    selectedFrameIndex:
      selectedFrameIndex <= 0 ? frameCount - 1 : selectedFrameIndex - 1,
    playing: false,
  };
}

export function moveToNextFrame({
  frameCount,
  selectedFrameIndex,
}: FrameSelectionInput): StudioPlaybackState {
  if (frameCount <= 0) {
    return { selectedFrameIndex: 0, playing: false };
  }

  return {
    selectedFrameIndex: (selectedFrameIndex + 1) % frameCount,
    playing: false,
  };
}

export function advancePlayingFrame({
  frameCount,
  selectedFrameIndex,
}: FrameSelectionInput): StudioPlaybackState {
  return {
    ...moveToNextFrame({ frameCount, selectedFrameIndex }),
    playing: true,
  };
}

export function advanceScheduledPlayback({
  frameCount,
  selectedFrameIndex,
  playing,
  scheduledPlaybackEpoch,
  currentPlaybackEpoch,
}: ScheduledPlaybackAdvanceInput): StudioPlaybackState | null {
  if (!playing || scheduledPlaybackEpoch !== currentPlaybackEpoch) {
    return null;
  }

  return advancePlayingFrame({
    frameCount,
    selectedFrameIndex,
  });
}

export function shouldHandlePreviewControlClick({
  clickDetail,
  pointerActivated,
}: {
  clickDetail: number;
  pointerActivated: boolean;
}) {
  if (clickDetail === 0) {
    return true;
  }

  return !pointerActivated;
}

export function selectPreviewFrame({
  frameCount,
  frameIndex,
}: {
  frameCount: number;
  frameIndex: number;
}): StudioPlaybackState {
  return {
    selectedFrameIndex: clampFrameIndex(frameIndex, frameCount),
    playing: false,
  };
}

export function togglePreviewPlayback(
  state: StudioPlaybackState,
): StudioPlaybackState {
  return {
    ...state,
    playing: !state.playing,
  };
}

export function clampFrameIndex(frameIndex: number, frameCount: number) {
  if (frameCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(0, frameIndex), frameCount - 1);
}
