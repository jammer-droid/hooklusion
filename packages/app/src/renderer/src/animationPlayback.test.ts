import { describe, expect, it } from "vitest";

import {
  advancePlayback,
  createPlaybackState,
  getPlaybackTransitionMs,
} from "./animationPlayback.js";

describe("createPlaybackState", () => {
  it("starts from the first frame", () => {
    const playback = createPlaybackState({
      frames: ["frame-01.svg", "frame-02.svg"],
      durationsMs: [100, 150],
      loop: true,
      transitionMs: 120,
    });

    expect(playback).toMatchObject({
      frameIndex: 0,
      framePath: "frame-01.svg",
      completed: false,
    });
  });
});

describe("advancePlayback", () => {
  it("wraps looped animations back to the first frame", () => {
    const playback = createPlaybackState({
      frames: ["frame-01.svg", "frame-02.svg"],
      durationsMs: [100, 150],
      loop: true,
      transitionMs: 120,
    });

    expect(advancePlayback(playback, 260)).toMatchObject({
      frameIndex: 0,
      framePath: "frame-01.svg",
      completed: false,
    });
  });

  it("holds non-looping animations on the last frame", () => {
    const playback = createPlaybackState({
      frames: ["frame-01.svg", "frame-02.svg", "frame-03.svg"],
      durationsMs: [80, 80, 120],
      loop: false,
      transitionMs: 180,
    });

    expect(advancePlayback(playback, 500)).toMatchObject({
      frameIndex: 2,
      framePath: "frame-03.svg",
      completed: true,
    });
  });

  it("respects frame durations while advancing", () => {
    const playback = createPlaybackState({
      frames: ["frame-01.svg", "frame-02.svg", "frame-03.svg"],
      durationsMs: [100, 200, 300],
      loop: true,
      transitionMs: 150,
    });

    expect(advancePlayback(playback, 99).frameIndex).toBe(0);
    expect(advancePlayback(playback, 100).frameIndex).toBe(1);
    expect(advancePlayback(playback, 299).frameIndex).toBe(1);
    expect(advancePlayback(playback, 300).frameIndex).toBe(2);
  });
});

describe("getPlaybackTransitionMs", () => {
  it("surfaces transition metadata for the renderer", () => {
    const playback = createPlaybackState({
      frames: ["frame-01.svg"],
      durationsMs: [100],
      loop: true,
      transitionMs: 240,
    });

    expect(getPlaybackTransitionMs(playback)).toBe(240);
  });
});
