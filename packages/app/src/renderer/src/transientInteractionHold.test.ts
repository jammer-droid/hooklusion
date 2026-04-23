import { describe, expect, it } from "vitest";

import {
  resolveHeldTransientInteractionState,
  shouldHoldTransientInteraction,
} from "./transientInteractionHold.js";

describe("shouldHoldTransientInteraction", () => {
  it("holds only when the transient state is still the presented state", () => {
    expect(
      shouldHoldTransientInteraction({
        interactionState: "click",
        holdLastFrame: true,
        presentedState: "click",
      }),
    ).toBe(true);

    expect(
      shouldHoldTransientInteraction({
        interactionState: "click",
        holdLastFrame: true,
        presentedState: "tool_search",
      }),
    ).toBe(false);
  });
});

describe("resolveHeldTransientInteractionState", () => {
  it("keeps the held transient state while the base state is unchanged", () => {
    expect(
      resolveHeldTransientInteractionState({
        heldInteraction: {
          interactionState: "click",
          baseState: "idle",
        },
        baseState: "idle",
        availableStates: ["idle", "click"],
      }),
    ).toBe("click");
  });

  it("releases the held transient state when the base state changes", () => {
    expect(
      resolveHeldTransientInteractionState({
        heldInteraction: {
          interactionState: "click",
          baseState: "idle",
        },
        baseState: "tool_search",
        availableStates: ["idle", "tool_search", "click"],
      }),
    ).toBeNull();
  });
});
