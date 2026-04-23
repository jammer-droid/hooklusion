import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createProjectCServer } from "./server.js";

describe("createProjectCServer", () => {
  const servers = new Set<ReturnType<typeof createProjectCServer>>();

  afterEach(() => {
    for (const server of servers) {
      server.close();
    }

    servers.clear();
  });

  it("returns a healthy response for GET /health", async () => {
    const server = createProjectCServer();
    servers.add(server);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the server to bind to a numeric port.");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("accepts POST /event and persists the raw payload", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "hooklusion-server-"));
    const server = createProjectCServer({
      logDirectory,
    });
    servers.add(server);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the server to bind to a numeric port.");
    }

    const payload = {
      hook_event_name: "UserPromptSubmit",
      session_id: "session-1",
      prompt: "hello",
    };

    const response = await fetch(`http://127.0.0.1:${address.port}/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const logContents = await readFile(
      join(logDirectory, "events.jsonl"),
      "utf8",
    );
    const records = logContents
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      provider: "claude",
      payload,
    });
  });

  it("accepts Codex provider events and persists them with the provider", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "hooklusion-server-"));
    const server = createProjectCServer({
      logDirectory,
    });
    servers.add(server);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the server to bind to a numeric port.");
    }

    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      turn_id: "turn-1",
      tool_name: "Bash",
      tool_input: { command: "pnpm test" },
    };

    const response = await fetch(`http://127.0.0.1:${address.port}/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hooklusion-provider": "codex",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const logContents = await readFile(
      join(logDirectory, "events.jsonl"),
      "utf8",
    );
    const records = logContents
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      provider: "codex",
      payload,
    });
  });

  it("accepts legacy project-c provider headers during the rename transition", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "hooklusion-server-"));
    const server = createProjectCServer({
      logDirectory,
    });
    servers.add(server);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the server to bind to a numeric port.");
    }

    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "session-1",
      turn_id: "turn-1",
      tool_name: "Bash",
      tool_input: { command: "pnpm test" },
    };

    const response = await fetch(`http://127.0.0.1:${address.port}/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-project-c-provider": "codex",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const logContents = await readFile(
      join(logDirectory, "events.jsonl"),
      "utf8",
    );
    const records = logContents
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      provider: "codex",
      payload,
    });
  });

  it("captures the host pid header into the persisted payload metadata", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "hooklusion-server-"));
    const server = createProjectCServer({
      logDirectory,
    });
    servers.add(server);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the server to bind to a numeric port.");
    }

    const payload = {
      hook_event_name: "SessionStart",
      session_id: "session-1",
    };

    const response = await fetch(`http://127.0.0.1:${address.port}/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hooklusion-host-pid": "4242",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const logContents = await readFile(
      join(logDirectory, "events.jsonl"),
      "utf8",
    );
    const record = JSON.parse(logContents.trim());

    expect(record).toMatchObject({
      payload: {
        ...payload,
        project_c_pid: 4242,
      },
    });
  });

  it("captures the legacy project-c host pid header during the rename transition", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "hooklusion-server-"));
    const server = createProjectCServer({
      logDirectory,
    });
    servers.add(server);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the server to bind to a numeric port.");
    }

    const payload = {
      hook_event_name: "SessionStart",
      session_id: "session-1",
    };

    const response = await fetch(`http://127.0.0.1:${address.port}/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-project-c-host-pid": "4242",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const logContents = await readFile(
      join(logDirectory, "events.jsonl"),
      "utf8",
    );
    const record = JSON.parse(logContents.trim());

    expect(record).toMatchObject({
      payload: {
        ...payload,
        project_c_pid: 4242,
      },
    });
  });

  it("rejects malformed JSON on POST /event", async () => {
    const server = createProjectCServer();
    servers.add(server);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the server to bind to a numeric port.");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{not-json",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON" });
  });
});
