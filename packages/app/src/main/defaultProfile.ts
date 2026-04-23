import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type { AnimationProfile } from "../shared/animationProfile.js";
import { createProfileAssetUrl } from "../shared/profileAssetUrl.js";

interface CreateDefaultAnimationProfileOptions {
  seedProfilePath?: string;
}

export function createDefaultAnimationProfile(
  options: CreateDefaultAnimationProfileOptions = {},
): AnimationProfile {
  const seededProfile = readSeededDefaultAnimationProfile(
    options.seedProfilePath,
  );

  if (seededProfile !== null) {
    return seededProfile;
  }

  return withDerivedAssetSchemaVersion(createFallbackDefaultAnimationProfile());
}

function createFallbackDefaultAnimationProfile(): AnimationProfile {
  const dragAnimation = {
    frames: [
      createBundledFrame("interact", "drag", 0),
      createBundledFrame("interact", "drag", 1),
    ],
    totalDurationMs: 900,
    frameWeights: [1, 1],
    loop: true,
    transitionMs: 80,
  };

  return {
    schemaVersion: 1,
    id: "gpchan-default",
    name: "GP Chan",
    spriteRoot: "assets",
    presentation: {
      floatingMotion: true,
    },
    fallbackState: "idle",
    animations: {
      transition_in: {
        frames: [
          createBundledTransitionFrame("transition_in", 0),
          createBundledTransitionFrame("transition_in", 1),
          createBundledTransitionFrame("transition_in", 2),
          createBundledTransitionFrame("transition_in", 3),
        ],
        totalDurationMs: 480,
        frameWeights: [1, 1, 1, 1],
        loop: false,
        transitionMs: 0,
      },
      transition_out: {
        frames: [
          createBundledTransitionFrame("transition_out", 0),
          createBundledTransitionFrame("transition_out", 1),
          createBundledTransitionFrame("transition_out", 2),
          createBundledTransitionFrame("transition_out", 3),
        ],
        totalDurationMs: 480,
        frameWeights: [1, 1, 1, 1],
        loop: false,
        transitionMs: 0,
      },
      idle: {
        frames: [createBundledFrame("basic", "idle", 0)],
        totalDurationMs: 3000,
        frameWeights: [1],
        loop: true,
        transitionMs: 120,
      },
      session_start: {
        frames: createBundledFrames("basic", "session_start", 3),
        totalDurationMs: 3000,
        frameWeights: [1, 1, 1],
        loop: true,
        transitionMs: 180,
      },
      prompt_received: {
        frames: [
          createBundledFrame("basic", "prompt_received", 0),
          createBundledFrame("basic", "prompt_received", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 150,
      },
      thinking: {
        frames: [
          createBundledFrame("basic", "thinking", 0),
          createBundledFrame("basic", "thinking", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 120,
      },
      tool_active: {
        frames: createBundledFrames("basic", "tool_active", 1),
        totalDurationMs: 3000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      tool_read: {
        frames: [
          createBundledFrame("extension", "tool_read", 0),
          createBundledFrame("extension", "tool_read", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      tool_search: {
        frames: [
          createBundledFrame("extension", "tool_search", 0),
          createBundledFrame("extension", "tool_search", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      tool_explore: {
        frames: [
          createBundledFrame("extension", "tool_explore", 0),
          createBundledFrame("extension", "tool_explore", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      tool_web: {
        frames: [
          createBundledFrame("extension", "tool_web", 0),
          createBundledFrame("extension", "tool_web", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      tool_vcs_read: {
        frames: [
          createBundledFrame("extension", "tool_vcs_read", 0),
          createBundledFrame("extension", "tool_vcs_read", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      tool_vcs_write: {
        frames: [
          createBundledFrame("extension", "tool_vcs_write", 0),
          createBundledFrame("extension", "tool_vcs_write", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      tool_test: {
        frames: [
          createBundledFrame("extension", "tool_test", 0),
          createBundledFrame("extension", "tool_test", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      tool_build: {
        frames: [
          createBundledFrame("extension", "tool_build", 0),
          createBundledFrame("extension", "tool_build", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      hover_in: {
        frames: [
          createBundledFrame("interact", "hover_in", 0),
          createBundledFrame("interact", "hover_in", 1),
        ],
        totalDurationMs: 600,
        frameWeights: [1, 1],
        loop: false,
        transitionMs: 100,
      },
      hover_out: {
        frames: [
          createBundledFrame("interact", "hover_out", 0),
          createBundledFrame("interact", "hover_out", 1),
        ],
        totalDurationMs: 480,
        frameWeights: [1, 1],
        loop: false,
        transitionMs: 100,
      },
      drag: { ...dragAnimation, frames: [...dragAnimation.frames] },
      drag_up: {
        ...dragAnimation,
        frames: createBundledFrames("interact", "drag_up", 3),
        frameWeights: [1, 1, 1],
      },
      drag_down: {
        ...dragAnimation,
        frames: createBundledFrames("interact", "drag_down", 3),
        frameWeights: [1, 1, 1],
      },
      drag_left: {
        ...dragAnimation,
        frames: createBundledFrames("interact", "drag_left", 3),
        frameWeights: [1, 1, 1],
      },
      drag_right: {
        ...dragAnimation,
        frames: createBundledFrames("interact", "drag_right", 3),
        frameWeights: [1, 1, 1],
      },
      click: {
        frames: [
          createBundledFrame("interact", "click", 0),
          createBundledFrame("interact", "click", 1),
        ],
        totalDurationMs: 420,
        frameWeights: [1, 1],
        loop: false,
        transitionMs: 80,
      },
      done: {
        frames: [
          createBundledFrame("basic", "done", 0),
          createBundledFrame("basic", "done", 1),
        ],
        totalDurationMs: 3000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 180,
      },
    },
    states: {
      idle: {
        animation: "idle",
      },
      session_start: {
        animation: "session_start",
        minCycles: 1,
        interruptible: true,
        minDwellMs: 1500,
      },
      prompt_received: {
        animation: "prompt_received",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 3500,
      },
      thinking: {
        animation: "thinking",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 10000,
      },
      tool_active: {
        animation: "tool_active",
      },
      tool_read: {
        animation: "tool_read",
        fallbackState: "tool_active",
        minCycles: 2,
      },
      tool_search: {
        animation: "tool_search",
        fallbackState: "tool_active",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 3000,
      },
      tool_explore: {
        animation: "tool_explore",
        fallbackState: "tool_active",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 3000,
      },
      tool_web: {
        animation: "tool_web",
        fallbackState: "tool_active",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 3000,
      },
      tool_vcs_read: {
        animation: "tool_vcs_read",
        fallbackState: "tool_active",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 3000,
      },
      tool_vcs_write: {
        animation: "tool_vcs_write",
        fallbackState: "tool_active",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 3000,
      },
      tool_test: {
        animation: "tool_test",
        fallbackState: "tool_active",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 3000,
      },
      tool_build: {
        animation: "tool_build",
        fallbackState: "tool_active",
        minCycles: 2,
        interruptible: true,
        minDwellMs: 3000,
      },
      hover_in: {
        animation: "hover_in",
        fallbackState: "thinking",
        allowDuringHookActivity: true,
        holdLastFrame: true,
      },
      hover_out: {
        animation: "hover_out",
        fallbackState: "idle",
        allowDuringHookActivity: true,
      },
      drag: {
        animation: "drag",
        fallbackState: "tool_active",
        allowDuringHookActivity: false,
      },
      drag_up: {
        animation: "drag_up",
        fallbackState: "tool_active",
        allowDuringHookActivity: true,
      },
      drag_down: {
        animation: "drag_down",
        fallbackState: "tool_active",
        allowDuringHookActivity: true,
      },
      drag_left: {
        animation: "drag_left",
        fallbackState: "tool_active",
        allowDuringHookActivity: true,
      },
      drag_right: {
        animation: "drag_right",
        fallbackState: "tool_active",
        allowDuringHookActivity: true,
      },
      click: {
        animation: "click",
        fallbackState: "thinking",
        allowDuringHookActivity: true,
        holdLastFrame: true,
      },
      done: {
        animation: "done",
      },
    },
  };
}

function readSeededDefaultAnimationProfile(seedProfilePath?: string) {
  if (seedProfilePath === undefined) {
    return null;
  }

  try {
    const seededProfile = JSON.parse(
      readFileSync(seedProfilePath, "utf8"),
    ) as AnimationProfile;

    if (seededProfile.id !== "gpchan-default") {
      return null;
    }

    return withDerivedAssetSchemaVersion(seededProfile);
  } catch {
    return null;
  }
}

function withDerivedAssetSchemaVersion(profile: AnimationProfile) {
  const profileHashSource = JSON.stringify({
    ...profile,
    assetSchemaVersion: undefined,
  });
  const derivedAssetSchemaVersion =
    Number.parseInt(
      createHash("sha256").update(profileHashSource).digest("hex").slice(0, 8),
      16,
    ) || 1;

  return {
    ...profile,
    assetSchemaVersion: derivedAssetSchemaVersion,
  };
}

function createBundledFrame(
  group: "basic" | "extension" | "interact",
  state: string,
  frameIndex: number,
) {
  return createProfileAssetUrl(
    "gpchan-default",
    `assets/${group}/${state}/frame_${String(frameIndex).padStart(3, "0")}.png`,
  );
}

function createBundledFrames(
  group: "basic" | "extension" | "interact",
  state: string,
  count: number,
) {
  return Array.from({ length: count }, (_, index) =>
    createBundledFrame(group, state, index),
  );
}

function createBundledTransitionFrame(
  state: "transition_in" | "transition_out",
  frameIndex: number,
) {
  return createProfileAssetUrl(
    "gpchan-default",
    `assets/${state}/frame_${String(frameIndex).padStart(3, "0")}.png`,
  );
}
