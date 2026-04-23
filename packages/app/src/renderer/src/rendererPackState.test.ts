import { describe, expect, it } from "vitest";

import type { CharacterDesktopSnapshot } from "../../shared/characterDesktop.js";
import { resolveSnapshotPackState } from "./rendererPackState.js";

describe("resolveSnapshotPackState", () => {
  it("prefers provider-common extended states when the pack defines them", () => {
    expect(
      resolveSnapshotPackState(
        {
          provider: "codex",
          sessionId: "session-1",
          turnId: "turn-1",
          state: "tool_active",
          providerState: "tool:read",
        },
        ["idle", "thinking", "tool_active", "tool_read"],
      ),
    ).toBe("tool_read");
  });

  it("falls back to canonical tool_active when the specific pose is missing", () => {
    expect(
      resolveSnapshotPackState(
        createSnapshot({
          state: "tool_active",
          providerState: "tool:read",
        }),
        ["idle", "thinking", "tool_active"],
      ),
    ).toBe("tool_active");
  });

  it("keeps done snapshots unchanged", () => {
    expect(
      resolveSnapshotPackState(createSnapshot({ state: "done" }), [
        "idle",
        "done",
      ]),
    ).toBe("done");
  });
});

function createSnapshot(
  overrides: Partial<CharacterDesktopSnapshot>,
): CharacterDesktopSnapshot {
  return {
    provider: "codex",
    sessionId: "session-1",
    turnId: "turn-1",
    state: "thinking",
    providerState: null,
    ...overrides,
  };
}
