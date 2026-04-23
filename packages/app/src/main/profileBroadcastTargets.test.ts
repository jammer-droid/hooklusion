import { describe, expect, it } from "vitest";

import { resolveProfileBroadcastSessionKeys } from "./profileBroadcastTargets.js";

describe("resolveProfileBroadcastSessionKeys", () => {
  it("rebroadcasts the active session when the default profile changes without an override", () => {
    expect(
      resolveProfileBroadcastSessionKeys({
        appliedSessionKey: null,
        activeSessionKey: "session-1",
        hasActiveSessionOverride: false,
      }),
    ).toEqual([null, "session-1"]);
  });

  it("does not rebroadcast the active session when it has an explicit override", () => {
    expect(
      resolveProfileBroadcastSessionKeys({
        appliedSessionKey: null,
        activeSessionKey: "session-1",
        hasActiveSessionOverride: true,
      }),
    ).toEqual([null]);
  });

  it("keeps explicit session applies scoped to that session", () => {
    expect(
      resolveProfileBroadcastSessionKeys({
        appliedSessionKey: "session-1",
        activeSessionKey: "session-1",
        hasActiveSessionOverride: true,
      }),
    ).toEqual(["session-1"]);
  });
});
