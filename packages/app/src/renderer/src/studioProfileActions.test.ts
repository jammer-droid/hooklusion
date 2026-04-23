import { describe, expect, it } from "vitest";

import { PROFILE_ACTION_LAYOUT } from "./studioProfileActions.js";

describe("PROFILE_ACTION_LAYOUT", () => {
  it("keeps default and export on the left while save sits beside delete", () => {
    expect(PROFILE_ACTION_LAYOUT.start).toEqual(["default", "export"]);
    expect(PROFILE_ACTION_LAYOUT.end).toEqual(["save", "delete"]);
  });
});
