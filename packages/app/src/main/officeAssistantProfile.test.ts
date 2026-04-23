import { describe, expect, it } from "vitest";

import { createOfficeAssistantAnimationProfile } from "./officeAssistantProfile.js";

describe("office assistant profile", () => {
  it("creates a bundled profile with canonical and provider-common states", () => {
    const profile = createOfficeAssistantAnimationProfile("/tmp/hooklusion");

    expect(profile.id).toBe("office-assistant-default");
    expect(Object.keys(profile.animations)).toEqual([
      "idle",
      "session_start",
      "prompt_received",
      "thinking",
      "tool_active",
      "hover_in",
      "hover_out",
      "drag",
      "drag_up",
      "drag_down",
      "drag_left",
      "drag_right",
      "click",
      "done",
      "tool_read",
      "tool_search",
      "tool_explore",
      "tool_web",
      "tool_vcs_read",
      "tool_vcs_write",
      "tool_test",
      "tool_build",
    ]);
    expect(profile.states.idle?.animation).toBe("idle");
    expect(profile.states.drag?.animation).toBe("drag");
    expect(profile.states.drag_left?.animation).toBe("drag_left");
    expect(profile.states.drag?.allowDuringHookActivity).toBe(false);
    expect(profile.states.drag_right?.allowDuringHookActivity).toBe(false);
    expect(profile.states.tool_read?.animation).toBe("tool_read");
    expect(profile.states.tool_build?.animation).toBe("tool_build");
  });

  it("materializes bundled frames as profile asset URLs", () => {
    const profile = createOfficeAssistantAnimationProfile("/tmp/hooklusion");
    const firstFrame = profile.animations.idle.frames[0];

    expect(firstFrame).toBe(
      "hooklusion-profile://office-assistant-default/assets/office-assistant/animations/idle/seated_idle/frame_000.png",
    );
  });

  it("normalizes a packages/app cwd back to the project root", () => {
    const profile = createOfficeAssistantAnimationProfile(
      "/tmp/hooklusion/packages/app",
    );
    const firstFrame = profile.animations.idle.frames[0];

    expect(firstFrame).toBe(
      "hooklusion-profile://office-assistant-default/assets/office-assistant/animations/idle/seated_idle/frame_000.png",
    );
  });
});
