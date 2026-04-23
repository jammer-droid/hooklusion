import { describe, expect, it } from "vitest";

import type { AnimationProfile } from "../../shared/animationProfile.js";
import { createAnimationPackFromProfile } from "./profileAnimationPack.js";

describe("profile animation pack conversion", () => {
  it("converts canonical state mappings to animation pack states", () => {
    const pack = createAnimationPackFromProfile(createProfile());

    expect(pack.name).toBe("GP Chan Test");
    expect(Object.keys(pack.states).sort()).toEqual([
      "done",
      "idle",
      "prompt_received",
      "session_start",
      "thinking",
      "tool_active",
    ]);
    expect(pack.states.idle?.frames).toEqual([
      "assets/idle_a.png",
      "assets/idle_b.png",
    ]);
    expect(pack.states.thinking?.frames).toEqual([
      "assets/thinking_a.png",
      "assets/thinking_b.png",
    ]);
    expect(pack.states.thinking?.durationsMs).toEqual([900, 900]);
    expect(pack.states.thinking?.loop).toBe(true);
  });

  it("materializes profile frame paths with a resolver", () => {
    const pack = createAnimationPackFromProfile(createProfile(), {
      resolveFrameUrl: (framePath) => `/bundled/${framePath}`,
    });

    expect(pack.states.thinking?.frames).toEqual([
      "/bundled/assets/thinking_a.png",
      "/bundled/assets/thinking_b.png",
    ]);
  });

  it("does not prefix profile asset URLs with the sprite root", () => {
    const profile = createProfile();
    const pack = createAnimationPackFromProfile({
      ...profile,
      animations: {
        ...profile.animations,
        thinking_loop: {
          ...profile.animations.thinking_loop,
          frames: ["hooklusion-profile://gpchan-test/assets/imported.png"],
          frameWeights: [1],
        },
      },
    });

    expect(pack.states.thinking?.frames).toEqual([
      "hooklusion-profile://gpchan-test/assets/imported.png",
    ]);
  });

  it("converts provider-common extended state mappings to animation pack states", () => {
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

    const pack = createAnimationPackFromProfile(profile);

    expect(pack.states.tool_read?.frames).toEqual([
      "assets/read_a.png",
      "assets/read_b.png",
    ]);
  });

  it("converts interaction state mappings to animation pack states", () => {
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

    const pack = createAnimationPackFromProfile(profile);

    expect(pack.states.drag?.frames).toEqual([
      "assets/drag_a.png",
      "assets/drag_b.png",
    ]);
  });

  it("forces transient interaction states to render as non-looping animations", () => {
    const profile = createProfile();
    profile.animations.click_once = {
      frames: ["click_a.png", "click_b.png"],
      totalDurationMs: 320,
      frameWeights: [1, 1],
      loop: true,
      transitionMs: 60,
    };
    profile.states.click = {
      animation: "click_once",
    };

    const pack = createAnimationPackFromProfile(profile);

    expect(pack.states.click?.loop).toBe(false);
  });

  it("includes reserved profile transition animations when present", () => {
    const profile = createProfile();
    profile.animations.transition_in = {
      frames: ["transition_in_a.png", "transition_in_b.png"],
      totalDurationMs: 400,
      frameWeights: [1, 1],
      loop: false,
      transitionMs: 0,
    };
    profile.animations.transition_out = {
      frames: ["transition_out_a.png", "transition_out_b.png"],
      totalDurationMs: 400,
      frameWeights: [1, 1],
      loop: false,
      transitionMs: 0,
    };

    const pack = createAnimationPackFromProfile(profile);

    expect(pack.transitions?.transition_in?.frames).toEqual([
      "assets/transition_in_a.png",
      "assets/transition_in_b.png",
    ]);
    expect(pack.transitions?.transition_out?.frames).toEqual([
      "assets/transition_out_a.png",
      "assets/transition_out_b.png",
    ]);
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
        transitionMs: 120,
      },
    },
    states: {
      idle: { animation: "idle_breathe" },
      session_start: { animation: "thinking_loop" },
      prompt_received: { animation: "thinking_loop" },
      thinking: {
        animation: "thinking_loop",
        minDwellMs: 800,
        minCycles: 1,
        interruptible: true,
      },
      tool_active: { animation: "thinking_loop" },
      done: { animation: "thinking_loop" },
    },
  };
}
