import { createServer } from "node:http";
import { join } from "node:path";

import {
  createEventLogger,
  type EventLogger,
  type EventProvider,
} from "./logger.js";

interface CreateProjectCServerOptions {
  logDirectory?: string;
  logger?: EventLogger;
}

export function createProjectCServer(
  options: CreateProjectCServerOptions = {},
) {
  const logger =
    options.logger ??
    createEventLogger({
      logDirectory:
        options.logDirectory ?? join(process.cwd(), ".hooklusion", "logs"),
    });

  return createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/event") {
      const provider = readEventProvider(
        request.headers["x-hooklusion-provider"],
        request.headers["x-project-c-provider"],
        requestUrl.searchParams.get("provider"),
      );

      if (provider === null) {
        response.writeHead(400, {
          "content-type": "application/json; charset=utf-8",
        });
        response.end(JSON.stringify({ error: "Unsupported provider" }));
        return;
      }

      const chunks: Buffer[] = [];

      request.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      request.on("end", () => {
        try {
          const rawBody = Buffer.concat(chunks).toString("utf8");
          const payload = enrichPayloadWithHostPid(
            JSON.parse(rawBody) as unknown,
            request.headers["x-hooklusion-host-pid"],
            request.headers["x-project-c-host-pid"],
          );

          logger.enqueue(payload, { provider });

          response.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
          });
          response.end(JSON.stringify({ ok: true }));
        } catch {
          response.writeHead(400, {
            "content-type": "application/json; charset=utf-8",
          });
          response.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });

      return;
    }

    response.writeHead(404, {
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ error: "Not Found" }));
  });
}

function enrichPayloadWithHostPid(
  payload: unknown,
  hostPidHeader: string | string[] | undefined,
  legacyHostPidHeader: string | string[] | undefined,
) {
  const hostPid =
    readHostPid(hostPidHeader) ?? readHostPid(legacyHostPidHeader);
  if (hostPid === null || typeof payload !== "object" || payload === null) {
    return payload;
  }

  return {
    ...payload,
    project_c_pid: hostPid,
  };
}

function readHostPid(headerValue: string | string[] | undefined) {
  const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readEventProvider(
  headerValue: string | string[] | undefined,
  legacyHeaderValue: string | string[] | undefined,
  queryValue: string | null,
): EventProvider | null {
  const rawProvider = Array.isArray(headerValue)
    ? headerValue[0]
    : Array.isArray(legacyHeaderValue)
      ? legacyHeaderValue[0]
      : (headerValue ?? legacyHeaderValue ?? queryValue ?? "claude");

  if (rawProvider === "claude" || rawProvider === "codex") {
    return rawProvider;
  }

  return null;
}
