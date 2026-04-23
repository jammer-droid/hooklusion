import { describe, expect, it } from "vitest";

import { resolveStudioDefaultProfileId } from "./studioDefaultProfile.js";

describe("resolveStudioDefaultProfileId", () => {
  it("keeps the reported default id when it exists in the loaded profiles", () => {
    expect(
      resolveStudioDefaultProfileId(
        ["gpchan-default", "office-assistant-default"],
        "office-assistant-default",
      ),
    ).toBe("office-assistant-default");
  });

  it("falls back to the first profile when the reported default is missing", () => {
    expect(
      resolveStudioDefaultProfileId(["gpchan-default", "custom-profile"], null),
    ).toBe("gpchan-default");
  });

  it("returns null when there are no profiles", () => {
    expect(resolveStudioDefaultProfileId([], "gpchan-default")).toBeNull();
  });
});
