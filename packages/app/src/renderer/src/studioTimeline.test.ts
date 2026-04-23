import { describe, expect, it } from "vitest";

import { buildStudioTimeline } from "./studioTimeline.js";

describe("buildStudioTimeline", () => {
  it("builds variable-width frame cells from weights", () => {
    expect(
      buildStudioTimeline(
        {
          frames: ["a.png", "b.png", "c.png"],
          totalDurationMs: 1200,
          frameWeights: [1, 2, 1],
          loop: true,
          transitionMs: 100,
        },
        1,
      ),
    ).toEqual({
      totalDurationMs: 1200,
      frames: [
        {
          index: 0,
          indexLabel: "01",
          path: "a.png",
          weight: 1,
          widthPercent: 25,
          derivedDurationMs: 300,
          selected: false,
        },
        {
          index: 1,
          indexLabel: "02",
          path: "b.png",
          weight: 2,
          widthPercent: 50,
          derivedDurationMs: 600,
          selected: true,
        },
        {
          index: 2,
          indexLabel: "03",
          path: "c.png",
          weight: 1,
          widthPercent: 25,
          derivedDurationMs: 300,
          selected: false,
        },
      ],
    });
  });
});
