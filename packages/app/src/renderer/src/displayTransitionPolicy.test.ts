import { describe, expect, it } from "vitest";

import { shouldPlayDisplayTransition } from "./displayTransitionPolicy.js";

describe("shouldPlayDisplayTransition", () => {
  it("plays when the displayed session changes even if the profile stays the same", () => {
    expect(
      shouldPlayDisplayTransition({
        previousSessionKey: "claude:first",
        nextSessionKey: "codex:second",
        packChanged: false,
        profileChanged: false,
      }),
    ).toBe(true);
  });

  it("plays when the profile changes within the same session", () => {
    expect(
      shouldPlayDisplayTransition({
        previousSessionKey: "claude:first",
        nextSessionKey: "claude:first",
        packChanged: true,
        profileChanged: true,
      }),
    ).toBe(true);
  });

  it("does not play for ordinary state updates in the same session and profile", () => {
    expect(
      shouldPlayDisplayTransition({
        previousSessionKey: "claude:first",
        nextSessionKey: "claude:first",
        packChanged: false,
        profileChanged: false,
      }),
    ).toBe(false);
  });
});
