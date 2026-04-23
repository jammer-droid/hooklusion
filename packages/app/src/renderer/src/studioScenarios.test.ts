import { describe, expect, it } from "vitest";

import { createStudioScenarioTimeline } from "./studioScenarios.js";

describe("studio scenarios", () => {
  it("creates a fast prompt to done preview timeline", () => {
    expect(createStudioScenarioTimeline("prompt-done-fast")).toEqual([
      { atMs: 0, state: "prompt_received" },
      { atMs: 200, state: "done" },
      { atMs: 2400, state: "idle" },
    ]);
  });
});
