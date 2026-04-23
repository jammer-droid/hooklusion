import { describe, expect, it } from "vitest";

import {
  advanceScheduledPlayback,
  moveToNextFrame,
  moveToPreviousFrame,
  selectPreviewFrame,
  shouldHandlePreviewControlClick,
  togglePreviewPlayback,
} from "./studioPlayback.js";

describe("studio playback", () => {
  it("wraps previous frame selection", () => {
    expect(
      moveToPreviousFrame({ frameCount: 3, selectedFrameIndex: 0 }),
    ).toEqual({
      playing: false,
      selectedFrameIndex: 2,
    });
  });

  it("wraps next frame selection", () => {
    expect(moveToNextFrame({ frameCount: 3, selectedFrameIndex: 2 })).toEqual({
      playing: false,
      selectedFrameIndex: 0,
    });
  });

  it("pauses when a specific frame is selected", () => {
    expect(selectPreviewFrame({ frameCount: 3, frameIndex: 2 })).toEqual({
      playing: false,
      selectedFrameIndex: 2,
    });
  });

  it("clamps selected frame indexes into range", () => {
    expect(selectPreviewFrame({ frameCount: 3, frameIndex: 9 })).toEqual({
      playing: false,
      selectedFrameIndex: 2,
    });
  });

  it("toggles playback without changing the current frame", () => {
    expect(
      togglePreviewPlayback({ playing: false, selectedFrameIndex: 1 }),
    ).toEqual({
      playing: true,
      selectedFrameIndex: 1,
    });
  });

  it("ignores stale scheduled playback callbacks after playback stops", () => {
    expect(
      advanceScheduledPlayback({
        frameCount: 3,
        selectedFrameIndex: 1,
        playing: false,
        scheduledPlaybackEpoch: 2,
        currentPlaybackEpoch: 3,
      }),
    ).toBeNull();
  });

  it("ignores the pointer-generated click after an immediate pointerdown activation", () => {
    expect(
      shouldHandlePreviewControlClick({
        clickDetail: 1,
        pointerActivated: true,
      }),
    ).toBe(false);
  });

  it("keeps keyboard-triggered click activation for preview controls", () => {
    expect(
      shouldHandlePreviewControlClick({
        clickDetail: 0,
        pointerActivated: true,
      }),
    ).toBe(true);
  });
});
