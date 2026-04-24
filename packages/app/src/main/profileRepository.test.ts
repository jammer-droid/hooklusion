import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { createDefaultAnimationProfile } from "./defaultProfile.js";
import { createOfficeAssistantAnimationProfile } from "./officeAssistantProfile.js";
import {
  createProfileRepository,
  PROFILE_FILE_NAME,
} from "./profileRepository.js";
import {
  resolveBundledAssetRoot,
  resolveBundledProfileAssetDirectory,
  resolveProjectRoot,
} from "./projectRoot.js";

describe("profile repository", () => {
  it("creates the default profile when no profiles exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root, {
      bundledProfiles: [createOfficeAssistantAnimationProfile(root)],
    });

    const profiles = await repository.listProfiles();

    expect(profiles).toHaveLength(2);
    expect(profiles.map((profile) => profile.id).sort()).toEqual([
      "gpchan-default",
      "office-assistant-default",
    ]);
  });

  it("saves and reloads a profile", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const profile = createDefaultAnimationProfile();

    await repository.saveProfile({
      ...profile,
      id: "custom",
      name: "Custom",
    });

    const saved = JSON.parse(
      await readFile(join(root, "custom", PROFILE_FILE_NAME), "utf8"),
    );
    const loaded = await repository.readProfile("custom");

    expect(saved.name).toBe("Custom");
    expect(loaded.name).toBe("Custom");
  });

  it("rejects unsafe ids when saving profiles", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const outsideProfilePath = join(dirname(root), "escape", PROFILE_FILE_NAME);

    await rm(join(dirname(root), "escape"), { recursive: true, force: true });

    await expect(
      repository.saveProfile({
        ...createDefaultAnimationProfile(),
        id: "../escape",
      }),
    ).rejects.toThrow("Profile id ../escape must be a safe directory name.");

    await expect(readFile(outsideProfilePath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects unsafe ids when reading profiles", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);

    await expect(repository.readProfile("foo/bar")).rejects.toThrow(
      "Profile id foo/bar must be a safe directory name.",
    );
  });

  it("writes bundled profile files when bootstrapping an empty root", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const projectRoot = resolveProjectRoot(process.cwd());
    const repository = createProfileRepository(root, {
      bundledProfiles: [
        createDefaultAnimationProfile(),
        createOfficeAssistantAnimationProfile(root),
      ],
      bundledAssetRoots: {
        "gpchan-default": resolveBundledProfileAssetDirectory(
          projectRoot,
          "gpchan-default",
        ),
        "office-assistant-default": resolveBundledAssetRoot(
          projectRoot,
          "office-assistant",
        ),
      },
    });

    await repository.listProfiles();

    const gpchanProfile = JSON.parse(
      await readFile(join(root, "gpchan-default", PROFILE_FILE_NAME), "utf8"),
    );
    const officeAssistantProfile = JSON.parse(
      await readFile(
        join(root, "office-assistant-default", PROFILE_FILE_NAME),
        "utf8",
      ),
    );

    expect(gpchanProfile.id).toBe("gpchan-default");
    expect(gpchanProfile.animations.idle.frames[0]).toBe(
      "assets/basic/idle/frame_000.png",
    );
    expect(officeAssistantProfile.id).toBe("office-assistant-default");
    expect(officeAssistantProfile.animations.idle.frames[0]).toBe(
      "assets/office-assistant/animations/idle/seated_idle/frame_000.png",
    );
  });

  it("copies bundled assets for bundled profiles during bootstrap", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const projectRoot = resolveProjectRoot(process.cwd());
    const repository = createProfileRepository(root, {
      bundledProfiles: [
        createDefaultAnimationProfile(),
        createOfficeAssistantAnimationProfile(root),
      ],
      bundledAssetRoots: {
        "gpchan-default": resolveBundledProfileAssetDirectory(
          projectRoot,
          "gpchan-default",
        ),
        "office-assistant-default": resolveBundledAssetRoot(
          projectRoot,
          "office-assistant",
        ),
      },
    });

    await repository.listProfiles();

    await expect(
      readFile(
        join(
          root,
          "gpchan-default",
          "assets",
          "basic",
          "idle",
          "frame_000.png",
        ),
      ),
    ).resolves.toBeDefined();
    await expect(
      readFile(
        join(
          root,
          "office-assistant-default",
          "assets",
          "office-assistant",
          "animations",
          "idle",
          "seated_idle",
          "frame_000.png",
        ),
      ),
    ).resolves.toBeDefined();
  });

  it("refreshes outdated bundled gpchan materialization when the asset schema increases", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const projectRoot = resolveProjectRoot(process.cwd());
    const staleProfile = createDefaultAnimationProfile();

    await mkdir(join(root, "gpchan-default"), { recursive: true });
    await writeFile(
      join(root, "gpchan-default", PROFILE_FILE_NAME),
      `${JSON.stringify(
        {
          ...staleProfile,
          assetSchemaVersion: 2,
          animations: {
            ...staleProfile.animations,
            session_start: {
              ...staleProfile.animations.session_start,
              frames: staleProfile.animations.session_start.frames.slice(0, 2),
              frameWeights: [1, 1],
            },
            tool_active: {
              ...staleProfile.animations.tool_active,
              frames: [
                "hooklusion-profile://gpchan-default/assets/basic/tool_active/frame_000.png",
                "hooklusion-profile://gpchan-default/assets/basic/tool_active/frame_001.png",
              ],
              frameWeights: [1, 1],
            },
            drag_up: {
              ...staleProfile.animations.drag_up,
              frames: staleProfile.animations.drag_up.frames.slice(0, 2),
              frameWeights: [1, 1],
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const repository = createProfileRepository(root, {
      bundledProfiles: [
        createDefaultAnimationProfile(),
        createOfficeAssistantAnimationProfile(root),
      ],
      bundledAssetRoots: {
        "gpchan-default": resolveBundledProfileAssetDirectory(
          projectRoot,
          "gpchan-default",
        ),
        "office-assistant-default": resolveBundledAssetRoot(
          projectRoot,
          "office-assistant",
        ),
      },
    });

    const loaded = await repository.readProfile("gpchan-default");

    expect(loaded.assetSchemaVersion).toBe(
      createDefaultAnimationProfile().assetSchemaVersion,
    );
    expect(loaded.animations.session_start.frames).toHaveLength(3);
    expect(loaded.animations.tool_active.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/basic/tool_active/frame_000.png",
    ]);
    expect(loaded.animations.drag_up.frames).toHaveLength(3);
    await expect(
      readFile(
        join(
          root,
          "gpchan-default",
          "assets",
          "basic",
          "session_start",
          "frame_002.png",
        ),
      ),
    ).resolves.toBeDefined();
    await expect(
      readFile(
        join(
          root,
          "gpchan-default",
          "assets",
          "interact",
          "drag_up",
          "frame_002.png",
        ),
      ),
    ).resolves.toBeDefined();
  });

  it("bootstraps gpchan-default with bundled profile asset URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root, {
      bundledProfiles: [createOfficeAssistantAnimationProfile(root)],
    });

    await repository.listProfiles();
    const loaded = await repository.readProfile("gpchan-default");

    expect(loaded.animations.idle.frames[0]).toBe(
      "hooklusion-profile://gpchan-default/assets/basic/idle/frame_000.png",
    );
    expect(loaded.animations.tool_search.frames[0]).toBe(
      "hooklusion-profile://gpchan-default/assets/extension/tool_search/frame_000.png",
    );
    expect(loaded.animations.drag_left.frames[0]).toBe(
      "hooklusion-profile://gpchan-default/assets/interact/drag_left/frame_000.png",
    );
  });

  it("upgrades an existing gpchan default profile to use the bundled idle animation", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const legacyProfile = createDefaultAnimationProfile();
    await repository.saveProfile({
      ...legacyProfile,
      assetSchemaVersion: undefined,
      animations: Object.fromEntries(
        Object.entries(legacyProfile.animations).filter(
          ([animationName]) => animationName !== "idle",
        ),
      ),
      states: {
        ...legacyProfile.states,
        idle: { animation: "thinking" },
      },
    });

    const loaded = await repository.readProfile("gpchan-default");

    expect(loaded.states.idle?.animation).toBe("idle");
    expect(loaded.animations.idle.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/basic/idle/frame_000.png",
    ]);
  });

  it("keeps missing interaction mappings absent on legacy gpchan profiles", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const legacyProfile = createDefaultAnimationProfile();

    await repository.saveProfile({
      ...legacyProfile,
      assetSchemaVersion: undefined,
      animations: Object.fromEntries(
        Object.entries(legacyProfile.animations).filter(
          ([animationName]) =>
            ![
              "hover_in",
              "hover_out",
              "drag",
              "drag_up",
              "drag_down",
              "drag_left",
              "drag_right",
              "click",
            ].includes(animationName),
        ),
      ),
      states: Object.fromEntries(
        Object.entries(legacyProfile.states).filter(
          ([stateName]) =>
            ![
              "hover_in",
              "hover_out",
              "drag",
              "drag_up",
              "drag_down",
              "drag_left",
              "drag_right",
              "click",
            ].includes(stateName),
        ),
      ),
    });

    const loaded = await repository.readProfile("gpchan-default");

    expect(loaded.animations.drag).toBeUndefined();
    expect(loaded.animations.drag_left).toBeUndefined();
    expect(loaded.animations.click).toBeUndefined();
    expect(loaded.states.hover_in).toBeUndefined();
    expect(loaded.states.drag).toBeUndefined();
    expect(loaded.states.drag_right).toBeUndefined();
  });

  it("keeps missing hook extension mappings absent on legacy gpchan profiles", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const legacyProfile = createDefaultAnimationProfile();

    await repository.saveProfile({
      ...legacyProfile,
      assetSchemaVersion: undefined,
      animations: Object.fromEntries(
        Object.entries(legacyProfile.animations).filter(
          ([animationName]) =>
            ![
              "tool_read",
              "tool_search",
              "tool_explore",
              "tool_web",
              "tool_vcs_read",
              "tool_vcs_write",
              "tool_test",
              "tool_build",
            ].includes(animationName),
        ),
      ),
      states: Object.fromEntries(
        Object.entries(legacyProfile.states).filter(
          ([stateName]) =>
            ![
              "tool_read",
              "tool_search",
              "tool_explore",
              "tool_web",
              "tool_vcs_read",
              "tool_vcs_write",
              "tool_test",
              "tool_build",
            ].includes(stateName),
        ),
      ),
    });

    const loaded = await repository.readProfile("gpchan-default");

    expect(loaded.animations.tool_read).toBeUndefined();
    expect(loaded.animations.tool_build).toBeUndefined();
    expect(loaded.states.tool_search).toBeUndefined();
    expect(loaded.states.tool_build).toBeUndefined();
  });

  it("upgrades an existing gpchan default profile with missing transition animations even when asset schema is current", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const legacyProfile = createDefaultAnimationProfile();

    await repository.saveProfile({
      ...legacyProfile,
      assetSchemaVersion: 1,
      animations: Object.fromEntries(
        Object.entries(legacyProfile.animations).filter(
          ([animationName]) =>
            !["transition_in", "transition_out"].includes(animationName),
        ),
      ),
    });

    const loaded = await repository.readProfile("gpchan-default");

    expect(loaded.animations.transition_in?.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/transition_in/frame_000.png",
      "hooklusion-profile://gpchan-default/assets/transition_in/frame_001.png",
      "hooklusion-profile://gpchan-default/assets/transition_in/frame_002.png",
      "hooklusion-profile://gpchan-default/assets/transition_in/frame_003.png",
    ]);
    expect(loaded.animations.transition_out?.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/transition_out/frame_000.png",
      "hooklusion-profile://gpchan-default/assets/transition_out/frame_001.png",
      "hooklusion-profile://gpchan-default/assets/transition_out/frame_002.png",
      "hooklusion-profile://gpchan-default/assets/transition_out/frame_003.png",
    ]);
  });

  it("ignores directories without profile.json while bootstrapping", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    await mkdir(join(root, "stray"), { recursive: true });
    const repository = createProfileRepository(root, {
      bundledProfiles: [createOfficeAssistantAnimationProfile(root)],
    });

    const profiles = await repository.listProfiles();

    expect(
      await readFile(join(root, "gpchan-default", PROFILE_FILE_NAME), "utf8"),
    ).toContain('"id": "gpchan-default"');
    expect(profiles.map((profile) => profile.id).sort()).toEqual([
      "gpchan-default",
      "office-assistant-default",
    ]);
  });

  it("materializes bundled office assistant profiles to disk during reads", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const projectRoot = resolveProjectRoot(process.cwd());
    const repository = createProfileRepository(root, {
      bundledProfiles: [
        createDefaultAnimationProfile(),
        createOfficeAssistantAnimationProfile(root),
      ],
      bundledAssetRoots: {
        "gpchan-default": resolveBundledProfileAssetDirectory(
          projectRoot,
          "gpchan-default",
        ),
        "office-assistant-default": resolveBundledAssetRoot(
          projectRoot,
          "office-assistant",
        ),
      },
    });

    const loaded = await repository.readProfile("office-assistant-default");

    expect(loaded.name).toBe("Office Assistant");
    expect(loaded.states.tool_read?.animation).toBe("tool_read");
    await expect(
      readFile(
        join(root, "office-assistant-default", PROFILE_FILE_NAME),
        "utf8",
      ),
    ).resolves.toContain('"id": "office-assistant-default"');
  });

  it("keeps bundled office-assistant-default available after replacing gpchan-default", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root, {
      bundledProfiles: [createOfficeAssistantAnimationProfile(root)],
    });
    await repository.listProfiles();
    const spriteSetRoot = await createSpriteSetRoot(join(root, "sprite-set"), {
      "basic/idle": 1,
      "basic/session_start": 1,
      "basic/prompt_received": 1,
      "basic/thinking": 1,
      "basic/tool_active": 1,
      "basic/done": 1,
    });

    await repository.applySpriteSetImport({
      sourcePath: spriteSetRoot,
      sourceType: "directory",
      applyMode: "replace_profile",
      targetProfileId: "gpchan-default",
    });

    const profiles = await repository.listProfiles();

    expect(profiles.map((profile) => profile.id).sort()).toEqual([
      "gpchan-default",
      "office-assistant-default",
    ]);
    expect(
      profiles.find((profile) => profile.id === "office-assistant-default")
        ?.name,
    ).toBe("Office Assistant");
  });

  it("imports profile assets into the profile assets directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const source = join(root, "thinking.png");
    await writeFile(source, "image-bytes", "utf8");
    const repository = createProfileRepository(root);
    await repository.saveProfile(createDefaultAnimationProfile());

    const importedPath = await repository.importProfileAsset(
      "gpchan-default",
      source,
    );

    expect(importedPath).toBe(
      "hooklusion-profile://gpchan-default/assets/thinking.png",
    );
    await expect(
      readFile(join(root, "gpchan-default", "assets", "thinking.png"), "utf8"),
    ).resolves.toBe("image-bytes");
  });

  it("adds a content hash when imported asset names collide", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const source = join(root, "thinking.png");
    await writeFile(source, "new-image", "utf8");
    const repository = createProfileRepository(root);
    await repository.saveProfile(createDefaultAnimationProfile());
    await mkdir(join(root, "gpchan-default", "assets"), { recursive: true });
    await writeFile(
      join(root, "gpchan-default", "assets", "thinking.png"),
      "old-image",
      "utf8",
    );

    const importedPath = await repository.importProfileAsset(
      "gpchan-default",
      source,
    );

    expect(importedPath).toMatch(
      /^hooklusion-profile:\/\/gpchan-default\/assets\/thinking-[a-f0-9]{8}\.png$/,
    );
    const importedFileName = importedPath.split("/").at(-1);
    expect(importedFileName).toBeDefined();
    await expect(
      readFile(
        join(root, "gpchan-default", "assets", importedFileName ?? ""),
        "utf8",
      ),
    ).resolves.toBe("new-image");
  });

  it("materializes saved imported asset paths when loading profiles", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const importedAssetPath = join(
      root,
      "gpchan-default",
      "assets",
      "imported.png",
    );
    await mkdir(dirname(importedAssetPath), { recursive: true });
    await writeFile(importedAssetPath, "image-bytes", "utf8");
    const profile = createDefaultAnimationProfile();
    await repository.saveProfile({
      ...profile,
      animations: {
        ...profile.animations,
        session_start: {
          ...profile.animations.session_start,
          frames: ["assets/imported.png"],
          frameWeights: [1],
        },
      },
    });

    const loaded = await repository.readProfile("gpchan-default");

    expect(loaded.animations.session_start.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/imported.png",
    ]);
  });

  it("materializes saved file URLs inside profile assets when loading profiles", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const importedAssetPath = join(
      root,
      "gpchan-default",
      "assets",
      "imported.png",
    );
    await mkdir(dirname(importedAssetPath), { recursive: true });
    await writeFile(importedAssetPath, "image-bytes", "utf8");
    const profile = createDefaultAnimationProfile();
    await repository.saveProfile({
      ...profile,
      animations: {
        ...profile.animations,
        session_start: {
          ...profile.animations.session_start,
          frames: [pathToFileURL(importedAssetPath).href],
          frameWeights: [1],
        },
      },
    });

    const loaded = await repository.readProfile("gpchan-default");

    expect(loaded.animations.session_start.frames).toEqual([
      "hooklusion-profile://gpchan-default/assets/imported.png",
    ]);
  });

  it("deletes a saved profile", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    await repository.saveProfile({
      ...createDefaultAnimationProfile(),
      id: "custom",
      name: "Custom",
    });

    await repository.deleteProfile("custom");

    await expect(
      readFile(join(root, "custom", PROFILE_FILE_NAME), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("exports and imports a profile package directory with state policy and assets intact", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const importedAssetPath = join(
      root,
      "custom-package",
      "assets",
      "pose.png",
    );
    await mkdir(dirname(importedAssetPath), { recursive: true });
    await writeFile(importedAssetPath, "pose-bytes", "utf8");
    await repository.saveProfile({
      ...createSelfContainedProfile("custom-package", "Custom Package"),
      presentation: {
        floatingMotion: false,
      },
      animations: {
        ...createSelfContainedProfile("custom-package", "Custom Package")
          .animations,
        thinking: {
          ...createSelfContainedProfile("custom-package", "Custom Package")
            .animations.thinking,
          frames: ["assets/pose.png"],
          frameWeights: [1],
          totalDurationMs: 1234,
        },
      },
      states: {
        ...createSelfContainedProfile("custom-package", "Custom Package")
          .states,
        thinking: {
          animation: "thinking",
          minCycles: 2,
          minDwellMs: 345,
          interruptible: false,
        },
      },
    });

    const exportDirectory = join(root, "exports", "custom-package");
    await repository.exportProfilePackage(
      "custom-package",
      exportDirectory,
      "directory",
    );
    await repository.deleteProfile("custom-package");

    const imported = await repository.importProfilePackage({
      sourcePath: exportDirectory,
      sourceType: "directory",
      applyMode: "create_profile",
    });

    expect(imported.id).toBe("custom-package");
    expect(imported.name).toBe("Custom Package");
    expect(imported.spriteRoot).toBe("assets");
    expect(imported.presentation?.floatingMotion).toBe(false);
    expect(imported.states.thinking?.minCycles).toBe(2);
    expect(imported.states.thinking?.minDwellMs).toBe(345);
    expect(imported.states.thinking?.interruptible).toBe(false);
    expect(imported.animations.thinking.totalDurationMs).toBe(1234);
    expect(imported.animations.thinking.frames).toEqual([
      "hooklusion-profile://custom-package/assets/basic/thinking/frame_000.png",
    ]);
    await expect(
      readFile(join(exportDirectory, "manifest.json"), "utf8"),
    ).resolves.toContain('"kind": "hooklusion-profile-package"');
    await expect(
      readFile(join(exportDirectory, "assets", "pose.png"), "utf8"),
    ).resolves.toBe("pose-bytes");
  });

  it("normalizes exported package frames into state folders with contiguous names", async () => {
    const root = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const repository = createProfileRepository(root);
    const importedAssetPath = join(
      root,
      "normalized-export",
      "assets",
      "pose.png",
    );
    await mkdir(dirname(importedAssetPath), { recursive: true });
    await writeFile(importedAssetPath, "pose-bytes", "utf8");
    await repository.saveProfile({
      ...createSelfContainedProfile("normalized-export", "Normalized Export"),
      animations: {
        ...createSelfContainedProfile("normalized-export", "Normalized Export")
          .animations,
        thinking: {
          ...createSelfContainedProfile(
            "normalized-export",
            "Normalized Export",
          ).animations.thinking,
          frames: ["assets/pose.png"],
          frameWeights: [1],
        },
      },
      states: {
        ...createSelfContainedProfile("normalized-export", "Normalized Export")
          .states,
        thinking: {
          animation: "thinking",
        },
      },
    });

    const exportDirectory = join(root, "exports", "normalized-export");
    await repository.exportProfilePackage(
      "normalized-export",
      exportDirectory,
      "directory",
    );

    const exportedProfile = JSON.parse(
      await readFile(join(exportDirectory, PROFILE_FILE_NAME), "utf8"),
    ) as {
      animations: Record<string, { frames: string[] }>;
    };

    expect(exportedProfile.animations.thinking.frames).toEqual([
      "assets/basic/thinking/frame_000.png",
    ]);
    await expect(
      readFile(
        join(exportDirectory, "assets", "basic", "thinking", "frame_000.png"),
        "utf8",
      ),
    ).resolves.toBe("pose-bytes");
  });

  it("exports and imports a zipped profile package with state policy and assets intact", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const sourceRepository = createProfileRepository(sourceRoot);
    const importedAssetPath = join(
      sourceRoot,
      "zip-profile",
      "assets",
      "pose.png",
    );
    await mkdir(dirname(importedAssetPath), { recursive: true });
    await writeFile(importedAssetPath, "zip-pose", "utf8");
    await sourceRepository.saveProfile({
      ...createSelfContainedProfile("zip-profile", "Zip Profile"),
      animations: {
        ...createSelfContainedProfile("zip-profile", "Zip Profile").animations,
        session_start: {
          ...createSelfContainedProfile("zip-profile", "Zip Profile").animations
            .session_start,
          frames: ["assets/pose.png"],
          frameWeights: [1],
        },
      },
      states: {
        ...createSelfContainedProfile("zip-profile", "Zip Profile").states,
        session_start: {
          animation: "session_start",
          minCycles: 3,
        },
      },
    });

    const zipPath = join(sourceRoot, "exports", "zip-profile.zip");
    await sourceRepository.exportProfilePackage("zip-profile", zipPath, "zip");

    const targetRoot = await mkdtemp(
      join(tmpdir(), "hooklusion-profiles-import-"),
    );
    const targetRepository = createProfileRepository(targetRoot);
    const imported = await targetRepository.importProfilePackage({
      sourcePath: zipPath,
      sourceType: "zip",
      applyMode: "create_profile",
    });

    expect(imported.id).toBe("zip-profile");
    expect(imported.states.session_start?.minCycles).toBe(3);
    expect(imported.animations.session_start.frames).toEqual([
      "hooklusion-profile://zip-profile/assets/basic/session_start/frame_000.png",
    ]);
    await expect(
      readFile(join(targetRoot, "zip-profile", "assets", "pose.png"), "utf8"),
    ).resolves.toBe("zip-pose");
  });

  it("preserves imported overrides for bundled profiles after replacement", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "hooklusion-profiles-"));
    const sourceRepository = createProfileRepository(sourceRoot);
    const sourceAssetPath = join(
      sourceRoot,
      "gpchan-default",
      "assets",
      "pose.png",
    );
    await mkdir(dirname(sourceAssetPath), { recursive: true });
    await writeFile(sourceAssetPath, "override-pose", "utf8");
    await sourceRepository.saveProfile({
      ...createSelfContainedProfile("gpchan-default", "GP Chan"),
      assetSchemaVersion: 3,
      animations: {
        ...createSelfContainedProfile("gpchan-default", "GP Chan").animations,
        thinking: {
          ...createSelfContainedProfile("gpchan-default", "GP Chan").animations
            .thinking,
          frames: ["assets/pose.png"],
          frameWeights: [1],
          totalDurationMs: 1234,
        },
      },
      states: {
        ...createSelfContainedProfile("gpchan-default", "GP Chan").states,
        hover_in: {
          animation: "hover_in",
          holdLastFrame: true,
        },
      },
    });

    const exportDirectory = join(sourceRoot, "exports", "gpchan-default");
    await sourceRepository.exportProfilePackage(
      "gpchan-default",
      exportDirectory,
      "directory",
    );

    const targetRoot = await mkdtemp(
      join(tmpdir(), "hooklusion-profiles-import-"),
    );
    const projectRoot = resolveProjectRoot(process.cwd());
    const targetRepository = createProfileRepository(targetRoot, {
      bundledProfiles: [
        createDefaultAnimationProfile(),
        createOfficeAssistantAnimationProfile(targetRoot),
      ],
      bundledAssetRoots: {
        "gpchan-default": resolveBundledProfileAssetDirectory(
          projectRoot,
          "gpchan-default",
        ),
        "office-assistant-default": resolveBundledAssetRoot(
          projectRoot,
          "office-assistant",
        ),
      },
    });

    await targetRepository.importProfilePackage({
      sourcePath: exportDirectory,
      sourceType: "directory",
      applyMode: "replace_profile",
      targetProfileId: "gpchan-default",
      targetProfileName: "GP Chan",
    });

    const loaded = await targetRepository.readProfile("gpchan-default");
    const listed = await targetRepository.listProfiles();
    const listedGpchan = listed.find(
      (profile) => profile.id === "gpchan-default",
    );

    expect(loaded.assetSchemaVersion).toBe(3);
    expect(loaded.animations.thinking.totalDurationMs).toBe(1234);
    expect(loaded.states.hover_in?.holdLastFrame).toBe(true);
    expect(listedGpchan?.animations.thinking.totalDurationMs).toBe(1234);
    expect(listedGpchan?.states.hover_in?.holdLastFrame).toBe(true);
  });
});

async function createSpriteSetRoot(
  root: string,
  entries: Record<string, number>,
) {
  await rm(root, { recursive: true, force: true });
  await mkdir(join(root, "basic"), { recursive: true });
  await mkdir(join(root, "extension"), { recursive: true });
  await mkdir(join(root, "interact"), { recursive: true });

  for (const [statePath, frameCount] of Object.entries(entries)) {
    const stateDirectory = join(root, statePath);
    await mkdir(stateDirectory, { recursive: true });

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      await writeFile(
        join(
          stateDirectory,
          `frame_${String(frameIndex).padStart(3, "0")}.png`,
        ),
        `${statePath}:${frameIndex}`,
        "utf8",
      );
    }
  }

  return root;
}

function createSelfContainedProfile(
  id: string,
  name: string,
): AnimationProfile {
  const baseProfile = createDefaultAnimationProfile();

  return {
    ...baseProfile,
    id,
    name,
    spriteRoot: "assets",
    animations: Object.fromEntries(
      Object.entries(baseProfile.animations).map(
        ([animationName, animation]) => [
          animationName,
          {
            ...animation,
            frames: ["assets/pose.png"],
            frameWeights: [1],
          },
        ],
      ),
    ),
  };
}
