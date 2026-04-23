import { describe, expect, it } from "vitest";

import type { CharacterEvent } from "../../../server/src/characterEvent.js";
import { routeLiveCharacterEvent } from "./liveSessionRouting.js";
import { createSessionRegistry } from "./sessionRegistry.js";

const PROJECT_ROOT = "/Users/tester/dev/hooklusion";

describe("live session routing", () => {
  it("does not dispatch out-of-scope project events", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });
    const dispatched: CharacterEvent[] = [];

    expect(
      routeLiveCharacterEvent(
        registry,
        createEvent({ cwd: "/tmp/other" }),
        (event) => dispatched.push(event),
      ),
    ).toBe(false);

    expect(dispatched).toEqual([]);
  });

  it("dispatches display events with provider-qualified session ids", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });
    const dispatched: CharacterEvent[] = [];

    expect(
      routeLiveCharacterEvent(
        registry,
        createEvent({ provider: "codex", sessionId: "same-id" }),
        (event) => dispatched.push(event),
      ),
    ).toBe(true);

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toMatchObject({
      provider: "codex",
      sessionId: "codex:same-id",
    });
  });

  it("keeps later auto-mode sessions from replacing the first active session", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });
    const dispatched: CharacterEvent[] = [];

    routeLiveCharacterEvent(
      registry,
      createEvent({ provider: "claude", sessionId: "first" }),
      (event) => dispatched.push(event),
    );
    const didDispatchSecond = routeLiveCharacterEvent(
      registry,
      createEvent({ provider: "codex", sessionId: "second" }),
      (event) => dispatched.push(event),
    );

    expect(didDispatchSecond).toBe(false);
    expect(dispatched.map((event) => event.sessionId)).toEqual([
      "claude:first",
    ]);
  });

  it("dispatches only pinned session events in pinned mode", () => {
    const registry = createSessionRegistry({ projectRoots: [PROJECT_ROOT] });
    const dispatched: CharacterEvent[] = [];

    routeLiveCharacterEvent(
      registry,
      createEvent({ provider: "claude", sessionId: "first" }),
      (event) => dispatched.push(event),
    );
    routeLiveCharacterEvent(
      registry,
      createEvent({ provider: "codex", sessionId: "second" }),
      (event) => dispatched.push(event),
    );
    registry.pinSession("codex:second");

    expect(
      routeLiveCharacterEvent(
        registry,
        createEvent({ provider: "claude", sessionId: "first" }),
        (event) => dispatched.push(event),
      ),
    ).toBe(false);
    expect(
      routeLiveCharacterEvent(
        registry,
        createEvent({ provider: "codex", sessionId: "second" }),
        (event) => dispatched.push(event),
      ),
    ).toBe(true);

    expect(dispatched.map((event) => event.sessionId)).toEqual([
      "claude:first",
      "codex:second",
    ]);
  });

  it("stops dispatching sessions from projects removed from management", () => {
    const registry = createSessionRegistry({
      projectRoots: ["/tmp/project-a", "/tmp/project-b"],
    });
    const dispatched: CharacterEvent[] = [];

    routeLiveCharacterEvent(
      registry,
      createEvent({ cwd: "/tmp/project-b", sessionId: "second" }),
      (event) => dispatched.push(event),
    );
    registry.setProjectRoots(["/tmp/project-a"]);

    expect(
      routeLiveCharacterEvent(
        registry,
        createEvent({ cwd: "/tmp/project-b", sessionId: "second" }),
        (event) => dispatched.push(event),
      ),
    ).toBe(false);
  });
});

function createEvent({
  provider = "claude",
  sessionId = "session-1",
  cwd = PROJECT_ROOT,
}: {
  provider?: CharacterEvent["provider"];
  sessionId?: string;
  cwd?: string;
}): CharacterEvent {
  return {
    provider,
    sessionId,
    turnId: "turn-1",
    event: "UserPromptSubmit",
    canonicalStateHint: "prompt_received",
    providerState: null,
    raw: {
      hook_event_name: "UserPromptSubmit",
      session_id: sessionId,
      turn_id: "turn-1",
      cwd,
    },
  };
}
