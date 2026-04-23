import { homedir } from "node:os";
import { join } from "node:path";

import { createProjectCServer } from "./server.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 47321;
const DEFAULT_LOG_DIRECTORY = join(homedir(), ".hooklusion", "logs");

const host = process.env.HOOKLUSION_HOST ?? DEFAULT_HOST;
const port = Number(process.env.HOOKLUSION_PORT ?? DEFAULT_PORT);
const logDirectory = process.env.HOOKLUSION_LOG_DIR ?? DEFAULT_LOG_DIRECTORY;

const server = createProjectCServer({ logDirectory });

server.listen(port, host, () => {
  console.log(`[hooklusion/server] listening on http://${host}:${port}`);
});
