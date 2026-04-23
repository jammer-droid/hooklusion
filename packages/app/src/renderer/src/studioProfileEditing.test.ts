import { describe, expect, it } from "vitest";

import type { AnimationProfile } from "../../shared/animationProfile.js";
import {
  cloneAnimationProfile,
  removeAnimationFrame,
  renameAnimationProfile,
  reorderAnimationFrame,
  replaceAnimationFrame,
  setAnimationFrameWeight,
  setProfileFloatingMotion,
  updateAnimationTiming,
  updateStatePolicy,
} from "./studioProfileEditing.js";

describe("studio profile editing", () => {
  it("updates animation total duration and frame weights immutably", () => {
    const profile = createProfile();
    const updated = updateAnimationTiming(profile, "idle_breathe", {
      totalDurationMs: 2400,
      frameWeights: [1, 3],
    });

    expect(updated.animations.idle_breathe.totalDurationMs).toBe(2400);
    expect(updated.animations.idle_breathe.frameWeights).toEqual([1, 3]);
    expect(profile.animations.idle_breathe.totalDurationMs).toBe(3000);
  });

  it("updates a single frame weight immutably", () => {
    const profile = createProfile();
    const updated = setAnimationFrameWeight(profile, "idle_breathe", 1, 3);

    expect(updated.animations.idle_breathe.frameWeights).toEqual([1, 3]);
    expect(profile.animations.idle_breathe.frameWeights).toEqual([1, 1]);
  });

  it("replaces a single animation frame immutably", () => {
    const profile = createProfile();
    const updated = replaceAnimationFrame(
      profile,
      "idle_breathe",
      1,
      "assets/new.png",
    );

    expect(updated.animations.idle_breathe.frames).toEqual([
      "idle_a.png",
      "assets/new.png",
    ]);
    expect(profile.animations.idle_breathe.frames).toEqual([
      "idle_a.png",
      "idle_b.png",
    ]);
  });

  it("reorders animation frames and weights immutably", () => {
    const profile = createThreeFrameProfile();
    const updated = reorderAnimationFrame(profile, "idle_breathe", 0, 2);

    expect(updated.animations.idle_breathe.frames).toEqual([
      "idle_b.png",
      "idle_c.png",
      "idle_a.png",
    ]);
    expect(updated.animations.idle_breathe.frameWeights).toEqual([2, 3, 1]);
    expect(profile.animations.idle_breathe.frames).toEqual([
      "idle_a.png",
      "idle_b.png",
      "idle_c.png",
    ]);
  });

  it("removes a selected animation frame and its weight immutably", () => {
    const profile = createThreeFrameProfile();
    const updated = removeAnimationFrame(profile, "idle_breathe", 1);

    expect(updated.animations.idle_breathe.frames).toEqual([
      "idle_a.png",
      "idle_c.png",
    ]);
    expect(updated.animations.idle_breathe.frameWeights).toEqual([1, 3]);
    expect(profile.animations.idle_breathe.frames).toEqual([
      "idle_a.png",
      "idle_b.png",
      "idle_c.png",
    ]);
  });

  it("clones a profile with a unique id and copy name", () => {
    const clone = cloneAnimationProfile(createProfile(), [
      "gpchan-test",
      "gpchan-test-copy",
    ]);

    expect(clone.id).toBe("gpchan-test-copy-2");
    expect(clone.name).toBe("GP Chan Test Copy");
    expect(clone.animations).toEqual(createProfile().animations);
  });

  it("updates profile floating motion immutably", () => {
    const profile = createProfile();
    const updated = setProfileFloatingMotion(profile, false);

    expect(updated.presentation?.floatingMotion).toBe(false);
    expect(profile.presentation).toBeUndefined();
  });

  it("renames a profile immutably", () => {
    const profile = createProfile();
    const updated = renameAnimationProfile(profile, "Renamed GP Chan");

    expect(updated.name).toBe("Renamed GP Chan");
    expect(profile.name).toBe("GP Chan Test");
  });

  it("updates interaction hook-activity policy immutably", () => {
    const profile = createProfile();
    const updated = updateStatePolicy(profile, "drag", {
      allowDuringHookActivity: true,
    });

    expect(updated.states.drag).toEqual({
      animation: "idle_breathe",
      allowDuringHookActivity: true,
    });
    expect(profile.states.drag).toBeUndefined();
  });

  it("updates transient hold-last-frame policy immutably", () => {
    const profile = createProfile();
    const updated = updateStatePolicy(profile, "click", {
      holdLastFrame: true,
    });

    expect(updated.states.click).toEqual({
      animation: "idle_breathe",
      holdLastFrame: true,
    });
    expect(profile.states.click).toBeUndefined();
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
    },
    states: {
      idle: { animation: "idle_breathe" },
      session_start: { animation: "idle_breathe" },
      prompt_received: { animation: "idle_breathe" },
      thinking: { animation: "idle_breathe" },
      tool_active: { animation: "idle_breathe" },
      done: { animation: "idle_breathe" },
    },
  };
}

function createThreeFrameProfile(): AnimationProfile {
  return {
    ...createProfile(),
    animations: {
      idle_breathe: {
        frames: ["idle_a.png", "idle_b.png", "idle_c.png"],
        totalDurationMs: 3000,
        frameWeights: [1, 2, 3],
        loop: true,
        transitionMs: 150,
      },
    },
  };
}
