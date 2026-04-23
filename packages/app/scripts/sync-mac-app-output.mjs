import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const distDirectory = join(scriptDirectory, "..", "dist");
const packagedAppPath = join(distDirectory, "mac-arm64", "Hooklusion.app");
const rootAppPath = join(distDirectory, "Hooklusion.app");

if (!existsSync(packagedAppPath)) {
  console.error(
    `[hooklusion/app] packaged mac app not found: ${packagedAppPath}`,
  );
  process.exit(1);
}

rmSync(rootAppPath, {
  force: true,
  recursive: true,
});

const result = spawnSync("ditto", [packagedAppPath, rootAppPath], {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`[hooklusion/app] synced mac app to ${rootAppPath}`);
