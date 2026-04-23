import { describe, expect, it } from "vitest";

import type { AnimationProfile } from "../../shared/animationProfile.js";
import type { CharacterDesktopSnapshot } from "../../shared/characterDesktop.js";
import {
  readInteractionAnimationDurationMs,
  resolvePresentedPackState,
} from "./interactionPresentation.js";

describe("resolvePresentedPackState", () => {
  it("allows drag to override an interruptible hook-driven state when enabled", () => {
    expect(
      resolvePresentedPackState({
        snapshot: createSnapshot({
          state: "session_start",
        }),
        interactionState: "drag",
        profile: createProfile({
          session_start: {
            animation: "thinking_loop",
            interruptible: true,
          },
          drag: {
            animation: "drag_loop",
            allowDuringHookActivity: true,
          },
        }),
        availableStates: ["idle", "session_start", "drag"],
      }),
    ).toBe("drag");
  });

  it("keeps the hook-driven state while drag is active if the base state is non-interruptible", () => {
    expect(
      resolvePresentedPackState({
        snapshot: createSnapshot({
          state: "session_start",
        }),
        interactionState: "drag",
        profile: createProfile({
          session_start: {
            animation: "thinking_loop",
            interruptible: false,
          },
          drag: {
            animation: "drag_loop",
            allowDuringHookActivity: true,
          },
        }),
        availableStates: ["idle", "session_start", "drag"],
      }),
    ).toBe("session_start");
  });

  it("keeps the hook-driven state when click is blocked during hook activity", () => {
    expect(
      resolvePresentedPackState({
        snapshot: createSnapshot({
          state: "tool_active",
        }),
        interactionState: "click",
        profile: createProfile({
          click: {
            animation: "click_once",
            allowDuringHookActivity: false,
          },
        }),
        availableStates: ["idle", "thinking", "tool_active", "click"],
      }),
    ).toBe("tool_active");
  });

  it("falls back to the live state when the interaction pose is unavailable", () => {
    expect(
      resolvePresentedPackState({
        snapshot: createSnapshot({
          state: "thinking",
        }),
        interactionState: "drag",
        profile: createProfile({
          drag: {
            animation: "drag_loop",
            allowDuringHookActivity: true,
          },
        }),
        availableStates: ["idle", "thinking"],
      }),
    ).toBe("thinking");
  });

  it("falls back to the live state when drag is active without focus", () => {
    expect(
      resolvePresentedPackState({
        snapshot: createSnapshot({
          state: "idle",
        }),
        interactionState: "drag",
        profile: createProfile({
          drag: {
            animation: "drag_loop",
            allowDuringHookActivity: true,
          },
        }),
        availableStates: ["idle", "drag"],
        focused: false,
      }),
    ).toBe("idle");
  });
});

describe("readInteractionAnimationDurationMs", () => {
  it("uses the mapped interaction animation duration when available", () => {
    expect(
      readInteractionAnimationDurationMs(
        createProfile({
          click: {
            animation: "click_once",
            allowDuringHookActivity: false,
          },
        }),
        "click",
      ),
    ).toBe(320);
  });

  it("falls back to the default short duration when the state is unmapped", () => {
    expect(
      readInteractionAnimationDurationMs(createProfile(), "hover_in"),
    ).toBeNull();
  });
});

function createSnapshot(
  overrides: Partial<CharacterDesktopSnapshot>,
): CharacterDesktopSnapshot {
  return {
    provider: "codex",
    sessionId: "session-1",
    turnId: "turn-1",
    state: "idle",
    providerState: null,
    ...overrides,
  };
}

function createProfile(
  overrides: Partial<AnimationProfile["states"]> = {},
): AnimationProfile {
  return {
    schemaVersion: 1,
    id: "gpchan-test",
    name: "GP Chan Test",
    spriteRoot: "assets",
    animations: {
      idle_loop: {
        frames: ["idle.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      thinking_loop: {
        frames: ["thinking_a.png", "thinking_b.png"],
        totalDurationMs: 2000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      drag_loop: {
        frames: ["drag_a.png", "drag_b.png"],
        totalDurationMs: 1000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 90,
      },
      click_once: {
        frames: ["click_a.png", "click_b.png"],
        totalDurationMs: 320,
        frameWeights: [1, 1],
        loop: false,
        transitionMs: 60,
      },
    },
    states: {
      idle: { animation: "idle_loop" },
      session_start: { animation: "thinking_loop" },
      prompt_received: { animation: "thinking_loop" },
      thinking: { animation: "thinking_loop" },
      tool_active: { animation: "thinking_loop" },
      done: { animation: "thinking_loop" },
      ...overrides,
    },
  };
}
