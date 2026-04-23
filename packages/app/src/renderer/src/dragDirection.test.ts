import { describe, expect, it } from "vitest";

import { resolveDirectionalDragState } from "./dragDirection.js";

describe("resolveDirectionalDragState", () => {
  it("resolves horizontal movement into a directional drag state when available", () => {
    expect(
      resolveDirectionalDragState({
        deltaX: -18,
        deltaY: 4,
        lastDirection: null,
        availableStates: ["idle", "drag", "drag_left"],
      }),
    ).toEqual({
      direction: "left",
      interactionState: "drag_left",
    });
  });

  it("keeps the previous direction while movement stays below the threshold", () => {
    expect(
      resolveDirectionalDragState({
        deltaX: 3,
        deltaY: 2,
        lastDirection: "right",
        availableStates: ["idle", "drag", "drag_right"],
      }),
    ).toEqual({
      direction: "right",
      interactionState: "drag_right",
    });
  });

  it("falls back to the base drag state when the resolved directional state is unavailable", () => {
    expect(
      resolveDirectionalDragState({
        deltaX: 0,
        deltaY: -16,
        lastDirection: null,
        availableStates: ["idle", "drag"],
      }),
    ).toEqual({
      direction: "up",
      interactionState: "drag",
    });
  });

  it("updates the sticky direction when a new valid movement vector arrives", () => {
    expect(
      resolveDirectionalDragState({
        deltaX: 2,
        deltaY: 14,
        lastDirection: "left",
        availableStates: ["idle", "drag", "drag_down"],
      }),
    ).toEqual({
      direction: "down",
      interactionState: "drag_down",
    });
  });
});
