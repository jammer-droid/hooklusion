import { describe, expect, it } from "vitest";

import {
  resolveAnimationState,
  validateAnimationPack,
} from "./animationPack.js";

describe("validateAnimationPack", () => {
  it("accepts a valid pack", () => {
    expect(() =>
      validateAnimationPack({
        name: "Default Pack",
        states: {
          thinking: {
            frames: [
              "sprites/thinking/frame-01.svg",
              "sprites/thinking/frame-02.svg",
            ],
            durationsMs: [120, 120],
            loop: true,
            transitionMs: 150,
          },
        },
      }),
    ).not.toThrow();
  });

  it("rejects mismatched frame and duration counts", () => {
    expect(() =>
      validateAnimationPack({
        name: "Broken Pack",
        states: {
          thinking: {
            frames: [
              "sprites/thinking/frame-01.svg",
              "sprites/thinking/frame-02.svg",
            ],
            durationsMs: [120],
            loop: true,
            transitionMs: 150,
          },
        },
      }),
    ).toThrow(
      "Animation state thinking must define the same number of frames and durations.",
    );
  });

  it("rejects empty frame lists", () => {
    expect(() =>
      validateAnimationPack({
        name: "Broken Pack",
        states: {
          thinking: {
            frames: [],
            durationsMs: [],
            loop: true,
            transitionMs: 150,
          },
        },
      }),
    ).toThrow("Animation state thinking must define at least one frame.");
  });
});

describe("resolveAnimationState", () => {
  it("returns the requested state when it exists", () => {
    const pack = validateAnimationPack({
      name: "Default Pack",
      states: {
        thinking: {
          frames: ["sprites/thinking/frame-01.svg"],
          durationsMs: [120],
          loop: true,
          transitionMs: 150,
        },
      },
    });

    expect(resolveAnimationState(pack, "thinking")).toBe("thinking");
  });

  it("accepts provider-common extended states", () => {
    const pack = validateAnimationPack({
      name: "Default Pack",
      states: {
        tool_read: {
          frames: ["sprites/tool_read/frame-01.svg"],
          durationsMs: [120],
          loop: true,
          transitionMs: 150,
        },
      },
    });

    expect(resolveAnimationState(pack, "tool_read")).toBe("tool_read");
  });

  it("throws when the requested state is missing", () => {
    const pack = validateAnimationPack({
      name: "Default Pack",
      states: {
        thinking: {
          frames: ["sprites/thinking/frame-01.svg"],
          durationsMs: [120],
          loop: true,
          transitionMs: 150,
        },
        done: {
          frames: ["sprites/done/frame-01.svg"],
          durationsMs: [100],
          loop: false,
          transitionMs: 180,
        },
      },
    });

    expect(resolveAnimationState(pack, "done")).toBe("done");
    expect(() => resolveAnimationState(pack, "prompt_received")).toThrow(
      "Animation pack Default Pack does not define state prompt_received.",
    );
  });
});
