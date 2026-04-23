import { describe, expect, it } from "vitest";

import {
  canRemoveAnimationFrame,
  getSelectedFrameIndexAfterRemoval,
} from "./studioFrameRemoval.js";

describe("studio frame removal", () => {
  it("allows removal only when an animation has more than one frame", () => {
    expect(canRemoveAnimationFrame(0)).toBe(false);
    expect(canRemoveAnimationFrame(1)).toBe(false);
    expect(canRemoveAnimationFrame(2)).toBe(true);
  });

  it("keeps the selection on the same index when a later frame still exists", () => {
    expect(
      getSelectedFrameIndexAfterRemoval({
        selectedFrameIndex: 1,
        frameCountBeforeRemoval: 3,
      }),
    ).toBe(1);
  });

  it("moves the selection to the new last frame when removing the last frame", () => {
    expect(
      getSelectedFrameIndexAfterRemoval({
        selectedFrameIndex: 2,
        frameCountBeforeRemoval: 3,
      }),
    ).toBe(1);
  });
});
