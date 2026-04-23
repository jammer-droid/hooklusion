import { describe, expect, it } from "vitest";

import type { AnimationProfile } from "../../shared/animationProfile.js";
import {
  buildStatePolicySectionTitle,
  buildStudioInspector,
  STATE_POLICY_FIELD_HELP,
  shouldShowStudioLoopControl,
  shouldShowStudioMinDwellControl,
} from "./studioInspector.js";

describe("buildStudioInspector", () => {
  it("describes the selected animation in profile and state context", () => {
    const inspector = buildStudioInspector({
      profile: createProfile(),
      animationName: "thinking",
      selectedFrameIndex: 1,
      selectedStateName: "thinking",
    });

    expect(inspector).toEqual({
      viewing: {
        profileName: "GP Chan Test",
        animationName: "thinking",
        frameLabel: "02 / 02",
        framePath: "thinking_b.png",
      },
      usedByStates: [
        { stateName: "idle", editing: false },
        { stateName: "thinking", editing: true },
      ],
      statePolicy: {
        stateName: "thinking",
        animationName: "thinking",
        minDwellMs: 800,
        interruptible: true,
      },
      derived: {
        frameDurationsMs: [1000, 1000],
        totalDurationMs: 2000,
        loop: true,
      },
    });
  });

  it("formats profile asset URLs as short project paths", () => {
    const profile = createProfile();
    const inspector = buildStudioInspector({
      profile: {
        ...profile,
        animations: {
          thinking: {
            ...profile.animations.thinking,
            frames: [
              "hooklusion-profile://gpchan-test/assets/imported_frame.png",
            ],
          },
        },
      },
      animationName: "thinking",
      selectedFrameIndex: 0,
      selectedStateName: "thinking",
    });

    expect(inspector.viewing.framePath).toBe(
      "profiles/gpchan-test/assets/imported_frame.png",
    );
  });

  it("surfaces interaction hook policy for interaction states", () => {
    const inspector = buildStudioInspector({
      profile: {
        ...createProfile(),
        states: {
          ...createProfile().states,
          drag: {
            animation: "thinking",
            allowDuringHookActivity: true,
          },
        },
      },
      animationName: "thinking",
      selectedFrameIndex: 0,
      selectedStateName: "drag",
    });

    expect(inspector.statePolicy.allowDuringHookActivity).toBe(true);
  });

  it("surfaces transient hold-last-frame policy for transient interactions", () => {
    const baseProfile = createProfile();
    const inspector = buildStudioInspector({
      profile: {
        ...baseProfile,
        animations: {
          ...baseProfile.animations,
          click_once: {
            frames: ["click_a.png"],
            totalDurationMs: 240,
            frameWeights: [1],
            loop: false,
            transitionMs: 0,
          },
        },
        states: {
          ...baseProfile.states,
          click: {
            animation: "click_once",
            holdLastFrame: true,
          },
        },
      },
      animationName: "click_once",
      selectedFrameIndex: 0,
      selectedStateName: "click",
    });

    expect(inspector.statePolicy.holdLastFrame).toBe(true);
  });

  it("returns transition inspector data without state policy when the animation is not mapped", () => {
    const profile = createProfile();
    const inspector = buildStudioInspector({
      profile: {
        ...profile,
        animations: {
          ...profile.animations,
          transition_out: {
            frames: ["transition_out_a.png", "transition_out_b.png"],
            totalDurationMs: 400,
            frameWeights: [1, 1],
            loop: false,
            transitionMs: 0,
          },
        },
      },
      animationName: "transition_out",
      selectedFrameIndex: 0,
      selectedStateName: null,
    });

    expect(inspector.viewing.animationName).toBe("transition_out");
    expect(inspector.usedByStates).toEqual([]);
    expect(inspector.statePolicy).toBeNull();
    expect(inspector.derived).toEqual({
      frameDurationsMs: [200, 200],
      totalDurationMs: 400,
      loop: false,
    });
  });
});

describe("buildStatePolicySectionTitle", () => {
  it("does not append the selected state name to the section heading", () => {
    expect(buildStatePolicySectionTitle("session_start")).toBe("State policy");
  });

  it("uses a transition heading when no state mapping exists", () => {
    expect(buildStatePolicySectionTitle(null)).toBe("Transition");
  });
});

describe("STATE_POLICY_FIELD_HELP", () => {
  it("describes every editable state policy field for hover help", () => {
    expect(STATE_POLICY_FIELD_HELP).toEqual({
      durationMs:
        "Total playback time for the selected animation, in milliseconds.",
      loop: "Repeats the selected animation until another state changes it.",
      minDwellMs:
        "Minimum time this state must remain active before it can change.",
      interruptible:
        "Allows a new state request to interrupt this state before dwell or cycle limits finish.",
      allowDuringHookActivity:
        "Allows this interaction state to override hook-driven animation while hook activity is visible.",
      holdLastFrame:
        "Keeps the final transient interaction frame visible until another state change replaces it.",
    });
  });
});

describe("studio inspector field visibility", () => {
  it("hides the loop toggle for reserved transition animations", () => {
    expect(shouldShowStudioLoopControl("transition_in", null)).toBe(false);
    expect(shouldShowStudioLoopControl("transition_out", null)).toBe(false);
    expect(shouldShowStudioLoopControl("thinking", "thinking")).toBe(true);
  });

  it("hides the loop toggle for transient interaction states", () => {
    expect(shouldShowStudioLoopControl("click_once", "click")).toBe(false);
    expect(shouldShowStudioLoopControl("hover_in_once", "hover_in")).toBe(
      false,
    );
  });

  it("shows min dwell only when a state is non-interruptible", () => {
    expect(shouldShowStudioMinDwellControl(true)).toBe(false);
    expect(shouldShowStudioMinDwellControl(false)).toBe(true);
  });
});

function createProfile(): AnimationProfile {
  return {
    schemaVersion: 1,
    id: "gpchan-test",
    name: "GP Chan Test",
    spriteRoot: "assets",
    animations: {
      thinking: {
        frames: ["thinking_a.png", "thinking_b.png"],
        totalDurationMs: 2000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
    },
    states: {
      idle: { animation: "thinking" },
      thinking: {
        animation: "thinking",
        minDwellMs: 800,
        interruptible: true,
      },
    },
  };
}
