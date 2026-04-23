import { describe, expect, it } from "vitest";

import type { AnimationProfile } from "../../shared/animationProfile.js";
import { getStudioPreviewFrameUrls } from "./studioPreview.js";

describe("studio preview", () => {
  it("returns frame URLs for the selected animation", () => {
    const frames = getStudioPreviewFrameUrls(createProfile(), "idle_breathe");

    expect(frames).toEqual(["assets/idle_a.png", "assets/idle_b.png"]);
  });

  it("materializes frame URLs with a resolver", () => {
    const frames = getStudioPreviewFrameUrls(createProfile(), "idle_breathe", {
      resolveFrameUrl: (framePath) => `/bundled/${framePath}`,
    });

    expect(frames).toEqual([
      "/bundled/assets/idle_a.png",
      "/bundled/assets/idle_b.png",
    ]);
  });

  it("does not prefix profile asset URLs with the sprite root", () => {
    const profile = createProfile();

    const frames = getStudioPreviewFrameUrls(
      {
        ...profile,
        animations: {
          idle_breathe: {
            ...profile.animations.idle_breathe,
            frames: ["hooklusion-profile://gpchan-test/assets/imported.png"],
          },
        },
      },
      "idle_breathe",
    );

    expect(frames).toEqual([
      "hooklusion-profile://gpchan-test/assets/imported.png",
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
