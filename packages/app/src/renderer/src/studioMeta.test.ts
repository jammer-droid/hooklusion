import { describe, expect, it } from "vitest";

import { buildStudioMetaBar } from "./studioMeta.js";

describe("buildStudioMetaBar", () => {
  it("summarizes selected animation playback fields", () => {
    expect(
      buildStudioMetaBar({
        animationName: "thinking",
        frameCount: 2,
        playing: false,
      }),
    ).toEqual({
      editingLabel: "Editing · thinking · 2 frames",
      playPauseLabel: "Play",
      previousLabel: "Prev frame",
      nextLabel: "Next",
    });
  });

  it("uses pause label while playing", () => {
    const meta = buildStudioMetaBar({
      animationName: "idle",
      frameCount: 1,
      playing: true,
    });

    expect(meta.playPauseLabel).toBe("Pause");
  });
});
