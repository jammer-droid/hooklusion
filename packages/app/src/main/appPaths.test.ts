import { describe, expect, it } from "vitest";

import { resolveDefaultProfileDirectory } from "./appPaths.js";

describe("resolveDefaultProfileDirectory", () => {
  it("uses the repo-local profile directory in development", () => {
    expect(
      resolveDefaultProfileDirectory({
        cwd: "/workspace/hooklusion",
        homeDir: "/Users/tester",
        isPackaged: false,
      }),
    ).toBe("/workspace/hooklusion/.hooklusion/profiles");
  });

  it("uses the user home profile directory in packaged builds", () => {
    expect(
      resolveDefaultProfileDirectory({
        cwd: "/",
        homeDir: "/Users/tester",
        isPackaged: true,
      }),
    ).toBe("/Users/tester/.hooklusion/profiles");
  });
});
