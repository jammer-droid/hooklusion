import { describe, expect, it, vi } from "vitest";

import { createPresentationScheduler } from "./presentationScheduler.js";

describe("presentation scheduler", () => {
  it("holds non-interruptible states until their minimum dwell has elapsed", () => {
    const emitted: string[] = [];
    const scheduler = createPresentationScheduler({
      now: () => 0,
      emit: (state) => emitted.push(state),
      policy: {
        done: {
          minDwellMs: 2200,
          minCycles: 1,
          interruptible: false,
        },
      },
    });

    scheduler.receive("done");
    scheduler.receive("thinking");

    expect(emitted).toEqual(["done"]);
  });

  it("does not auto-fall back after dwell without an explicit next state", () => {
    vi.useFakeTimers();
    let nowMs = 0;
    const emitted: string[] = [];
    const scheduler = createPresentationScheduler({
      now: () => nowMs,
      emit: (state) => emitted.push(state),
      policy: {
        done: {
          minDwellMs: 2200,
          interruptible: false,
        },
      },
      setTimer: (callback, delayMs) =>
        setTimeout(() => {
          nowMs += delayMs;
          callback();
        }, delayMs),
      clearTimer: clearTimeout,
    });

    scheduler.receive("done");
    expect(emitted).toEqual(["done"]);

    vi.advanceTimersByTime(2200);
    expect(emitted).toEqual(["done"]);
  });
});
