import type { ProfileStateName } from "../../shared/animationProfile.js";

export type StudioScenarioId =
  | "prompt-done-fast"
  | "prompt-tool-done"
  | "rapid-tools"
  | "idle-timeout";

export interface StudioScenarioStep {
  atMs: number;
  state: ProfileStateName;
}

export const STUDIO_SCENARIO_LABELS: Record<StudioScenarioId, string> = {
  "prompt-done-fast": "Prompt -> Done Fast",
  "prompt-tool-done": "Prompt -> Tool -> Done",
  "rapid-tools": "Rapid Tools",
  "idle-timeout": "Idle Timeout",
};

const SCENARIOS: Record<StudioScenarioId, StudioScenarioStep[]> = {
  "prompt-done-fast": [
    { atMs: 0, state: "prompt_received" },
    { atMs: 200, state: "done" },
    { atMs: 2400, state: "idle" },
  ],
  "prompt-tool-done": [
    { atMs: 0, state: "prompt_received" },
    { atMs: 900, state: "thinking" },
    { atMs: 1800, state: "tool_active" },
    { atMs: 3200, state: "done" },
    { atMs: 5200, state: "idle" },
  ],
  "rapid-tools": [
    { atMs: 0, state: "tool_active" },
    { atMs: 500, state: "thinking" },
    { atMs: 900, state: "tool_active" },
    { atMs: 1500, state: "done" },
    { atMs: 3400, state: "idle" },
  ],
  "idle-timeout": [
    { atMs: 0, state: "thinking" },
    { atMs: 1800, state: "idle" },
  ],
};

export function createStudioScenarioTimeline(
  scenarioId: StudioScenarioId,
): StudioScenarioStep[] {
  return SCENARIOS[scenarioId].map((step) => ({ ...step }));
}
