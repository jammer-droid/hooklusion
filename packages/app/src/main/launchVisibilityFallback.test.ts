import { describe, expect, it } from "vitest";

import { shouldOpenLaunchVisibilityFallback } from "./launchVisibilityFallback.js";

describe("shouldOpenLaunchVisibilityFallback", () => {
  it("keeps the launch fallback disabled for packaged mac launches", () => {
    expect(
      shouldOpenLaunchVisibilityFallback({
        isPackaged: true,
        platform: "darwin",
      }),
    ).toBe(false);
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
