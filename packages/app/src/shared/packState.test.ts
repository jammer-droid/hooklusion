import { describe, expect, it } from "vitest";

import { INTERACTION_PACK_STATES, resolvePackState } from "./packState.js";

describe("resolvePackState", () => {
  it("includes directional drag states in the interaction pack state list", () => {
    expect(INTERACTION_PACK_STATES).toEqual([
      "hover_in",
      "hover_out",
      "drag",
      "drag_up",
      "drag_down",
      "drag_left",
      "drag_right",
      "click",
    ]);
  });

  it("maps tool provider states to their extended pack states when available", () => {
    expect(
      resolvePackState({
        state: "tool_active",
        providerState: "tool:read",
        availableStates: ["idle", "tool_active", "tool_read", "thinking"],
      }),
    ).toBe("tool_read");
  });

  it("falls back to tool_active when the provider-specific state is unavailable", () => {
    expect(
      resolvePackState({
        state: "tool_active",
        providerState: "tool:read",
        availableStates: ["idle", "tool_active", "thinking"],
      }),
    ).toBe("tool_active");
  });

  it("falls back to thinking when tool_active is unavailable", () => {
    expect(
      resolvePackState({
        state: "tool_active",
        providerState: "tool:build",
        availableStates: ["idle", "thinking"],
      }),
    ).toBe("thinking");
  });

  it("keeps non-tool canonical states unchanged", () => {
    expect(
      resolvePackState({
        state: "done",
        providerState: null,
        availableStates: ["idle", "done"],
      }),
    ).toBe("done");
  });

  it("throws when a non-tool canonical state is missing instead of falling back silently", () => {
    expect(() =>
      resolvePackState({
        state: "done",
        providerState: null,
        availableStates: ["idle"],
      }),
    ).toThrow("Could not resolve a pack state for done.");
  });
});
