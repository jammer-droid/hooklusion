import { describe, expect, it } from "vitest";

import type { CharacterEvent } from "../../../server/src/characterEvent.js";
import {
  isManagedProjectScopedCwd,
  isManagedProjectScopedEvent,
  isProjectScopedCwd,
  isProjectScopedEvent,
  readEventCwd,
} from "./projectScope.js";

const PROJECT_ROOT = "/Users/tester/dev/hooklusion";

describe("project scope helpers", () => {
  it("reads cwd from raw hook payloads", () => {
    expect(readEventCwd(createEvent({ cwd: PROJECT_ROOT }))).toBe(PROJECT_ROOT);
    expect(readEventCwd(createEvent({ cwd: undefined }))).toBeNull();
    expect(readEventCwd(createEvent({ cwd: 123 }))).toBeNull();
  });

  it("accepts the exact project root", () => {
    expect(isProjectScopedCwd(PROJECT_ROOT, PROJECT_ROOT)).toBe(true);
  });

  it("accepts project worktree paths under the project root", () => {
    expect(
      isProjectScopedCwd(
        `${PROJECT_ROOT}/.worktrees/animation-studio-followups`,
        PROJECT_ROOT,
      ),
    ).toBe(true);
  });

  it("accepts nested project paths", () => {
    expect(
      isProjectScopedCwd(`${PROJECT_ROOT}/packages/app`, PROJECT_ROOT),
    ).toBe(true);
  });

  it("rejects sibling repositories with the same prefix", () => {
    expect(
      isProjectScopedCwd("/Users/tester/dev/project-cousin", PROJECT_ROOT),
    ).toBe(false);
  });

  it("rejects events without a project cwd", () => {
    expect(
      isProjectScopedEvent(createEvent({ cwd: PROJECT_ROOT }), PROJECT_ROOT),
    ).toBe(true);
    expect(
      isProjectScopedEvent(createEvent({ cwd: "/tmp/other" }), PROJECT_ROOT),
    ).toBe(false);
    expect(
      isProjectScopedEvent(createEvent({ cwd: undefined }), PROJECT_ROOT),
    ).toBe(false);
  });

  it("accepts cwd values that belong to any managed project root", () => {
    expect(
      isManagedProjectScopedCwd("/tmp/project-a/packages/app", [
        "/tmp/project-a",
        "/tmp/project-b",
      ]),
    ).toBe(true);
    expect(
      isManagedProjectScopedCwd("/tmp/project-b/.worktrees/feature-x", [
        "/tmp/project-a",
        "/tmp/project-b",
      ]),
    ).toBe(true);
  });

  it("rejects cwd values that belong to no managed project root", () => {
    expect(
      isManagedProjectScopedCwd("/tmp/hooklusion", [
        "/tmp/project-a",
        "/tmp/project-b",
      ]),
    ).toBe(false);
    expect(isManagedProjectScopedCwd("/tmp/project-a", [])).toBe(false);
  });

  it("rejects sibling prefixes when checking managed project roots", () => {
    expect(
      isManagedProjectScopedCwd("/tmp/project-alpha-tools", [
        "/tmp/project-alpha",
      ]),
    ).toBe(false);
  });

  it("stops accepting events after a managed project root is removed", () => {
    const event = createEvent({ cwd: "/tmp/project-b/packages/app" });

    expect(
      isManagedProjectScopedEvent(event, ["/tmp/project-a", "/tmp/project-b"]),
    ).toBe(true);
    expect(isManagedProjectScopedEvent(event, ["/tmp/project-a"])).toBe(false);
  });
});

function createEvent({ cwd }: { cwd: unknown }): CharacterEvent {
  const raw: Record<string, unknown> = {
    hook_event_name: "UserPromptSubmit",
    session_id: "session-1",
  };

  if (cwd !== undefined) {
    raw.cwd = cwd;
  }

  return {
    provider: "codex",
    sessionId: "session-1",
    turnId: null,
    event: "UserPromptSubmit",
    canonicalStateHint: "prompt_received",
    providerState: null,
    raw,
  };
}
