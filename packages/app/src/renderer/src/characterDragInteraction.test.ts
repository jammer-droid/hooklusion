import { describe, expect, it } from "vitest";

import { finishCharacterDragInteraction } from "./characterDragInteraction.js";

describe("finishCharacterDragInteraction", () => {
  it("clears drag interaction after movement", () => {
    expect(
      finishCharacterDragInteraction({
        isDragging: true,
        didDragMove: true,
      }),
    ).toEqual({
      isDragging: false,
      didDragMove: false,
      endedWithMovement: true,
      shouldClearInteraction: true,
      shouldTriggerClick: false,
    });
  });

  it("falls back to click for stationary drags", () => {
    expect(
      finishCharacterDragInteraction({
        isDragging: true,
        didDragMove: false,
      }),
    ).toEqual({
      isDragging: false,
      didDragMove: false,
      endedWithMovement: false,
      shouldClearInteraction: false,
      shouldTriggerClick: true,
    });
  });

  it("suppresses click fallback for cancelled drags", () => {
    expect(
      finishCharacterDragInteraction({
        isDragging: true,
        didDragMove: false,
        triggerClickWhenStationary: false,
      }),
    ).toEqual({
      isDragging: false,
      didDragMove: false,
      endedWithMovement: false,
      shouldClearInteraction: false,
      shouldTriggerClick: false,
    });
  });
});
