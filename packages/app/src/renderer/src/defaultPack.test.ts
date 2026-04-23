import { access } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { validateAnimationPack } from "./animationPack.js";
import {
  defaultAnimationPack,
  defaultAnimationPackSource,
  defaultPackSourceDirectoryUrl,
} from "./defaultPack.js";

describe("defaultAnimationPack", () => {
  it("covers all six canonical states", () => {
    expect(Object.keys(defaultAnimationPack.states).sort()).toEqual([
      "done",
      "idle",
      "prompt_received",
      "session_start",
      "thinking",
      "tool_active",
    ]);
  });

  it("validates successfully", () => {
    expect(() =>
      validateAnimationPack(defaultAnimationPackSource),
    ).not.toThrow();
  });

  it("references placeholder sprite files that exist on disk", async () => {
    for (const animation of Object.values(defaultAnimationPackSource.states)) {
      if (animation === undefined) {
        continue;
      }

      for (const framePath of animation.frames) {
        await expect(
          access(new URL(framePath, defaultPackSourceDirectoryUrl)),
        ).resolves.toBeUndefined();
      }
    }
  });
});
