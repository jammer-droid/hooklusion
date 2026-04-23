import { describe, expect, it } from "vitest";

import { createDefaultAnimationProfile } from "./defaultProfile.js";

describe("default profile", () => {
  it("materializes bundled frames as profile asset URLs", () => {
    const profile = createDefaultAnimationProfile();

    expect(profile.animations.idle.frames[0]).toBe(
      "hooklusion-profile://gpchan-default/assets/basic/idle/frame_000.png",
    );
    expect(profile.animations.tool_read.frames[0]).toBe(
      "hooklusion-profile://gpchan-default/assets/extension/tool_read/frame_000.png",
    );
    expect(profile.animations.click.frames[0]).toBe(
      "hooklusion-profile://gpchan-default/assets/interact/click/frame_000.png",
    );
    expect(profile.animations.transition_in.frames[0]).toBe(
      "hooklusion-profile://gpchan-default/assets/transition_in/frame_000.png",
    );
    expect(profile.assetSchemaVersion).toBeGreaterThan(0);
    expect(profile.animations.session_start.frames).toHaveLength(3);
    expect(profile.animations.tool_active.frames).toHaveLength(1);
    expect(profile.animations.drag_up.frames).toHaveLength(3);
    expect(profile.states.drag?.allowDuringHookActivity).toBe(false);
    expect(profile.states.drag_right?.allowDuringHookActivity).toBe(false);
  });

  it("loads the seeded dev profile when a seed path is provided", () => {
    const profile = createDefaultAnimationProfile({
      seedProfilePath: "/tmp/gpchan-default/profile.json",
    });

    expect(profile.fallbackState).toBe("idle");
    expect(profile.states.session_start).toMatchObject({
      interruptible: true,
      minCycles: 1,
      minDwellMs: 1500,
    });
    expect(profile.states.hover_in).toMatchObject({
      allowDuringHookActivity: true,
      holdLastFrame: true,
      fallbackState: "thinking",
    });
    expect(profile.states.drag?.allowDuringHookActivity).toBe(false);
    expect(profile.states.drag_right).toMatchObject({
      allowDuringHookActivity: true,
      fallbackState: "tool_active",
    });
    expect(profile.states.click).toMatchObject({
      allowDuringHookActivity: true,
      holdLastFrame: true,
    });
    expect(profile.states.done).toMatchObject({
      interruptible: true,
      minCycles: 1,
      minDwellMs: 2000,
      fallbackState: "idle",
    });
  });
});
