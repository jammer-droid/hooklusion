import { describe, expect, it } from "vitest";

import { shouldOpenLaunchVisibilityFallback } from "./launchVisibilityFallback.js";

describe("shouldOpenLaunchVisibilityFallback", () => {
  it("opens fallback only for packaged mac launches when the character window is still hidden", () => {
    expect(
      shouldOpenLaunchVisibilityFallback({
        isPackaged: true,
        platform: "darwin",
      }),
    ).toBe(true);
  });

  it("does not open fallback for non-packaged or non-mac launches", () => {
    expect(
      shouldOpenLaunchVisibilityFallback({
        isPackaged: false,
        platform: "darwin",
      }),
    ).toBe(false);
    expect(
      shouldOpenLaunchVisibilityFallback({
        isPackaged: true,
        platform: "linux",
      }),
    ).toBe(false);
  });
});
