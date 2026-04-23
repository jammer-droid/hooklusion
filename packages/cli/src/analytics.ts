import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, join } from "node:path";
import type { SQLOutputValue } from "node:sqlite";
import { DatabaseSync } from "node:sqlite";

export type AnalyticsRetentionPolicy = "1d" | "7d" | "30d" | "unlimited";
export type AnalyticsProvider = "claude" | "codex";
export type AnalyticsBehaviorKind =
  | "session_start"
  | "prompt_received"
  | "thinking"
  | "tool_active"
  | "tool_read"
  | "tool_search"
  | "tool_web"
  | "tool_explore"
  | "tool_vcs_read"
  | "tool_vcs_write"
  | "tool_test"
  | "tool_build"
  | "done";
export type AnalyticsResolutionReason =
  | "matched_behavior"
  | "fallback_state"
  | "true_mismatch"
  | "unexpected_idle"
  | "no_expected_behavior";

export interface ClassifiedBehaviorRecord {
  behaviorKind: AnalyticsBehaviorKind;
  toolName: string | null;
  resourceSignature: string | null;
  classifierSource: "hook";
  confidence: "high";
  classificationNotes: string | null;
}

export interface RecordRawEventInput {
  record: LoggedEventRecord;
  isDisplayedSession: boolean;
}

interface LoggedEventRecord {
  receivedAt: string;
  provider: AnalyticsProvider;
  payload: unknown;
}

type CharacterState =
  | "idle"
  | "session_start"
  | "prompt_received"
  | "tool_active"
  | "thinking"
  | "done";

interface CharacterEventBase {
  provider: AnalyticsProvider;
  sessionId: string;
  turnId: string | null;
  canonicalStateHint: CharacterState;
  providerState: string | null;
  raw: unknown;
}

interface CharacterSessionStartEvent extends CharacterEventBase {
  event: "SessionStart";
  providerState: null;
}

interface CharacterUserPromptSubmitEvent extends CharacterEventBase {
  event: "UserPromptSubmit";
  providerState: null;
}

interface CharacterPreToolUseEvent extends CharacterEventBase {
  event: "PreToolUse";
  toolName: string;
}

interface CharacterPostToolUseEvent extends CharacterEventBase {
  event: "PostToolUse";
  toolName: string;
  ok: boolean;
}

interface CharacterStopEvent extends CharacterEventBase {
  event: "Stop";
  providerState: null;
  ok: boolean;
}

type CharacterEvent =
  | CharacterSessionStartEvent
  | CharacterUserPromptSubmitEvent
  | CharacterPreToolUseEvent
  | CharacterPostToolUseEvent
  | CharacterStopEvent;

export interface RecordClassifiedEventInput extends ClassifiedBehaviorRecord {
  rawEventId: number;
  recordedAt: string;
  provider: AnalyticsProvider;
  model: string | null;
  modelVersion: string | null;
  projectRoot: string | null;
  sessionId: string;
  turnId: string | null;
  isDisplayedSession: boolean;
}

export interface RecordPresentationEventInput {
  recordedAt: string;
  provider: AnalyticsProvider | null;
  projectRoot: string | null;
  sessionId: string | null;
  turnId: string | null;
  presentedState: string;
  providerState: string | null;
  isDisplayedSession: boolean;
}

export interface RecordPresentationResolutionInput {
  recordedAt: string;
  provider: AnalyticsProvider | null;
  projectRoot: string | null;
  sessionId: string | null;
  turnId: string | null;
  classifiedEventId: number | null;
  presentationEventId: number;
  expectedBehavior: string | null;
  presentedState: string;
  behaviorToPresentationLatencyMs: number | null;
  reason: AnalyticsResolutionReason;
  baseState?: string | null;
  fallbackState?: string | null;
  interruptible?: boolean | null;
  allowDuringHookActivity?: boolean | null;
  holdLastFrame?: boolean | null;
  notesJson?: string | null;
  isDisplayedSession: boolean;
}

export interface AnalyticsFilters {
  range?: AnalyticsRetentionPolicy;
  provider?: AnalyticsProvider;
  projectRoot?: string;
  sessionId?: string;
}

export interface GenerateAnalyticsReportOptions extends AnalyticsFilters {
  databasePath: string;
  outputPath: string;
  generatedAt?: Date;
}

interface ProviderSummaryRow {
  provider: AnalyticsProvider;
  total_events: number;
  classified_events: number;
  unique_tool_count: number;
  unique_behavior_count: number;
}

interface EventCatalogRow {
  provider: AnalyticsProvider;
  event_type: string;
  total_count: number;
  classified_count: number;
  first_seen: string;
  last_seen: string;
}

interface MismatchBucketRow {
  reason: AnalyticsResolutionReason;
  total_count: number;
}

interface TopOffenderRow {
  tool_name: string | null;
  resource_signature: string | null;
  total_count: number;
}

interface SessionSummaryRow {
  provider: AnalyticsProvider | null;
  project_root: string | null;
  session_id: string | null;
  expected_count: number;
  mismatch_count: number;
}

interface RawEventExplorerRow {
  recorded_at: string;
  provider: AnalyticsProvider;
  project_root: string | null;
  session_id: string;
  event_type: string;
  payload_json: string;
}

interface BehaviorMixRow {
  provider: AnalyticsProvider;
  behavior_kind: string;
  total_count: number;
}

type SqlRow = Record<string, SQLOutputValue>;

export function defaultAnalyticsDatabasePath(
  homeDirectory: string = homedir(),
) {
  return join(homeDirectory, ".hooklusion", "analytics.sqlite");
}

export class AnalyticsStore {
  private readonly database: DatabaseSync;

  constructor(private readonly databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec("PRAGMA foreign_keys = ON");
    this.initializeSchema();
  }

  recordRawEvent({ record, isDisplayedSession }: RecordRawEventInput) {
    const payloadRecord = asRecord(record.payload);
    const metadata = readModelMetadata(record.payload);
    const projectRoot = readProjectRoot(record.payload);
    const sessionId =
      readString(payloadRecord?.session_id) ?? "unknown-session";
    const turnId = readNullableString(payloadRecord?.turn_id);
    const eventType = readString(payloadRecord?.hook_event_name) ?? "Unknown";
    const recordedAtMs = Date.parse(record.receivedAt);
    const result = this.database
      .prepare(
        `INSERT INTO raw_events (
          recorded_at,
          recorded_at_ms,
          provider,
          model,
          model_version,
          project_root,
          session_id,
          turn_id,
          is_displayed_session,
          event_type,
          payload_json
        ) VALUES (
          :recordedAt,
          :recordedAtMs,
          :provider,
          :model,
          :modelVersion,
          :projectRoot,
          :sessionId,
          :turnId,
          :isDisplayedSession,
          :eventType,
          :payloadJson
        )`,
      )
      .run({
        recordedAt: record.receivedAt,
        recordedAtMs: Number.isFinite(recordedAtMs) ? recordedAtMs : Date.now(),
        provider: record.provider,
        model: metadata.model,
        modelVersion: metadata.modelVersion,
        projectRoot,
        sessionId,
        turnId,
        isDisplayedSession: isDisplayedSession ? 1 : 0,
        eventType,
        payloadJson: JSON.stringify(record.payload),
      });

    return Number(result.lastInsertRowid);
  }

  recordClassifiedEvent(input: RecordClassifiedEventInput) {
    const recordedAtMs = Date.parse(input.recordedAt);
    const result = this.database
      .prepare(
        `INSERT INTO classified_events (
          raw_event_id,
          recorded_at,
          recorded_at_ms,
          provider,
          model,
          model_version,
          project_root,
          session_id,
          turn_id,
          is_displayed_session,
          behavior_kind,
          tool_name,
          resource_signature,
          classifier_source,
          confidence,
          classification_notes
        ) VALUES (
          :rawEventId,
          :recordedAt,
          :recordedAtMs,
          :provider,
          :model,
          :modelVersion,
          :projectRoot,
          :sessionId,
          :turnId,
          :isDisplayedSession,
          :behaviorKind,
          :toolName,
          :resourceSignature,
          :classifierSource,
          :confidence,
          :classificationNotes
        )`,
      )
      .run({
        rawEventId: input.rawEventId,
        recordedAt: input.recordedAt,
        recordedAtMs: Number.isFinite(recordedAtMs) ? recordedAtMs : Date.now(),
        provider: input.provider,
        model: input.model,
        modelVersion: input.modelVersion,
        projectRoot: input.projectRoot,
        sessionId: input.sessionId,
        turnId: input.turnId,
        isDisplayedSession: input.isDisplayedSession ? 1 : 0,
        behaviorKind: input.behaviorKind,
        toolName: input.toolName,
        resourceSignature: input.resourceSignature,
        classifierSource: input.classifierSource,
        confidence: input.confidence,
        classificationNotes: input.classificationNotes,
      });

    return Number(result.lastInsertRowid);
  }

  recordPresentationEvent(input: RecordPresentationEventInput) {
    const recordedAtMs = Date.parse(input.recordedAt);
    if (input.provider !== null && input.sessionId !== null) {
      this.database
        .prepare(
          `UPDATE presentation_events
           SET ended_at = :endedAt,
               ended_at_ms = :endedAtMs,
               duration_ms = :durationMs
           WHERE id = (
             SELECT id
             FROM presentation_events
             WHERE provider = :provider
               AND session_id = :sessionId
               AND ended_at IS NULL
             ORDER BY recorded_at_ms DESC
             LIMIT 1
           )`,
        )
        .run({
          endedAt: input.recordedAt,
          endedAtMs: Number.isFinite(recordedAtMs) ? recordedAtMs : Date.now(),
          durationMs: null,
          provider: input.provider,
          sessionId: input.sessionId,
        });
      this.database
        .prepare(
          `UPDATE presentation_events
           SET duration_ms = ended_at_ms - recorded_at_ms
           WHERE provider = :provider
             AND session_id = :sessionId
             AND ended_at = :endedAt`,
        )
        .run({
          provider: input.provider,
          sessionId: input.sessionId,
          endedAt: input.recordedAt,
        });
    }

    const result = this.database
      .prepare(
        `INSERT INTO presentation_events (
          recorded_at,
          recorded_at_ms,
          provider,
          project_root,
          session_id,
          turn_id,
          is_displayed_session,
          presented_state,
          provider_state
        ) VALUES (
          :recordedAt,
          :recordedAtMs,
          :provider,
          :projectRoot,
          :sessionId,
          :turnId,
          :isDisplayedSession,
          :presentedState,
          :providerState
        )`,
      )
      .run({
        recordedAt: input.recordedAt,
        recordedAtMs: Number.isFinite(recordedAtMs) ? recordedAtMs : Date.now(),
        provider: input.provider,
        projectRoot: input.projectRoot,
        sessionId: input.sessionId,
        turnId: input.turnId,
        isDisplayedSession: input.isDisplayedSession ? 1 : 0,
        presentedState: input.presentedState,
        providerState: input.providerState,
      });

    return Number(result.lastInsertRowid);
  }

  recordPresentationResolution(input: RecordPresentationResolutionInput) {
    const recordedAtMs = Date.parse(input.recordedAt);
    const result = this.database
      .prepare(
        `INSERT INTO presentation_resolutions (
          recorded_at,
          recorded_at_ms,
          provider,
          project_root,
          session_id,
          turn_id,
          is_displayed_session,
          classified_event_id,
          presentation_event_id,
          expected_behavior,
          presented_state,
          behavior_to_presentation_latency_ms,
          reason,
          base_state,
          fallback_state,
          interruptible,
          allow_during_hook_activity,
          hold_last_frame,
          notes_json
        ) VALUES (
          :recordedAt,
          :recordedAtMs,
          :provider,
          :projectRoot,
          :sessionId,
          :turnId,
          :isDisplayedSession,
          :classifiedEventId,
          :presentationEventId,
          :expectedBehavior,
          :presentedState,
          :behaviorToPresentationLatencyMs,
          :reason,
          :baseState,
          :fallbackState,
          :interruptible,
          :allowDuringHookActivity,
          :holdLastFrame,
          :notesJson
        )`,
      )
      .run({
        recordedAt: input.recordedAt,
        recordedAtMs: Number.isFinite(recordedAtMs) ? recordedAtMs : Date.now(),
        provider: input.provider,
        projectRoot: input.projectRoot,
        sessionId: input.sessionId,
        turnId: input.turnId,
        isDisplayedSession: input.isDisplayedSession ? 1 : 0,
        classifiedEventId: input.classifiedEventId,
        presentationEventId: input.presentationEventId,
        expectedBehavior: input.expectedBehavior,
        presentedState: input.presentedState,
        behaviorToPresentationLatencyMs: input.behaviorToPresentationLatencyMs,
        reason: input.reason,
        baseState: input.baseState ?? null,
        fallbackState: input.fallbackState ?? null,
        interruptible:
          input.interruptible === undefined || input.interruptible === null
            ? null
            : input.interruptible
              ? 1
              : 0,
        allowDuringHookActivity:
          input.allowDuringHookActivity === undefined ||
          input.allowDuringHookActivity === null
            ? null
            : input.allowDuringHookActivity
              ? 1
              : 0,
        holdLastFrame:
          input.holdLastFrame === undefined || input.holdLastFrame === null
            ? null
            : input.holdLastFrame
              ? 1
              : 0,
        notesJson: input.notesJson ?? null,
      });

    return Number(result.lastInsertRowid);
  }

  getRetentionPolicy(): AnalyticsRetentionPolicy {
    const row = this.database
      .prepare(
        `SELECT value
         FROM analytics_settings
         WHERE key = 'retention_policy'
         LIMIT 1`,
      )
      .get();
    if (
      row !== undefined &&
      typeof row === "object" &&
      row !== null &&
      "value" in row &&
      (row.value === "1d" ||
        row.value === "7d" ||
        row.value === "30d" ||
        row.value === "unlimited")
    ) {
      return row.value;
    }

    return "unlimited";
  }

  setRetentionPolicy(policy: AnalyticsRetentionPolicy) {
    this.database
      .prepare(
        `INSERT INTO analytics_settings (key, value)
         VALUES ('retention_policy', :value)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run({ value: policy });
  }

  getCurrentDisplayedSessionKey() {
    const row = this.database
      .prepare(
        `SELECT value
         FROM analytics_settings
         WHERE key = 'current_displayed_session_key'
         LIMIT 1`,
      )
      .get();
    if (
      row !== undefined &&
      typeof row === "object" &&
      row !== null &&
      "value" in row &&
      (typeof row.value === "string" || row.value === null)
    ) {
      return row.value;
    }

    return null;
  }

  setCurrentDisplayedSessionKey(sessionKey: string | null) {
    if (sessionKey === null) {
      this.database
        .prepare(
          `DELETE FROM analytics_settings
           WHERE key = 'current_displayed_session_key'`,
        )
        .run();
      return;
    }

    this.database
      .prepare(
        `INSERT INTO analytics_settings (key, value)
         VALUES ('current_displayed_session_key', :value)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run({ value: sessionKey });
  }

  pruneExpiredRecords(referenceTimeMs = Date.now()) {
    const policy = this.getRetentionPolicy();
    const retentionMs = readRetentionWindowMs(policy);

    if (retentionMs === null) {
      return;
    }

    const cutoffMs = referenceTimeMs - retentionMs;
    this.database
      .prepare(`DELETE FROM raw_events WHERE recorded_at_ms < :cutoffMs`)
      .run({ cutoffMs });
    this.database
      .prepare(
        `DELETE FROM presentation_events WHERE recorded_at_ms < :cutoffMs`,
      )
      .run({ cutoffMs });
    this.database
      .prepare(
        `DELETE FROM presentation_resolutions WHERE recorded_at_ms < :cutoffMs`,
      )
      .run({ cutoffMs });
  }

  getDatabase() {
    return this.database;
  }

  private initializeSchema() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS analytics_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS raw_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recorded_at TEXT NOT NULL,
        recorded_at_ms INTEGER NOT NULL,
        provider TEXT NOT NULL,
        model TEXT,
        model_version TEXT,
        project_root TEXT,
        session_id TEXT NOT NULL,
        turn_id TEXT,
        is_displayed_session INTEGER NOT NULL DEFAULT 0,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classified_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_event_id INTEGER NOT NULL REFERENCES raw_events(id) ON DELETE CASCADE,
        recorded_at TEXT NOT NULL,
        recorded_at_ms INTEGER NOT NULL,
        provider TEXT NOT NULL,
        model TEXT,
        model_version TEXT,
        project_root TEXT,
        session_id TEXT NOT NULL,
        turn_id TEXT,
        is_displayed_session INTEGER NOT NULL DEFAULT 0,
        behavior_kind TEXT NOT NULL,
        tool_name TEXT,
        resource_signature TEXT,
        classifier_source TEXT NOT NULL,
        confidence TEXT NOT NULL,
        classification_notes TEXT
      );

      CREATE TABLE IF NOT EXISTS presentation_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recorded_at TEXT NOT NULL,
        recorded_at_ms INTEGER NOT NULL,
        ended_at TEXT,
        ended_at_ms INTEGER,
        duration_ms INTEGER,
        provider TEXT,
        project_root TEXT,
        session_id TEXT,
        turn_id TEXT,
        is_displayed_session INTEGER NOT NULL DEFAULT 1,
        presented_state TEXT NOT NULL,
        provider_state TEXT
      );

      CREATE TABLE IF NOT EXISTS presentation_resolutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recorded_at TEXT NOT NULL,
        recorded_at_ms INTEGER NOT NULL,
        provider TEXT,
        project_root TEXT,
        session_id TEXT,
        turn_id TEXT,
        is_displayed_session INTEGER NOT NULL DEFAULT 1,
        classified_event_id INTEGER REFERENCES classified_events(id) ON DELETE SET NULL,
        presentation_event_id INTEGER NOT NULL REFERENCES presentation_events(id) ON DELETE CASCADE,
        expected_behavior TEXT,
        presented_state TEXT NOT NULL,
        behavior_to_presentation_latency_ms INTEGER,
        reason TEXT NOT NULL,
        base_state TEXT,
        fallback_state TEXT,
        interruptible INTEGER,
        allow_during_hook_activity INTEGER,
        hold_last_frame INTEGER,
        notes_json TEXT
      );

      CREATE INDEX IF NOT EXISTS raw_events_recorded_at_idx
        ON raw_events(recorded_at_ms);
      CREATE INDEX IF NOT EXISTS raw_events_provider_session_idx
        ON raw_events(provider, session_id, recorded_at_ms);
      CREATE INDEX IF NOT EXISTS raw_events_displayed_idx
        ON raw_events(is_displayed_session, recorded_at_ms);
      CREATE INDEX IF NOT EXISTS classified_events_session_idx
        ON classified_events(provider, session_id, recorded_at_ms);
      CREATE INDEX IF NOT EXISTS classified_events_displayed_idx
        ON classified_events(is_displayed_session, recorded_at_ms);
      CREATE INDEX IF NOT EXISTS presentation_events_session_idx
        ON presentation_events(provider, session_id, recorded_at_ms);
      CREATE INDEX IF NOT EXISTS presentation_events_displayed_idx
        ON presentation_events(is_displayed_session, recorded_at_ms);
      CREATE INDEX IF NOT EXISTS presentation_resolutions_session_idx
        ON presentation_resolutions(provider, session_id, recorded_at_ms);
      CREATE INDEX IF NOT EXISTS presentation_resolutions_displayed_idx
        ON presentation_resolutions(is_displayed_session, recorded_at_ms);
    `);
  }
}

export function createAnalyticsStore(options: { databasePath: string }) {
  return new AnalyticsStore(options.databasePath);
}

export function classifyBehaviorEvent(
  event: CharacterEvent,
): ClassifiedBehaviorRecord | null {
  if (event.event === "SessionStart") {
    return baseBehavior("session_start");
  }

  if (event.event === "UserPromptSubmit") {
    return baseBehavior("prompt_received");
  }

  if (event.event === "Stop") {
    return baseBehavior("done");
  }

  if (event.event === "PostToolUse") {
    return {
      ...baseBehavior("thinking"),
      toolName: event.toolName,
      resourceSignature: deriveResourceSignature(event.toolName, event.raw),
    };
  }

  if (event.event !== "PreToolUse") {
    return null;
  }

  const behaviorKind = readBehaviorKindFromProviderState(event.providerState);
  return {
    ...baseBehavior(behaviorKind ?? "tool_active"),
    toolName: event.toolName,
    resourceSignature: deriveResourceSignature(event.toolName, event.raw),
  };
}

export function generateAnalyticsReport(
  options: GenerateAnalyticsReportOptions,
) {
  const store = createAnalyticsStore({ databasePath: options.databasePath });
  store.pruneExpiredRecords();
  const database = store.getDatabase();
  const generatedAt = options.generatedAt ?? new Date();
  const resolvedFilters = resolveReportFilters(store, database, options);
  const filter = buildFilterClause(resolvedFilters, generatedAt);

  const overview = readOverview(database, filter, generatedAt);
  const providerSummary = database
    .prepare(
      `SELECT
       raw.provider AS provider,
       COUNT(*) AS total_events,
       SUM(CASE WHEN classified.id IS NOT NULL THEN 1 ELSE 0 END) AS classified_events,
       COUNT(DISTINCT classified.tool_name) AS unique_tool_count,
       COUNT(DISTINCT classified.behavior_kind) AS unique_behavior_count
     FROM raw_events raw
     LEFT JOIN classified_events classified ON classified.raw_event_id = raw.id
     ${filter.rawWhereSql}
     GROUP BY raw.provider
     ORDER BY raw.provider`,
    )
    .all(filter.rawParameters)
    .map(mapProviderSummaryRow);
  const behaviorMix = database
    .prepare(
      `SELECT
       classified.provider AS provider,
       classified.behavior_kind AS behavior_kind,
       COUNT(*) AS total_count
     FROM classified_events classified
     ${filter.classifiedWhereSql}
     GROUP BY classified.provider, classified.behavior_kind
     ORDER BY classified.provider, total_count DESC`,
    )
    .all(filter.classifiedParameters)
    .map(mapBehaviorMixRow);
  const eventCatalog = database
    .prepare(
      `SELECT
       raw.provider AS provider,
       raw.event_type AS event_type,
       COUNT(*) AS total_count,
       SUM(CASE WHEN classified.id IS NOT NULL THEN 1 ELSE 0 END) AS classified_count,
       MIN(raw.recorded_at) AS first_seen,
       MAX(raw.recorded_at) AS last_seen
     FROM raw_events raw
     LEFT JOIN classified_events classified ON classified.raw_event_id = raw.id
     ${filter.rawWhereSql}
     GROUP BY raw.provider, raw.event_type
     ORDER BY total_count DESC, raw.provider, raw.event_type`,
    )
    .all(filter.rawParameters)
    .map(mapEventCatalogRow);
  const mismatchBuckets = database
    .prepare(
      `SELECT
       resolution.reason AS reason,
       COUNT(*) AS total_count
     FROM presentation_resolutions resolution
     ${filter.resolutionWhereSql}
     GROUP BY resolution.reason
     ORDER BY total_count DESC`,
    )
    .all(filter.resolutionParameters)
    .map(mapMismatchBucketRow);
  const topOffenders = database
    .prepare(
      `SELECT
       classified.tool_name AS tool_name,
       classified.resource_signature AS resource_signature,
       COUNT(*) AS total_count
     FROM presentation_resolutions resolution
     LEFT JOIN classified_events classified
       ON classified.id = resolution.classified_event_id
     ${appendCondition(
       filter.resolutionWhereSql,
       `resolution.reason IN ('true_mismatch', 'unexpected_idle', 'fallback_state')`,
     )}
     GROUP BY classified.tool_name, classified.resource_signature
     HAVING total_count > 0
     ORDER BY total_count DESC
     LIMIT 15`,
    )
    .all(filter.resolutionParameters)
    .map(mapTopOffenderRow);
  const sessionSummary = database
    .prepare(
      `SELECT
       resolution.provider AS provider,
       resolution.project_root AS project_root,
       resolution.session_id AS session_id,
       COUNT(*) AS expected_count,
       SUM(CASE WHEN resolution.reason IN ('true_mismatch', 'unexpected_idle', 'fallback_state') THEN 1 ELSE 0 END) AS mismatch_count
     FROM presentation_resolutions resolution
     ${appendCondition(filter.resolutionWhereSql, `resolution.expected_behavior IS NOT NULL`)}
     GROUP BY resolution.provider, resolution.project_root, resolution.session_id
     ORDER BY mismatch_count DESC, expected_count DESC
     LIMIT 20`,
    )
    .all(filter.resolutionParameters)
    .map(mapSessionSummaryRow);
  const rawEventRows = database
    .prepare(
      `SELECT
       raw.recorded_at AS recorded_at,
       raw.provider AS provider,
       raw.project_root AS project_root,
       raw.session_id AS session_id,
       raw.event_type AS event_type,
       raw.payload_json AS payload_json
     FROM raw_events raw
     ${filter.rawWhereSql}
     ORDER BY raw.recorded_at_ms DESC
     LIMIT 50`,
    )
    .all(filter.rawParameters)
    .map(mapRawEventExplorerRow);

  const html = renderAnalyticsHtml({
    generatedAt,
    filters: resolvedFilters,
    overview,
    providerSummary,
    behaviorMix,
    eventCatalog,
    mismatchBuckets,
    topOffenders,
    sessionSummary,
    rawEventRows,
  });

  mkdirSync(dirname(options.outputPath), { recursive: true });
  writeFileSync(options.outputPath, html, "utf8");
}

function readOverview(
  database: DatabaseSync,
  filter: ReturnType<typeof buildFilterClause>,
  generatedAt: Date,
) {
  const totalEvents =
    readSqlNumber(
      database
        .prepare(
          `SELECT COUNT(*) AS total_count FROM raw_events raw ${filter.rawWhereSql}`,
        )
        .get(filter.rawParameters)?.total_count,
    ) ?? 0;
  const classifiedEvents =
    readSqlNumber(
      database
        .prepare(
          `SELECT COUNT(*) AS total_count FROM classified_events classified ${filter.classifiedWhereSql}`,
        )
        .get(filter.classifiedParameters)?.total_count,
    ) ?? 0;
  const resolutionSummary =
    asSqlRow(
      database
        .prepare(
          `SELECT
           SUM(CASE WHEN resolution.expected_behavior IS NOT NULL THEN 1 ELSE 0 END) AS expected_count,
           SUM(CASE WHEN resolution.reason = 'matched_behavior' THEN 1 ELSE 0 END) AS matched_count,
           SUM(CASE WHEN resolution.reason = 'true_mismatch' THEN 1 ELSE 0 END) AS true_mismatch_count,
           SUM(CASE WHEN resolution.reason = 'unexpected_idle' THEN 1 ELSE 0 END) AS unexpected_idle_count,
           SUM(CASE WHEN resolution.reason = 'fallback_state' THEN 1 ELSE 0 END) AS fallback_count
         FROM presentation_resolutions resolution
         ${filter.resolutionWhereSql}`,
        )
        .get(filter.resolutionParameters),
    ) ?? {};
  const latencyValues = database
    .prepare(
      `SELECT resolution.behavior_to_presentation_latency_ms AS behavior_to_presentation_latency_ms
     FROM presentation_resolutions resolution
     ${appendCondition(
       filter.resolutionWhereSql,
       `resolution.behavior_to_presentation_latency_ms IS NOT NULL AND resolution.behavior_to_presentation_latency_ms >= 0`,
     )}
     ORDER BY resolution.behavior_to_presentation_latency_ms ASC`,
    )
    .all(filter.resolutionParameters)
    .map((row) => readSqlNumber(row.behavior_to_presentation_latency_ms))
    .filter(isDefinedNumber);
  const openIdleDurations = database
    .prepare(
      `SELECT
       CASE
         WHEN presentation.duration_ms IS NOT NULL THEN presentation.duration_ms
         ELSE :reportGeneratedAtMs - presentation.recorded_at_ms
       END AS effective_duration_ms
     FROM presentation_events presentation
     ${appendCondition(filter.presentationWhereSql, `presentation.presented_state = 'idle'`)}
     ORDER BY effective_duration_ms ASC`,
    )
    .all({
      ...filter.presentationParameters,
      reportGeneratedAtMs: generatedAt.getTime(),
    })
    .map((row) => readSqlNumber(row.effective_duration_ms))
    .filter(isDefinedNumber);

  const expectedCount = readSqlNumber(resolutionSummary.expected_count) ?? 0;
  const matchedCount = readSqlNumber(resolutionSummary.matched_count) ?? 0;
  const mismatchBase =
    matchedCount +
    (readSqlNumber(resolutionSummary.true_mismatch_count) ?? 0) +
    (readSqlNumber(resolutionSummary.unexpected_idle_count) ?? 0);

  return {
    totalEvents,
    classifiedEvents,
    classificationCoverageRate:
      totalEvents === 0 ? 0 : classifiedEvents / totalEvents,
    expectedCount,
    animationAccuracy: mismatchBase === 0 ? 0 : matchedCount / mismatchBase,
    trueMismatchRate:
      expectedCount === 0
        ? 0
        : (readSqlNumber(resolutionSummary.true_mismatch_count) ?? 0) /
          expectedCount,
    unexpectedIdleRate:
      expectedCount === 0
        ? 0
        : (readSqlNumber(resolutionSummary.unexpected_idle_count) ?? 0) /
          expectedCount,
    fallbackUsageRate:
      expectedCount === 0
        ? 0
        : (readSqlNumber(resolutionSummary.fallback_count) ?? 0) /
          expectedCount,
    latencyP50Ms: percentile(latencyValues, 0.5),
    latencyP95Ms: percentile(latencyValues, 0.95),
    unexpectedIdleDwellP50Ms: percentile(openIdleDurations, 0.5),
  };
}

function renderAnalyticsHtml(input: {
  generatedAt: Date;
  filters: GenerateAnalyticsReportOptions;
  overview: ReturnType<typeof readOverview>;
  providerSummary: ProviderSummaryRow[];
  behaviorMix: BehaviorMixRow[];
  eventCatalog: EventCatalogRow[];
  mismatchBuckets: MismatchBucketRow[];
  topOffenders: TopOffenderRow[];
  sessionSummary: SessionSummaryRow[];
  rawEventRows: RawEventExplorerRow[];
}) {
  const { filters, generatedAt, overview } = input;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hooklusion Analytics Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f1e7;
      --panel: #fffaf2;
      --ink: #26211b;
      --muted: #6f665a;
      --line: #ddd1bf;
      --accent: #8d5c2c;
      --warn: #b24b36;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.45;
    }
    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 24px 80px;
    }
    h1, h2, h3 { margin: 0 0 12px; }
    h1 { font-size: 32px; }
    h2 { margin-top: 40px; font-size: 24px; }
    p, li { color: var(--muted); }
    .meta { margin-top: 8px; color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .card, section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 20px;
      margin-top: 20px;
    }
    .card strong {
      display: block;
      font-size: 28px;
      margin-top: 8px;
      color: var(--accent);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
      font-size: 14px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }
    .table-wrap {
      margin-top: 16px;
      overflow: auto;
      max-height: 420px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: white;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f0e4d2;
      color: var(--ink);
    }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      background: #efe1cf;
      color: var(--accent);
      font-size: 12px;
      font-weight: 600;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
      max-height: 280px;
      overflow: auto;
    }
    details summary {
      cursor: pointer;
      color: var(--accent);
      font-weight: 600;
    }
    .warn { color: var(--warn); }
  </style>
</head>
<body>
  <main>
    <h1>Hooklusion Analytics Report</h1>
    <p class="meta">Generated at ${escapeHtml(generatedAt.toISOString())}</p>
    <p class="meta">Filters: range=${escapeHtml(filters.range ?? "unlimited")}, provider=${escapeHtml(filters.provider ?? "all")}, project=${escapeHtml(filters.projectRoot ?? "all")}, session=${escapeHtml(filters.sessionId ?? "all")}</p>

    <section>
      <h2>Overview</h2>
      <div class="grid">
        <div class="card"><span>Total events</span><strong>${overview.totalEvents}</strong></div>
        <div class="card"><span>Classification coverage</span><strong>${formatPercent(overview.classificationCoverageRate)}</strong></div>
        <div class="card"><span>Animation accuracy</span><strong>${formatPercent(overview.animationAccuracy)}</strong></div>
        <div class="card"><span>True mismatch rate</span><strong>${formatPercent(overview.trueMismatchRate)}</strong></div>
        <div class="card"><span>Unexpected idle rate</span><strong>${formatPercent(overview.unexpectedIdleRate)}</strong></div>
        <div class="card"><span>Fallback usage rate</span><strong>${formatPercent(overview.fallbackUsageRate)}</strong></div>
        <div class="card"><span>Latency p50 / p95</span><strong>${formatMs(overview.latencyP50Ms)} / ${formatMs(overview.latencyP95Ms)}</strong></div>
        <div class="card"><span>Unexpected idle dwell p50</span><strong>${formatMs(overview.unexpectedIdleDwellP50Ms)}</strong></div>
      </div>
    </section>

    <section>
      <h2>Provider Comparison</h2>
      ${renderTable(
        [
          "Provider",
          "Total events",
          "Classified",
          "Coverage",
          "Unique tools",
          "Unique behaviors",
        ],
        input.providerSummary.map((row) => [
          row.provider,
          String(row.total_events),
          String(row.classified_events),
          formatPercent(
            row.total_events === 0
              ? 0
              : row.classified_events / row.total_events,
          ),
          String(row.unique_tool_count),
          String(row.unique_behavior_count),
        ]),
      )}
    </section>

    <section>
      <h2>Behavior Mix</h2>
      ${renderTable(
        ["Provider", "Behavior", "Count"],
        input.behaviorMix.map((row) => [
          row.provider,
          row.behavior_kind,
          String(row.total_count),
        ]),
      )}
    </section>

    <section>
      <h2>Event Catalog</h2>
      ${renderTable(
        [
          "Provider",
          "Event type",
          "Count",
          "Classified",
          "First seen",
          "Last seen",
        ],
        input.eventCatalog.map((row) => [
          row.provider,
          row.event_type,
          String(row.total_count),
          row.classified_count > 0
            ? `<span class="pill">yes (${row.classified_count})</span>`
            : `<span class="warn">no</span>`,
          escapeHtml(row.first_seen),
          escapeHtml(row.last_seen),
        ]),
      )}
    </section>

    <section>
      <h2>Mismatch Analysis</h2>
      ${renderTable(
        ["Reason", "Count"],
        input.mismatchBuckets.map((row) => [
          row.reason,
          String(row.total_count),
        ]),
      )}
    </section>

    <section>
      <h2>Top Offenders</h2>
      ${renderTable(
        ["Tool", "Resource signature", "Count"],
        input.topOffenders.map((row) => [
          escapeHtml(row.tool_name ?? "—"),
          escapeHtml(row.resource_signature ?? "—"),
          String(row.total_count),
        ]),
      )}
    </section>

    <section>
      <h2>Session Drilldown</h2>
      ${renderTable(
        [
          "Provider",
          "Project",
          "Session",
          "Expected resolutions",
          "Mismatch count",
          "Mismatch density",
        ],
        input.sessionSummary.map((row) => [
          escapeHtml(row.provider ?? "—"),
          escapeHtml(row.project_root ?? "—"),
          escapeHtml(row.session_id ?? "—"),
          String(row.expected_count),
          String(row.mismatch_count),
          formatPercent(
            row.expected_count === 0
              ? 0
              : row.mismatch_count / row.expected_count,
          ),
        ]),
      )}
    </section>

    <section>
      <h2>Raw Event Explorer</h2>
      ${renderTable(
        [
          "Recorded at",
          "Provider",
          "Project",
          "Session",
          "Event type",
          "Payload",
        ],
        input.rawEventRows.map((row) => [
          escapeHtml(row.recorded_at),
          escapeHtml(row.provider),
          escapeHtml(row.project_root ?? "—"),
          escapeHtml(row.session_id),
          escapeHtml(row.event_type),
          `<details><summary>View payload</summary><pre>${escapeHtml(row.payload_json)}</pre></details>`,
        ]),
      )}
    </section>
  </main>
</body>
</html>`;
}

function renderTable(headers: string[], rows: string[][]) {
  if (rows.length === 0) {
    return '<p class="meta">No data for this filter set.</p>';
  }

  return `<div class="table-wrap">
  <table>
    <thead>
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>
  </div>`;
}

function buildFilterClause(filters: AnalyticsFilters, generatedAt: Date) {
  const commonParameters: Record<string, string | number> = {};
  const cutoffMs = readRangeCutoffMs(filters.range ?? "unlimited", generatedAt);
  const parsedSessionKey = parseAnalyticsSessionKey(filters.sessionId ?? null);
  const rawSessionId =
    parsedSessionKey?.sessionId ?? filters.sessionId ?? undefined;
  const presentationSessionId =
    filters.sessionId === undefined
      ? undefined
      : parsedSessionKey !== null
        ? filters.sessionId
        : filters.provider !== undefined
          ? `${filters.provider}:${filters.sessionId}`
          : filters.sessionId;
  if (cutoffMs !== null) {
    commonParameters.cutoffMs = cutoffMs;
  }
  if (filters.provider !== undefined) {
    commonParameters.provider = filters.provider;
  }
  if (filters.projectRoot !== undefined) {
    commonParameters.projectRoot = filters.projectRoot;
  }

  function createWhereSql(alias: string, sessionParameterName?: string) {
    const predicates: string[] = [];
    if (cutoffMs !== null) {
      predicates.push(`${alias}.recorded_at_ms >= :cutoffMs`);
    }
    if (filters.provider !== undefined) {
      predicates.push(`${alias}.provider = :provider`);
    }
    if (filters.projectRoot !== undefined) {
      predicates.push(`${alias}.project_root = :projectRoot`);
    }
    if (sessionParameterName !== undefined) {
      predicates.push(`${alias}.session_id = :${sessionParameterName}`);
    }
    return predicates.length > 0 ? `WHERE ${predicates.join(" AND ")}` : "";
  }

  return {
    rawParameters:
      rawSessionId === undefined
        ? commonParameters
        : { ...commonParameters, rawSessionId },
    classifiedParameters:
      rawSessionId === undefined
        ? commonParameters
        : { ...commonParameters, rawSessionId },
    presentationParameters:
      presentationSessionId === undefined
        ? commonParameters
        : { ...commonParameters, presentationSessionId },
    resolutionParameters:
      presentationSessionId === undefined
        ? commonParameters
        : { ...commonParameters, presentationSessionId },
    rawWhereSql: createWhereSql(
      "raw",
      rawSessionId !== undefined ? "rawSessionId" : undefined,
    ),
    classifiedWhereSql: createWhereSql(
      "classified",
      rawSessionId !== undefined ? "rawSessionId" : undefined,
    ),
    presentationWhereSql: createWhereSql(
      "presentation",
      presentationSessionId !== undefined ? "presentationSessionId" : undefined,
    ),
    resolutionWhereSql: createWhereSql(
      "resolution",
      presentationSessionId !== undefined ? "presentationSessionId" : undefined,
    ),
  };
}

function appendCondition(baseWhereSql: string, condition: string) {
  if (baseWhereSql.length === 0) {
    return `WHERE ${condition}`;
  }

  return `${baseWhereSql} AND ${condition}`;
}

function resolveReportFilters(
  store: AnalyticsStore,
  database: DatabaseSync,
  filters: GenerateAnalyticsReportOptions,
): GenerateAnalyticsReportOptions {
  if (filters.sessionId !== undefined) {
    return filters;
  }

  const persistedSessionKey = store.getCurrentDisplayedSessionKey();
  const persistedScope = resolveSessionScopeFromKey(
    database,
    persistedSessionKey,
    filters,
  );
  if (persistedScope !== null) {
    return {
      ...filters,
      provider: persistedScope.provider,
      sessionId: persistedScope.sessionId,
      projectRoot:
        filters.projectRoot ?? persistedScope.projectRoot ?? undefined,
    };
  }

  const latestScope = readLatestPresentationScope(database, filters);
  if (latestScope !== null) {
    return {
      ...filters,
      provider: latestScope.provider,
      sessionId: latestScope.sessionId,
      projectRoot: filters.projectRoot ?? latestScope.projectRoot ?? undefined,
    };
  }

  return filters;
}

function resolveSessionScopeFromKey(
  database: DatabaseSync,
  sessionKey: string | null,
  filters: AnalyticsFilters,
): {
  provider: AnalyticsProvider;
  sessionId: string;
  projectRoot: string | null;
} | null {
  const parsed = parseAnalyticsSessionKey(sessionKey);
  if (parsed === null) {
    return null;
  }

  if (filters.provider !== undefined && filters.provider !== parsed.provider) {
    return null;
  }

  const row = database
    .prepare(
      `SELECT provider, session_id, project_root
       FROM raw_events
       WHERE provider = :provider
         AND session_id = :sessionId
       ORDER BY recorded_at_ms DESC
       LIMIT 1`,
    )
    .get({
      provider: parsed.provider,
      sessionId: parsed.sessionId,
    });

  if (
    row !== undefined &&
    typeof row === "object" &&
    row !== null &&
    "provider" in row &&
    "session_id" in row
  ) {
    return {
      provider: row.provider as AnalyticsProvider,
      sessionId: row.session_id as string,
      projectRoot:
        "project_root" in row && typeof row.project_root === "string"
          ? row.project_root
          : null,
    };
  }

  return {
    provider: parsed.provider,
    sessionId: parsed.sessionId,
    projectRoot: null,
  };
}

function readLatestPresentationScope(
  database: DatabaseSync,
  filters: AnalyticsFilters,
): {
  provider: AnalyticsProvider;
  sessionId: string;
  projectRoot: string | null;
} | null {
  const predicates = ["provider IS NOT NULL", "session_id IS NOT NULL"];
  const parameters: Record<string, string> = {};
  if (filters.provider !== undefined) {
    predicates.push("provider = :provider");
    parameters.provider = filters.provider;
  }
  if (filters.projectRoot !== undefined) {
    predicates.push("project_root = :projectRoot");
    parameters.projectRoot = filters.projectRoot;
  }

  const row = database
    .prepare(
      `SELECT provider, session_id, project_root
       FROM presentation_events
       WHERE ${predicates.join(" AND ")}
       ORDER BY recorded_at_ms DESC
       LIMIT 1`,
    )
    .get(parameters);

  if (
    row === undefined ||
    typeof row !== "object" ||
    row === null ||
    !("provider" in row) ||
    !("session_id" in row) ||
    typeof row.provider !== "string" ||
    typeof row.session_id !== "string"
  ) {
    return null;
  }

  const normalizedSession =
    parseAnalyticsSessionKey(row.session_id)?.sessionId ?? row.session_id;

  return {
    provider: row.provider as AnalyticsProvider,
    sessionId: normalizedSession,
    projectRoot:
      "project_root" in row && typeof row.project_root === "string"
        ? row.project_root
        : null,
  };
}

function parseAnalyticsSessionKey(sessionKey: string | null) {
  if (typeof sessionKey !== "string") {
    return null;
  }

  const separatorIndex = sessionKey.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === sessionKey.length - 1) {
    return null;
  }

  const provider = sessionKey.slice(0, separatorIndex);
  const sessionId = sessionKey.slice(separatorIndex + 1);
  if (
    (provider !== "claude" && provider !== "codex") ||
    sessionId.length === 0
  ) {
    return null;
  }

  return {
    provider: provider as AnalyticsProvider,
    sessionId,
  };
}

function baseBehavior(
  behaviorKind: AnalyticsBehaviorKind,
): ClassifiedBehaviorRecord {
  return {
    behaviorKind,
    toolName: null,
    resourceSignature: null,
    classifierSource: "hook",
    confidence: "high",
    classificationNotes: null,
  };
}

function readBehaviorKindFromProviderState(
  providerState: string | null,
): AnalyticsBehaviorKind | null {
  switch (providerState) {
    case "tool_read":
    case "tool_search":
    case "tool_web":
    case "tool_explore":
    case "tool_vcs_read":
    case "tool_vcs_write":
    case "tool_test":
    case "tool_build":
      return providerState;
    default:
      return null;
  }
}

function deriveResourceSignature(toolName: string, raw: unknown) {
  const payload = asRecord(raw);
  const toolInput = asRecord(payload?.tool_input);
  const command = readString(toolInput?.command);
  if (toolName === "Bash" && command !== null) {
    const head = command.trim().split(/\s+/)[0] ?? "unknown";
    return `bash:${head}`;
  }

  const pathValue =
    readString(toolInput?.file_path) ??
    readString(toolInput?.path) ??
    readString(toolInput?.abs_path);
  if (pathValue !== null) {
    const extension = extname(pathValue) || "none";
    const depth = pathValue.split("/").filter(Boolean).length;
    return `file:${extension}:depth:${depth}`;
  }

  const urlValue = readString(toolInput?.url) ?? readString(payload?.url);
  if (urlValue !== null) {
    try {
      const parsed = new URL(urlValue);
      return `url:${parsed.host}`;
    } catch {
      return `url:${urlValue}`;
    }
  }

  return null;
}

export function readModelMetadata(payload: unknown) {
  const record = asRecord(payload);
  return {
    model:
      readString(record?.model) ??
      readString(record?.model_name) ??
      readString(record?.model_slug) ??
      null,
    modelVersion:
      readString(record?.model_version) ??
      readString(record?.modelVersion) ??
      null,
  };
}

export function readProjectRoot(payload: unknown) {
  const record = asRecord(payload);
  return readString(record?.cwd);
}

function readRetentionWindowMs(policy: AnalyticsRetentionPolicy) {
  switch (policy) {
    case "1d":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "unlimited":
      return null;
  }
}

function readRangeCutoffMs(range: AnalyticsRetentionPolicy, generatedAt: Date) {
  const retentionMs = readRetentionWindowMs(range);
  return retentionMs === null ? null : generatedAt.getTime() - retentionMs;
}

function percentile(values: number[], quantile: number) {
  if (values.length === 0) {
    return null;
  }

  const index = Math.max(
    0,
    Math.min(values.length - 1, Math.floor((values.length - 1) * quantile)),
  );
  return values[index] ?? null;
}

function mapProviderSummaryRow(row: SqlRow): ProviderSummaryRow {
  return {
    provider: readSqlProvider(row.provider) ?? "claude",
    total_events: readSqlNumber(row.total_events) ?? 0,
    classified_events: readSqlNumber(row.classified_events) ?? 0,
    unique_tool_count: readSqlNumber(row.unique_tool_count) ?? 0,
    unique_behavior_count: readSqlNumber(row.unique_behavior_count) ?? 0,
  };
}

function mapBehaviorMixRow(row: SqlRow): BehaviorMixRow {
  return {
    provider: readSqlProvider(row.provider) ?? "claude",
    behavior_kind: readSqlString(row.behavior_kind) ?? "unknown",
    total_count: readSqlNumber(row.total_count) ?? 0,
  };
}

function mapEventCatalogRow(row: SqlRow): EventCatalogRow {
  return {
    provider: readSqlProvider(row.provider) ?? "claude",
    event_type: readSqlString(row.event_type) ?? "unknown",
    total_count: readSqlNumber(row.total_count) ?? 0,
    classified_count: readSqlNumber(row.classified_count) ?? 0,
    first_seen: readSqlString(row.first_seen) ?? "—",
    last_seen: readSqlString(row.last_seen) ?? "—",
  };
}

function mapMismatchBucketRow(row: SqlRow): MismatchBucketRow {
  return {
    reason: readSqlResolutionReason(row.reason) ?? "no_expected_behavior",
    total_count: readSqlNumber(row.total_count) ?? 0,
  };
}

function mapTopOffenderRow(row: SqlRow): TopOffenderRow {
  return {
    tool_name: readSqlString(row.tool_name),
    resource_signature: readSqlString(row.resource_signature),
    total_count: readSqlNumber(row.total_count) ?? 0,
  };
}

function mapSessionSummaryRow(row: SqlRow): SessionSummaryRow {
  return {
    provider: readSqlProvider(row.provider),
    project_root: readSqlString(row.project_root),
    session_id: readSqlString(row.session_id),
    expected_count: readSqlNumber(row.expected_count) ?? 0,
    mismatch_count: readSqlNumber(row.mismatch_count) ?? 0,
  };
}

function mapRawEventExplorerRow(row: SqlRow): RawEventExplorerRow {
  return {
    recorded_at: readSqlString(row.recorded_at) ?? "—",
    provider: readSqlProvider(row.provider) ?? "claude",
    project_root: readSqlString(row.project_root),
    session_id: readSqlString(row.session_id) ?? "unknown-session",
    event_type: readSqlString(row.event_type) ?? "Unknown",
    payload_json: readSqlString(row.payload_json) ?? "{}",
  };
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMs(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}ms`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asSqlRow(value: unknown): SqlRow | null {
  return typeof value === "object" && value !== null ? (value as SqlRow) : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readSqlString(value: SQLOutputValue | undefined) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readSqlNumber(value: SQLOutputValue | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return null;
}

function readSqlProvider(
  value: SQLOutputValue | undefined,
): AnalyticsProvider | null {
  return value === "claude" || value === "codex" ? value : null;
}

function readSqlResolutionReason(
  value: SQLOutputValue | undefined,
): AnalyticsResolutionReason | null {
  switch (value) {
    case "matched_behavior":
    case "fallback_state":
    case "true_mismatch":
    case "unexpected_idle":
    case "no_expected_behavior":
      return value;
    default:
      return null;
  }
}

function isDefinedNumber(value: number | null): value is number {
  return value !== null;
}
