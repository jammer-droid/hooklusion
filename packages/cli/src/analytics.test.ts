import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAnalyticsStore, generateAnalyticsReport } from "./analytics.js";

const MIN_VISIBLE_PRESENTATION_MS = 250;
const PRESENTATION_SESSION_KEY = "codex:session-1";

function createTempDatabasePath() {
  return join(
    mkdtempSync(join(tmpdir(), "hooklusion-analytics-")),
    "db.sqlite",
  );
}

function recordMatchedPresentation(databasePath: string, durationMs: number) {
  const store = createAnalyticsStore({ databasePath });
  const startedAtMs = Date.parse("2026-04-24T00:00:00.000Z");
  const presentationEventId = store.recordPresentationEvent({
    recordedAt: new Date(startedAtMs).toISOString(),
    provider: "codex",
    projectRoot: "/tmp/project",
    sessionId: PRESENTATION_SESSION_KEY,
    turnId: null,
    presentedState: "session_start",
    providerState: null,
    isDisplayedSession: true,
  });
  store.recordPresentationResolution({
    recordedAt: new Date(startedAtMs).toISOString(),
    provider: "codex",
    projectRoot: "/tmp/project",
    sessionId: PRESENTATION_SESSION_KEY,
    turnId: null,
    classifiedEventId: null,
    presentationEventId,
    expectedBehavior: "session_start",
    presentedState: "session_start",
    behaviorToPresentationLatencyMs: 0,
    reason: "matched_behavior",
    isDisplayedSession: true,
  });
  store.recordPresentationEvent({
    recordedAt: new Date(startedAtMs + durationMs).toISOString(),
    provider: "codex",
    projectRoot: "/tmp/project",
    sessionId: PRESENTATION_SESSION_KEY,
    turnId: null,
    presentedState: "prompt_received",
    providerState: null,
    isDisplayedSession: true,
  });

  return store;
}

function recordRawEvent(
  store: ReturnType<typeof createAnalyticsStore>,
  input: {
    provider: "claude" | "codex";
    sessionId: string;
    receivedAt: string;
  },
) {
  store.recordRawEvent({
    record: {
      receivedAt: input.receivedAt,
      provider: input.provider,
      payload: {
        hook_event_name: "SessionStart",
        session_id: input.sessionId,
        cwd: "/tmp/project",
      },
    },
    isDisplayedSession: input.provider === "codex",
  });
}

describe("analytics presentation timing", () => {
  it("marks a matched presentation as interrupted when it ends before the visible threshold", () => {
    const store = recordMatchedPresentation(
      createTempDatabasePath(),
      MIN_VISIBLE_PRESENTATION_MS - 1,
    );
    try {
      const row = store
        .getDatabase()
        .prepare(
          `SELECT reason, notes_json
           FROM presentation_resolutions
           WHERE presented_state = 'session_start'`,
        )
        .get() as { reason: string; notes_json: string };

      expect(row).toMatchObject({
        reason: "interrupted_before_visible",
      });
      expect(JSON.parse(row.notes_json)).toMatchObject({
        visibleThresholdMs: MIN_VISIBLE_PRESENTATION_MS,
        actualDurationMs: MIN_VISIBLE_PRESENTATION_MS - 1,
        interruptedByState: "prompt_received",
      });
    } finally {
      store.close();
    }
  });

  it("surfaces interrupted presentations separately in the generated report", () => {
    const databasePath = createTempDatabasePath();
    recordMatchedPresentation(
      databasePath,
      MIN_VISIBLE_PRESENTATION_MS - 1,
    ).close();
    const outputPath = join(
      mkdtempSync(join(tmpdir(), "hooklusion-report-")),
      "report.html",
    );

    generateAnalyticsReport({
      databasePath,
      outputPath,
      generatedAt: new Date("2026-04-24T00:00:01.000Z"),
    });

    const html = readFileSync(outputPath, "utf8");
    expect(html).toContain("Timing overlap rate");
    expect(html).toContain("interrupted_before_visible");
    expect(html).toContain("Timing overlap count");
  });
});

describe("analytics report scope", () => {
  it("shows all providers by default even when a current displayed session is stored", () => {
    const databasePath = createTempDatabasePath();
    const store = createAnalyticsStore({ databasePath });
    try {
      recordRawEvent(store, {
        provider: "claude",
        sessionId: "claude-session",
        receivedAt: "2026-04-24T00:00:00.000Z",
      });
      recordRawEvent(store, {
        provider: "codex",
        sessionId: "codex-session",
        receivedAt: "2026-04-24T00:00:01.000Z",
      });
      store.setCurrentDisplayedSessionKey("codex:codex-session");
    } finally {
      store.close();
    }

    const outputPath = join(
      mkdtempSync(join(tmpdir(), "hooklusion-report-")),
      "report.html",
    );
    generateAnalyticsReport({
      databasePath,
      outputPath,
      generatedAt: new Date("2026-04-24T00:00:02.000Z"),
    });

    const html = readFileSync(outputPath, "utf8");
    expect(html).toContain("provider=all");
    expect(html).toContain("session=all");
    expect(html).toContain("<td>claude</td>");
    expect(html).toContain("<td>codex</td>");
  });

  it("uses the current displayed session only when requested", () => {
    const databasePath = createTempDatabasePath();
    const store = createAnalyticsStore({ databasePath });
    try {
      recordRawEvent(store, {
        provider: "claude",
        sessionId: "claude-session",
        receivedAt: "2026-04-24T00:00:00.000Z",
      });
      recordRawEvent(store, {
        provider: "codex",
        sessionId: "codex-session",
        receivedAt: "2026-04-24T00:00:01.000Z",
      });
      store.setCurrentDisplayedSessionKey("codex:codex-session");
    } finally {
      store.close();
    }

    const outputPath = join(
      mkdtempSync(join(tmpdir(), "hooklusion-report-")),
      "report.html",
    );
    generateAnalyticsReport({
      databasePath,
      outputPath,
      generatedAt: new Date("2026-04-24T00:00:02.000Z"),
      currentDisplayedSession: true,
    });

    const html = readFileSync(outputPath, "utf8");
    expect(html).toContain("provider=codex");
    expect(html).toContain("session=codex-session");
    expect(html).not.toContain("<td>claude</td>");
    expect(html).toContain("<td>codex</td>");
  });
});
