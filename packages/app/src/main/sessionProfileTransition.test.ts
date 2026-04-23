import { describe, expect, it } from "vitest";

import { shouldBroadcastResolvedProfileForSessionChange } from "./sessionProfileTransition.js";

describe("shouldBroadcastResolvedProfileForSessionChange", () => {
  it("broadcasts when the session key changes to a new live session", () => {
    expect(
      shouldBroadcastResolvedProfileForSessionChange("session-1", "session-2"),
    ).toBe(true);
  });

  it("broadcasts when a live session ends", () => {
    expect(
      shouldBroadcastResolvedProfileForSessionChange("session-1", null),
    ).toBe(true);
  });

  it("does not broadcast when the session key is unchanged", () => {
    expect(
      shouldBroadcastResolvedProfileForSessionChange("session-1", "session-1"),
    ).toBe(false);
  });
});
