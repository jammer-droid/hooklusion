import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createDefaultAnimationProfile } from "./defaultProfile.js";
import { createProfileRepository } from "./profileRepository.js";

describe("sprite-set import", () => {
  it("creates a new profile from a sprite-set directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const spriteRoot = await createSpriteSetRoot(join(root, "sprite-set-new"), {
      "basic/idle": 1,
      "basic/session_start": 2,
      "basic/prompt_received": 2,
      "basic/thinking": 2,
      "basic/tool_active": 2,
      "basic/done": 2,
      "extension/tool_read": 2,
      "interact/click": 1,
    });
    const repository = createProfileRepository(root);

    const imported = await (
      repository as typeof repository & {
        applySpriteSetImport: (request: {
          sourcePath: string;
          sourceType: "directory";
          applyMode: "create_profile";
          targetProfileId: string;
          targetProfileName: string;
        }) => Promise<Awaited<ReturnType<typeof repository.readProfile>>>;
      }
    ).applySpriteSetImport({
      sourcePath: spriteRoot,
      sourceType: "directory",
      applyMode: "create_profile",
      targetProfileId: "custom-imported",
      targetProfileName: "Custom Imported",
    });

    expect(imported.id).toBe("custom-imported");
    expect(imported.name).toBe("Custom Imported");
    expect(imported.animations.idle.frames).toEqual([
      "hooklusion-profile://custom-imported/assets/basic/idle/frame_000.png",
    ]);
    expect(imported.animations.tool_read.frames).toEqual([
      "hooklusion-profile://custom-imported/assets/extension/tool_read/frame_000.png",
      "hooklusion-profile://custom-imported/assets/extension/tool_read/frame_001.png",
    ]);
    await expect(
      readFile(
        join(
          root,
          "custom-imported",
          "assets",
          "basic",
          "idle",
          "frame_000.png",
        ),
        "utf8",
      ),
    ).resolves.toBe("basic/idle:0");
  });

  it("rejects create_profile imports when canonical behavior states are missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const spriteRoot = await createSpriteSetRoot(
      join(root, "sprite-set-sparse"),
      {
        "basic/idle": 1,
        transition_in: 2,
        transition_out: 2,
      },
      {
        transition_in: true,
        transition_out: true,
      },
    );
    const repository = createProfileRepository(root);

    await expect(
      (
        repository as typeof repository & {
          applySpriteSetImport: (request: {
            sourcePath: string;
            sourceType: "directory";
            applyMode: "create_profile";
            targetProfileId: string;
            targetProfileName: string;
          }) => Promise<Awaited<ReturnType<typeof repository.readProfile>>>;
        }
      ).applySpriteSetImport({
        sourcePath: spriteRoot,
        sourceType: "directory",
        applyMode: "create_profile",
        targetProfileId: "sparse-imported",
        targetProfileName: "Sparse Imported",
      }),
    ).rejects.toThrow(
      "Animation profile Sparse Imported must define canonical state session_start.",
    );
  });

  it("replaces a profile from a sprite-set directory without keeping omitted optional states", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    await repository.saveProfile(createDefaultAnimationProfile());
    const spriteRoot = await createSpriteSetRoot(
      join(root, "sprite-set-replace"),
      {
        "basic/idle": 1,
        "basic/session_start": 1,
        "basic/prompt_received": 1,
        "basic/thinking": 1,
        "basic/tool_active": 1,
        "basic/done": 1,
      },
    );

    const imported = await (
      repository as typeof repository & {
        applySpriteSetImport: (request: {
          sourcePath: string;
          sourceType: "directory";
          applyMode: "replace_profile";
          targetProfileId: string;
        }) => Promise<Awaited<ReturnType<typeof repository.readProfile>>>;
      }
    ).applySpriteSetImport({
      sourcePath: spriteRoot,
      sourceType: "directory",
      applyMode: "replace_profile",
      targetProfileId: "gpchan-default",
    });

    expect(imported.animations.idle.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/basic/idle/frame_000.png",
    ]);
    expect(imported.states.tool_read).toBeUndefined();
    expect(imported.animations.tool_read).toBeUndefined();
  });

  it("partially replaces only requested states and keeps the rest", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    await repository.saveProfile(createDefaultAnimationProfile());
    const spriteRoot = await createSpriteSetRoot(
      join(root, "sprite-set-partial"),
      {
        "basic/thinking": 2,
        "interact/click": 1,
      },
    );

    const imported = await (
      repository as typeof repository & {
        applySpriteSetImport: (request: {
          sourcePath: string;
          sourceType: "directory";
          applyMode: "replace_states";
          targetProfileId: string;
          replaceStates: string[];
        }) => Promise<Awaited<ReturnType<typeof repository.readProfile>>>;
      }
    ).applySpriteSetImport({
      sourcePath: spriteRoot,
      sourceType: "directory",
      applyMode: "replace_states",
      targetProfileId: "gpchan-default",
      replaceStates: ["thinking", "click"],
    });

    expect(imported.animations.thinking.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/basic/thinking/frame_000.png",
      "hooklusion-profile://gpchan-default/assets/basic/thinking/frame_001.png",
    ]);
    expect(imported.animations.click.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/interact/click/frame_000.png",
    ]);
    expect(imported.animations.idle.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/basic/idle/frame_000.png",
    ]);
    await expect(
      readFile(
        join(
          root,
          "gpchan-default",
          "assets",
          "basic",
          "thinking",
          "frame_001.png",
        ),
        "utf8",
      ),
    ).resolves.toBe("basic/thinking:1");
  });

  it("rejects create_profile imports when idle is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const spriteRoot = await createSpriteSetRoot(
      join(root, "sprite-set-invalid"),
      {
        "basic/thinking": 1,
      },
    );
    const repository = createProfileRepository(root);

    await expect(
      (
        repository as typeof repository & {
          applySpriteSetImport: (request: {
            sourcePath: string;
            sourceType: "directory";
            applyMode: "create_profile";
            targetProfileId: string;
            targetProfileName: string;
          }) => Promise<Awaited<ReturnType<typeof repository.readProfile>>>;
        }
      ).applySpriteSetImport({
        sourcePath: spriteRoot,
        sourceType: "directory",
        applyMode: "create_profile",
        targetProfileId: "broken-profile",
        targetProfileName: "Broken Profile",
      }),
    ).rejects.toThrow(
      "Animation profile Broken Profile must define canonical state idle.",
    );
  });
});

async function createSpriteSetRoot(
  root: string,
  entries: Record<string, number>,
  options: {
    transition_in?: boolean;
    transition_out?: boolean;
  } = {},
) {
  await rm(root, { recursive: true, force: true });
  await mkdir(join(root, "basic"), { recursive: true });
  await mkdir(join(root, "extension"), { recursive: true });
  await mkdir(join(root, "interact"), { recursive: true });
  if (options.transition_in) {
    await mkdir(join(root, "transition_in"), { recursive: true });
  }
  if (options.transition_out) {
    await mkdir(join(root, "transition_out"), { recursive: true });
  }

  for (const [statePath, frameCount] of Object.entries(entries)) {
    const stateDirectory = join(root, statePath);
    await mkdir(stateDirectory, { recursive: true });

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const fileName = statePath.startsWith("transition_")
        ? `frame_${String(frameIndex).padStart(3, "0")}.png`
        : `frame_${String(frameIndex).padStart(3, "0")}.png`;
      await writeFile(
        join(stateDirectory, fileName),
        `${statePath}:${frameIndex}`,
        "utf8",
      );
    }
  }

  return root;
}
