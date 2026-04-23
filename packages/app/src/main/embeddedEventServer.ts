import type { Server } from "node:http";

import { createProjectCServer } from "../../../server/src/server.js";

export async function startEmbeddedEventServer(options: {
  host: string;
  port: number;
  logDirectory: string;
}) {
  const server = createProjectCServer({
    logDirectory: options.logDirectory,
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(options.port, options.host);
  });

  return server;
}

export async function stopEmbeddedEventServer(
  server: Server | null | undefined,
) {
  if (server === null || server === undefined || !server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
