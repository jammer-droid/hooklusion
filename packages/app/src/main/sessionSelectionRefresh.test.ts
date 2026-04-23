import { describe, expect, it } from "vitest";

import { shouldRefreshDisplayedSessionSelection } from "./sessionSelectionRefresh.js";

describe("shouldRefreshDisplayedSessionSelection", () => {
  it("refreshes when the selected session changes", () => {
    expect(
      shouldRefreshDisplayedSessionSelection("claude:first", "codex:second"),
    ).toBe(true);
  });

  it("refreshes when the selection clears", () => {
    expect(shouldRefreshDisplayedSessionSelection("claude:first", null)).toBe(
      true,
    );
  });

  it("does not refresh when the selected session stays the same", () => {
    expect(
      shouldRefreshDisplayedSessionSelection("claude:first", "claude:first"),
    ).toBe(false);
  });
});
