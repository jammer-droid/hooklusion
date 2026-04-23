import { describe, expect, it } from "vitest";

import {
  type AnimationProfile,
  deriveAnimationDurations,
  isFloatingMotionEnabled,
  validateAnimationProfile,
} from "./animationProfile.js";

describe("animation profiles", () => {
  it("validates a profile with idle and canonical state mappings", () => {
    const profile = createProfile();

    expect(validateAnimationProfile(profile)).toBe(profile);
  });

  it("derives per-frame durations from total duration and weights", () => {
    expect(
      deriveAnimationDurations({
        frames: ["a.png", "b.png", "c.png"],
        totalDurationMs: 1200,
        frameWeights: [1, 2, 1],
        loop: true,
        transitionMs: 100,
      }),
    ).toEqual([300, 600, 300]);
  });

  it("distributes uneven totals deterministically while preserving the exact sum", () => {
    const durations = deriveAnimationDurations({
      frames: ["a.png", "b.png", "c.png"],
      totalDurationMs: 1000,
      frameWeights: [1, 1, 1],
      loop: true,
      transitionMs: 100,
    });

    expect(durations).toEqual([334, 333, 333]);
    expect(durations.reduce((sum, duration) => sum + duration, 0)).toBe(1000);
  });

  it("keeps every frame positive for skewed weights at the minimum valid total", () => {
    const durations = deriveAnimationDurations({
      frames: ["a.png", "b.png", "c.png"],
      totalDurationMs: 3,
      frameWeights: [100, 1, 1],
      loop: true,
      transitionMs: 100,
    });

    expect(durations).toEqual([1, 1, 1]);
    expect(durations.reduce((sum, duration) => sum + duration, 0)).toBe(3);
  });

  it("rejects profiles without an idle state", () => {
    const profile = createProfile();
    delete profile.states.idle;

    expect(() => validateAnimationProfile(profile)).toThrow(
      "Animation profile GP Chan Test must define canonical state idle.",
    );
  });

  it("rejects profiles that omit canonical behavior states", () => {
    const profile = createProfile();
    delete profile.states.session_start;

    expect(() => validateAnimationProfile(profile)).toThrow(
      "Animation profile GP Chan Test must define canonical state session_start.",
    );
  });

  it("rejects state mappings that reference missing animations", () => {
    const profile = createProfile();
    profile.states.thinking = {
      animation: "missing",
      minDwellMs: 800,
      minCycles: 1,
      interruptible: true,
    };

    expect(() => validateAnimationProfile(profile)).toThrow(
      "Animation state thinking references missing animation missing.",
    );
  });

  it("accepts reserved transition animations without state mappings", () => {
    const profile = createProfile();
    profile.animations.transition_in = {
      frames: ["transition_in_a.png", "transition_in_b.png"],
      totalDurationMs: 200,
      frameWeights: [1, 1],
      loop: false,
      transitionMs: 0,
    };
    profile.animations.transition_out = {
      frames: ["transition_out_a.png", "transition_out_b.png"],
      totalDurationMs: 200,
      frameWeights: [1, 1],
      loop: false,
      transitionMs: 0,
    };

    expect(validateAnimationProfile(profile)).toBe(profile);
  });

  it("accepts provider-common extended states", () => {
    const profile = createProfile();
    profile.animations.read_loop = {
      frames: ["read_a.png", "read_b.png"],
      totalDurationMs: 1000,
      frameWeights: [1, 1],
      loop: true,
      transitionMs: 90,
    };
    profile.states.tool_read = {
      animation: "read_loop",
    };

    expect(validateAnimationProfile(profile)).toBe(profile);
  });

  it("accepts interaction states with hook-activity flags", () => {
    const profile = createProfile();
    profile.animations.drag_loop = {
      frames: ["drag_a.png", "drag_b.png"],
      totalDurationMs: 1000,
      frameWeights: [1, 1],
      loop: true,
      transitionMs: 90,
    };
    profile.states.drag = {
      animation: "drag_loop",
      allowDuringHookActivity: true,
    };

    expect(validateAnimationProfile(profile)).toBe(profile);
  });

  it("accepts transient interaction hold-last-frame flags", () => {
    const profile = createProfile();
    profile.animations.click_once = {
      frames: ["click_a.png"],
      totalDurationMs: 300,
      frameWeights: [1],
      loop: false,
      transitionMs: 60,
    };
    profile.states.click = {
      animation: "click_once",
      holdLastFrame: true,
    };

    expect(validateAnimationProfile(profile)).toBe(profile);
  });

  it("rejects non-boolean interaction hook flags", () => {
    const profile = createProfile();
    profile.animations.click_once = {
      frames: ["click_a.png"],
      totalDurationMs: 300,
      frameWeights: [1],
      loop: false,
      transitionMs: 60,
    };
    profile.states.click = {
      animation: "click_once",
      allowDuringHookActivity: "yes" as unknown as boolean,
    };

    expect(() => validateAnimationProfile(profile)).toThrow(
      "Animation state click must use a boolean allowDuringHookActivity flag.",
    );
  });

  it("rejects non-boolean transient hold-last-frame flags", () => {
    const profile = createProfile();
    profile.animations.click_once = {
      frames: ["click_a.png"],
      totalDurationMs: 300,
      frameWeights: [1],
      loop: false,
      transitionMs: 60,
    };
    profile.states.click = {
      animation: "click_once",
      holdLastFrame: "yes" as unknown as boolean,
    };

    expect(() => validateAnimationProfile(profile)).toThrow(
      "Animation state click must use a boolean holdLastFrame flag.",
    );
  });

  it("rejects animations with a non-positive total duration", () => {
    const profile = createProfile();
    profile.animations.idle_breathe.totalDurationMs = 0;

    expect(() => validateAnimationProfile(profile)).toThrow(
      "Animation idle_breathe must use a positive total duration.",
    );
  });

  it("rejects animations whose total duration is too short for positive frame durations", () => {
    const profile = createProfile();
    profile.animations.idle_breathe.totalDurationMs = 1;

    expect(() => validateAnimationProfile(profile)).toThrow(
      "Animation idle_breathe must use a total duration of at least 2.",
    );
  });

  it("rejects animations with a negative transition", () => {
    const profile = createProfile();
    profile.animations.idle_breathe.transitionMs = -1;

    expect(() => validateAnimationProfile(profile)).toThrow(
      "Animation idle_breathe must use a non-negative transition.",
    );
  });

  it("defaults floating motion to enabled for older profiles", () => {
    expect(isFloatingMotionEnabled(createProfile())).toBe(true);
  });

  it("reads explicit floating motion presentation settings", () => {
    expect(
      isFloatingMotionEnabled({
        ...createProfile(),
        presentation: { floatingMotion: false },
      }),
    ).toBe(false);
  });
});

function createProfile(): AnimationProfile {
  return {
    schemaVersion: 1,
    id: "gpchan-test",
    name: "GP Chan Test",
    spriteRoot: "assets",
    animations: {
      idle_breathe: {
        frames: ["idle_a.png", "idle_b.png"],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 150,
      },
      thinking_loop: {
        frames: ["thinking_a.png", "thinking_b.png"],
        totalDurationMs: 1800,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 150,
      },
    },
    states: {
      idle: {
        animation: "idle_breathe",
      },
      session_start: {
        animation: "thinking_loop",
      },
      prompt_received: {
        animation: "thinking_loop",
      },
      thinking: {
        animation: "thinking_loop",
        minDwellMs: 800,
        minCycles: 1,
        interruptible: true,
      },
      tool_active: {
        animation: "thinking_loop",
      },
      done: {
        animation: "thinking_loop",
      },
    },
  };
}
