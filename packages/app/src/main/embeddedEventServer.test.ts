import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  startEmbeddedEventServer,
  stopEmbeddedEventServer,
} from "./embeddedEventServer.js";

describe("embeddedEventServer", () => {
  const servers = new Set<
    Awaited<ReturnType<typeof startEmbeddedEventServer>>
  >();

  afterEach(async () => {
    await Promise.all(
      Array.from(servers, (server) => stopEmbeddedEventServer(server)),
    );
    servers.clear();
  });

  it("starts a local event server that responds to health checks", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "hooklusion-embedded-"));
    const server = await startEmbeddedEventServer({
      host: "127.0.0.1",
      port: 0,
      logDirectory,
    });
    servers.add(server);

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a numeric server address.");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("persists incoming events to the configured log directory", async () => {
    const logDirectory = await mkdtemp(join(tmpdir(), "hooklusion-embedded-"));
    const server = await startEmbeddedEventServer({
      host: "127.0.0.1",
      port: 0,
      logDirectory,
    });
    servers.add(server);

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a numeric server address.");
    }

    const payload = {
      hook_event_name: "UserPromptSubmit",
      session_id: "session-1",
      cwd: "/tmp/project-a",
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

    expect(JSON.parse(logContents.trim())).toMatchObject({
      provider: "claude",
      payload,
    });
  });
});
