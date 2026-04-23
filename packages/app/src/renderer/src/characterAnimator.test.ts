import { describe, expect, it } from "vitest";

import { createCharacterAnimator } from "./characterAnimator.js";
import { defaultAnimationPack } from "./defaultPack.js";

describe("createCharacterAnimator", () => {
  it("renders the requested canonical state", () => {
    const animator = createCharacterAnimator(
      defaultAnimationPack,
      new URL("https://example.invalid/"),
    );

    animator.setState("session_start");

    expect(animator.getRenderModel()).toMatchObject({
      state: "session_start",
      transitionMs: 180,
    });
    expect(animator.getRenderModel().frameUrl).toContain("image/svg+xml");
  });

  it("advances frames over time", () => {
    const animator = createCharacterAnimator(
      defaultAnimationPack,
      new URL("https://example.invalid/"),
    );

    animator.setState("thinking");
    const before = animator.getRenderModel().frameUrl;
    animator.tick(200);

    expect(animator.getRenderModel().frameUrl).not.toBe(before);
  });

  it("holds slow test frames for one and a half seconds before advancing", () => {
    const animator = createCharacterAnimator(
      {
        name: "Slow Test Pack",
        states: {
          idle: {
            frames: ["sprites/thinking_a.png"],
            durationsMs: [1500],
            loop: true,
            transitionMs: 120,
          },
          thinking: {
            frames: ["sprites/thinking_a.png", "sprites/thinking_b.png"],
            durationsMs: [1500, 1500],
            loop: true,
            transitionMs: 120,
          },
        },
      },
      new URL("https://example.invalid/"),
    );

    animator.setState("thinking");
    const firstFrame = animator.getRenderModel().frameUrl;

    animator.tick(1499);
    expect(animator.getRenderModel().frameUrl).toBe(firstFrame);

    animator.tick(1);
    expect(animator.getRenderModel().frameUrl).toContain("thinking_b.png");
  });

  it("exposes transition timing and previous frame url on state change", () => {
    const animator = createCharacterAnimator(
      defaultAnimationPack,
      new URL("https://example.invalid/"),
    );

    animator.setState("thinking");
    const before = animator.getRenderModel().frameUrl;

    animator.setState("done");

    expect(animator.getRenderModel()).toMatchObject({
      state: "done",
      transitionMs: 180,
      previousFrameUrl: before,
    });
  });

  it("replaces the active pack without changing the live state", () => {
    const animator = createCharacterAnimator(
      {
        name: "First Pack",
        states: {
          idle: {
            frames: ["sprites/first_thinking.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 90,
          },
          thinking: {
            frames: ["sprites/first_thinking.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 90,
          },
        },
      },
      new URL("https://example.invalid/"),
    );

    animator.setState("thinking");
    const before = animator.getRenderModel();

    animator.setPack({
      name: "Second Pack",
      states: {
        idle: {
          frames: ["sprites/second_thinking.png"],
          durationsMs: [1000],
          loop: true,
          transitionMs: 110,
        },
        thinking: {
          frames: ["sprites/second_thinking.png"],
          durationsMs: [1000],
          loop: true,
          transitionMs: 110,
        },
      },
    });

    expect(animator.getRenderModel()).toMatchObject({
      state: "thinking",
      frameUrl: "https://example.invalid/sprites/second_thinking.png",
      previousFrameUrl: before.frameUrl,
      transitionId: before.transitionId + 1,
      transitionMs: 110,
    });
  });

  it("replaces the active pack using an explicit next state when the previous state is unavailable", () => {
    const animator = createCharacterAnimator(
      {
        name: "First Pack",
        states: {
          idle: {
            frames: ["sprites/first_idle.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 90,
          },
          tool_read: {
            frames: ["sprites/first_tool_read.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 90,
          },
        },
      },
      new URL("https://example.invalid/"),
    );

    animator.setState("tool_read");
    const before = animator.getRenderModel();

    animator.setPack(
      {
        name: "Second Pack",
        states: {
          idle: {
            frames: ["sprites/second_idle.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 110,
          },
          tool_active: {
            frames: ["sprites/second_tool_active.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 110,
          },
        },
      },
      {
        state: "tool_active",
      },
    );

    expect(animator.getRenderModel()).toMatchObject({
      state: "tool_active",
      frameUrl: "https://example.invalid/sprites/second_tool_active.png",
      previousFrameUrl: before.frameUrl,
      transitionId: before.transitionId + 1,
      transitionMs: 110,
    });
  });

  it("adds deterministic runtime motion while holding an A-only frame", () => {
    const animator = createCharacterAnimator(
      {
        name: "A-only Pack",
        states: {
          idle: {
            frames: ["sprites/thinking_a.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 120,
          },
          thinking: {
            frames: ["sprites/thinking_a.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 120,
          },
        },
      },
      new URL("https://example.invalid/"),
    );

    const before = animator.getRenderModel();
    animator.tick(500);
    const after = animator.getRenderModel();

    expect(after.frameUrl).toBe(before.frameUrl);
    expect(after.motionTransform).not.toBe(before.motionTransform);
    expect(after.motionTransform).toMatch(
      /^translate3d\(0, -?\d+\.\d{2}px, 0\) scale\(1\.\d{4}\)$/,
    );
  });

  it("plays a temporary transition animation before returning to the active state", () => {
    const animator = createCharacterAnimator(
      {
        name: "Transition Pack",
        states: {
          idle: {
            frames: ["sprites/thinking.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 120,
          },
          thinking: {
            frames: ["sprites/thinking.png"],
            durationsMs: [1000],
            loop: true,
            transitionMs: 120,
          },
        },
      },
      new URL("https://example.invalid/"),
    );

    animator.setState("thinking");
    animator.playTemporaryAnimation({
      frames: ["sprites/transition_a.png", "sprites/transition_b.png"],
      durationsMs: [100, 100],
      loop: false,
      transitionMs: 0,
    });

    expect(animator.getRenderModel().frameUrl).toBe(
      "https://example.invalid/sprites/transition_a.png",
    );

    animator.tick(100);
    expect(animator.getRenderModel().frameUrl).toBe(
      "https://example.invalid/sprites/transition_b.png",
    );

    animator.tick(100);
    expect(animator.getRenderModel().frameUrl).toBe(
      "https://example.invalid/sprites/thinking.png",
    );
  });
});
