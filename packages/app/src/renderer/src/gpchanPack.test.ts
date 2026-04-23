import { access } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { validateAnimationPack } from "./animationPack.js";
import {
  gpchanAnimationPack,
  gpchanAnimationPackSource,
  gpchanPackSourceDirectoryUrl,
} from "./gpchanPack.js";

describe("gpchanAnimationPack", () => {
  it("covers all six canonical states", () => {
    expect(Object.keys(gpchanAnimationPack.states).sort()).toEqual([
      "done",
      "idle",
      "prompt_received",
      "session_start",
      "thinking",
      "tool_active",
    ]);
  });

  it("uses bundled gpchan sprites for each canonical state", () => {
    for (const [stateName, animation] of Object.entries(
      gpchanAnimationPackSource.states,
    )) {
      if (stateName === "idle") {
        expect(animation?.frames).toEqual(["sprites/gpchan/idle.png"]);
        expect(animation?.durationsMs).toEqual([3000]);
        continue;
      }

      expect(animation?.frames).toEqual([
        expect.stringMatching(/_a\.png$/),
        expect.stringMatching(/_b\.png$/),
      ]);
      expect(animation?.durationsMs).toEqual([1500, 1500]);
    }
  });

  it("validates successfully", () => {
    expect(() =>
      validateAnimationPack(gpchanAnimationPackSource),
    ).not.toThrow();
  });

  it("references gpchan sprite files that exist on disk", async () => {
    for (const animation of Object.values(gpchanAnimationPackSource.states)) {
      if (animation === undefined) {
        continue;
      }

      for (const framePath of animation.frames) {
        await expect(
          access(new URL(framePath, gpchanPackSourceDirectoryUrl)),
        ).resolves.toBeUndefined();
      }
    }
  });
});
