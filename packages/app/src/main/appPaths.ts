import { join } from "node:path";

export function resolveDefaultProfileDirectory(options: {
  cwd: string;
  homeDir: string;
  isPackaged: boolean;
}) {
  if (options.isPackaged) {
    return join(options.homeDir, ".hooklusion", "profiles");
  }

  return join(options.cwd, ".hooklusion", "profiles");
}
