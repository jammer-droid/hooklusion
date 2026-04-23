import { describe, expect, it } from "vitest";

import type { AnimationProfile } from "../../shared/animationProfile.js";
import { buildStudioProfileTree } from "./studioTree.js";

describe("buildStudioProfileTree", () => {
  it("groups basic behavior animations above extension animations", () => {
    const tree = buildStudioProfileTree({
      profiles: [createProfile()],
      selectedProfileId: "gpchan-test",
      selectedAnimationName: "thinking",
      activeProfileId: "gpchan-test",
    });

    expect(tree.map((item) => item.id)).toEqual([
      "profile:gpchan-test",
      "profile:gpchan-test:basic",
      "profile:gpchan-test:animation:idle",
      "profile:gpchan-test:animation:session_start",
      "profile:gpchan-test:animation:prompt_received",
      "profile:gpchan-test:animation:thinking",
      "profile:gpchan-test:animation:tool_active",
      "profile:gpchan-test:animation:done",
      "profile:gpchan-test:divider",
      "profile:gpchan-test:interaction",
      "profile:gpchan-test:animation:hover_in",
      "profile:gpchan-test:animation:click",
      "profile:gpchan-test:animation:drag",
      "profile:gpchan-test:interaction:drag-directions",
      "profile:gpchan-test:animation:drag_up",
      "profile:gpchan-test:animation:drag_left",
      "profile:gpchan-test:divider:transitions",
      "profile:gpchan-test:transitions",
      "profile:gpchan-test:animation:transition_in",
      "profile:gpchan-test:animation:transition_out",
      "profile:gpchan-test:divider:ext",
      "profile:gpchan-test:ext",
      "profile:gpchan-test:animation:custom_wave",
    ]);
    expect(tree[1]).toMatchObject({
      kind: "subheader",
      label: "Basic behavior",
    });
    expect(tree[8]).toMatchObject({ kind: "divider" });
    expect(tree[9]).toMatchObject({
      kind: "subheader",
      label: "Interaction",
    });
    expect(tree[12]).toMatchObject({
      kind: "animation",
      animationName: "drag",
    });
    expect(tree[13]).toMatchObject({
      kind: "subheader",
      label: "Drag directions",
    });
    expect(tree[16]).toMatchObject({ kind: "divider" });
    expect(tree[17]).toMatchObject({
      kind: "subheader",
      label: "Transitions",
    });
    expect(tree[20]).toMatchObject({ kind: "divider" });
    expect(tree[21]).toMatchObject({
      kind: "subheader",
      label: "Ext animations",
    });
    expect(tree[5]).toMatchObject({
      kind: "animation",
      animationName: "thinking",
      selected: true,
    });
  });

  it("selects a profile row when no animation is selected", () => {
    const tree = buildStudioProfileTree({
      profiles: [createProfile()],
      selectedProfileId: "gpchan-test",
      selectedAnimationName: null,
      activeProfileId: null,
    });

    expect(tree[0]).toMatchObject({
      kind: "profile",
      selected: true,
      active: false,
    });
    expect(tree.filter((item) => item.kind === "animation")).toHaveLength(14);
    expect(tree.filter((item) => item.kind === "animation")).toEqual(
      Array.from({ length: 14 }, () =>
        expect.objectContaining({ selected: false }),
      ),
    );
  });

  it("can select the profile row while previewing its first animation", () => {
    const tree = buildStudioProfileTree({
      profiles: [createProfile()],
      selectedProfileId: "gpchan-test",
      selectedAnimationName: "idle",
      activeProfileId: null,
      selectedTreeItemId: "profile:gpchan-test",
    });

    expect(tree[0]).toMatchObject({
      kind: "profile",
      selected: true,
    });
    expect(tree.filter((item) => item.kind === "animation")).toEqual([
      expect.objectContaining({ animationName: "idle", selected: false }),
      expect.objectContaining({
        animationName: "session_start",
        selected: false,
      }),
      expect.objectContaining({
        animationName: "prompt_received",
        selected: false,
      }),
      expect.objectContaining({ animationName: "thinking", selected: false }),
      expect.objectContaining({
        animationName: "tool_active",
        selected: false,
      }),
      expect.objectContaining({ animationName: "done", selected: false }),
      expect.objectContaining({ animationName: "hover_in", selected: false }),
      expect.objectContaining({ animationName: "click", selected: false }),
      expect.objectContaining({ animationName: "drag", selected: false }),
      expect.objectContaining({ animationName: "drag_up", selected: false }),
      expect.objectContaining({ animationName: "drag_left", selected: false }),
      expect.objectContaining({
        animationName: "transition_in",
        selected: false,
      }),
      expect.objectContaining({
        animationName: "transition_out",
        selected: false,
      }),
      expect.objectContaining({
        animationName: "custom_wave",
        selected: false,
      }),
    ]);
  });

  it("omits animation rows for collapsed profiles", () => {
    const tree = buildStudioProfileTree({
      profiles: [createProfile()],
      selectedProfileId: "gpchan-test",
      selectedAnimationName: "idle",
      activeProfileId: null,
      collapsedProfileIds: ["gpchan-test"],
    });

    expect(tree).toEqual([
      expect.objectContaining({
        kind: "profile",
        expanded: false,
      }),
    ]);
  });

  it("groups office assistant animations by mapped behavior states", () => {
    const tree = buildStudioProfileTree({
      profiles: [createOfficeAssistantLikeProfile()],
      selectedProfileId: "office-assistant-default",
      selectedAnimationName: "idle",
      activeProfileId: null,
    });

    expect(tree.map((item) => item.id)).toEqual([
      "profile:office-assistant-default",
      "profile:office-assistant-default:basic",
      "profile:office-assistant-default:animation:idle",
      "profile:office-assistant-default:animation:session_start",
      "profile:office-assistant-default:animation:prompt_received",
      "profile:office-assistant-default:animation:thinking",
      "profile:office-assistant-default:animation:tool_active",
      "profile:office-assistant-default:animation:done",
      "profile:office-assistant-default:divider",
      "profile:office-assistant-default:interaction",
      "profile:office-assistant-default:animation:hover_in",
      "profile:office-assistant-default:animation:click",
      "profile:office-assistant-default:animation:drag",
      "profile:office-assistant-default:interaction:drag-directions",
      "profile:office-assistant-default:animation:drag_up",
      "profile:office-assistant-default:animation:drag_right",
      "profile:office-assistant-default:divider:ext",
      "profile:office-assistant-default:ext",
      "profile:office-assistant-default:animation:tool_read",
      "profile:office-assistant-default:animation:tool_build",
    ]);
  });

  it("keeps tool_bash out of the extension list", () => {
    const tree = buildStudioProfileTree({
      profiles: [createProfile()],
      selectedProfileId: "gpchan-test",
      selectedAnimationName: "custom_wave",
      activeProfileId: null,
    });

    expect(
      tree.some(
        (item) =>
          item.kind === "animation" && item.animationName === "tool_bash",
      ),
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
      idle: {
        frames: ["idle_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      done: {
        frames: ["done_a.png", "done_b.png"],
        totalDurationMs: 2000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      prompt_received: {
        frames: ["prompt_received_a.png", "prompt_received_b.png"],
        totalDurationMs: 2000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      session_start: {
        frames: ["session_start_a.png", "session_start_b.png"],
        totalDurationMs: 2000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      thinking: {
        frames: ["thinking_a.png", "thinking_b.png"],
        totalDurationMs: 2000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      tool_active: {
        frames: ["tool_active_a.png", "tool_active_b.png"],
        totalDurationMs: 2000,
        frameWeights: [1, 1],
        loop: true,
        transitionMs: 100,
      },
      hover_in: {
        frames: ["hover_in_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: false,
        transitionMs: 100,
      },
      click: {
        frames: ["click_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: false,
        transitionMs: 100,
      },
      drag: {
        frames: ["drag_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      drag_up: {
        frames: ["drag_up_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      drag_left: {
        frames: ["drag_left_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      custom_wave: {
        frames: ["custom_wave_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      transition_in: {
        frames: ["transition_in_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: false,
        transitionMs: 0,
      },
      transition_out: {
        frames: ["transition_out_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: false,
        transitionMs: 0,
      },
      tool_bash: {
        frames: ["tool_bash_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
    },
    states: {
      idle: { animation: "idle" },
      done: { animation: "done" },
      prompt_received: { animation: "prompt_received" },
      session_start: { animation: "session_start" },
      thinking: { animation: "thinking" },
      tool_active: { animation: "tool_active" },
      hover_in: { animation: "hover_in" },
      click: { animation: "click" },
      drag: { animation: "drag" },
      drag_up: { animation: "drag_up" },
      drag_left: { animation: "drag_left" },
      tool_bash: { animation: "tool_bash" },
    },
  };
}

function createOfficeAssistantLikeProfile(): AnimationProfile {
  return {
    schemaVersion: 1,
    id: "office-assistant-default",
    name: "Office Assistant",
    spriteRoot: "assets",
    animations: {
      idle: {
        frames: ["seated_idle_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      session_start: {
        frames: ["greeting_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      prompt_received: {
        frames: ["attentive_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      thinking: {
        frames: ["think_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      tool_active: {
        frames: ["desk_work_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      done: {
        frames: ["happy_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      hover_in: {
        frames: ["hover_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: false,
        transitionMs: 100,
      },
      click: {
        frames: ["click_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: false,
        transitionMs: 100,
      },
      drag: {
        frames: ["drag_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      drag_up: {
        frames: ["drag_up_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      drag_right: {
        frames: ["drag_right_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      tool_read: {
        frames: ["clipboard_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
      tool_build: {
        frames: ["tool_prop_1.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 100,
      },
    },
    states: {
      idle: { animation: "idle" },
      session_start: { animation: "session_start" },
      prompt_received: { animation: "prompt_received" },
      thinking: { animation: "thinking" },
      tool_active: { animation: "tool_active" },
      done: { animation: "done" },
      hover_in: { animation: "hover_in" },
      click: { animation: "click" },
      drag: { animation: "drag" },
      drag_up: { animation: "drag_up" },
      drag_right: { animation: "drag_right" },
      tool_read: { animation: "tool_read" },
      tool_build: { animation: "tool_build" },
    },
  };
}
