import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveBundledAssetDirectoryForRuntime,
  resolveBundledAssetRoot,
  resolveBundledProfileAssetDirectory,
  resolveProjectRoot,
} from "./projectRoot.js";

describe("resolveProjectRoot", () => {
  it("walks up to the workspace root when started from packages/app", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-root-"));
    await writeFile(
      join(root, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    await mkdir(join(root, "packages", "app"), { recursive: true });

    expect(resolveProjectRoot(join(root, "packages", "app"))).toBe(root);
  });

  it("returns the input path when no project markers exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-no-root-"));

    expect(resolveProjectRoot(root)).toBe(root);
  });

  it("falls back from a .worktrees checkout to the main repo asset root when assets only exist there", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-worktree-root-"));
    const mainRoot = join(root, "hooklusion");
    const worktreeRoot = join(mainRoot, ".worktrees", "feature-a");
    await mkdir(join(mainRoot, "assets", "office-assistant"), {
      recursive: true,
    });
    await mkdir(worktreeRoot, { recursive: true });

    expect(resolveBundledAssetRoot(worktreeRoot, "office-assistant")).toBe(
      join(mainRoot, "assets"),
    );
  });

  it("resolves bundled profile asset directories from a .worktrees checkout", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profile-assets-"));
    const mainRoot = join(root, "hooklusion");
    const worktreeRoot = join(mainRoot, ".worktrees", "feature-a");
    await mkdir(join(mainRoot, "assets", "gpchan-default"), {
      recursive: true,
    });
    await mkdir(worktreeRoot, { recursive: true });

    expect(
      resolveBundledProfileAssetDirectory(worktreeRoot, "gpchan-default"),
    ).toBe(join(mainRoot, "assets", "gpchan-default"));
  });

  it("resolves packaged bundled asset directories from app resources", async () => {
    const resourcesPath = "/Applications/hooklusion.app/Contents/Resources";

    expect(
      resolveBundledAssetDirectoryForRuntime({
        projectRoot: "/ignored/in/packaged/mode",
        assetDirectoryName: "gpchan-default",
        isPackaged: true,
        resourcesPath,
      }),
    ).toBe(
      "/Applications/hooklusion.app/Contents/Resources/bundled-assets/gpchan-default",
    );
  });
});
