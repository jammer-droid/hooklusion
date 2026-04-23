import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  type AnimationProfile,
  PROFILE_TRANSITION_ANIMATION_NAMES,
  type ProfileStateName,
  type SpriteSetImportRequest,
  validateAnimationProfile,
} from "../shared/animationProfile.js";
import {
  CANONICAL_PACK_STATES,
  EXTENDED_TOOL_PACK_STATES,
  INTERACTION_PACK_STATES,
} from "../shared/packState.js";
import {
  createProfileAssetUrl,
  parseProfileAssetUrl,
} from "../shared/profileAssetUrl.js";
import { createDefaultAnimationProfile } from "./defaultProfile.js";
import { prepareSpriteSetImport } from "./spriteSetImport.js";

export const PROFILE_FILE_NAME = "profile.json";
export const PROFILE_PACKAGE_MANIFEST_FILE_NAME = "manifest.json";
const BUNDLED_OVERRIDE_MARKER_FILE_NAME = ".bundled-override";
const SAFE_PROFILE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const PROFILE_PACKAGE_KIND = "hooklusion-profile-package";
const execFileAsync = promisify(execFile);
const EXPORT_STATE_GROUPS = new Map<
  ProfileStateName,
  "basic" | "extension" | "interact"
>([
  ...CANONICAL_PACK_STATES.map((state) => [state, "basic"] as const),
  ...EXTENDED_TOOL_PACK_STATES.map((state) => [state, "extension"] as const),
  ...INTERACTION_PACK_STATES.map((state) => [state, "interact"] as const),
]);

export interface CreateProfileRepositoryOptions {
  bundledProfiles?: AnimationProfile[];
  bundledAssetRoots?: Record<string, string>;
}

type ProfilePackageSourceType = "directory" | "zip";
type ProfilePackageExportFormat = "directory" | "zip";
type ProfilePackageImportMode = "create_profile" | "replace_profile";

export interface ProfilePackageImportRequest {
  sourcePath: string;
  sourceType: ProfilePackageSourceType;
  applyMode: ProfilePackageImportMode;
  targetProfileId?: string;
  targetProfileName?: string;
}

export function createProfileRepository(
  rootDirectory: string,
  options: CreateProfileRepositoryOptions = {},
) {
  const bundledProfiles = new Map(
    (options.bundledProfiles ?? []).map((profile) => [profile.id, profile]),
  );
  const bundledAssetRoots = new Map(
    Object.entries(options.bundledAssetRoots ?? {}),
  );

  async function ensureBundledProfilesMaterialized() {
    await mkdir(rootDirectory, { recursive: true });

    if (!bundledProfiles.has("gpchan-default")) {
      await ensureLegacyDefaultProfile();
    }

    for (const [profileId, profile] of bundledProfiles) {
      const bundledAssetRoot = bundledAssetRoots.get(profileId);

      if (bundledAssetRoot === undefined) {
        continue;
      }

      await materializeBundledProfile({
        rootDirectory,
        profile,
        bundledAssetRoot,
      });
    }
  }

  async function ensureLegacyDefaultProfile() {
    try {
      await access(join(rootDirectory, "gpchan-default", PROFILE_FILE_NAME));
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }

      await saveProfile(createDefaultAnimationProfile());
    }
  }

  async function listProfiles(): Promise<AnimationProfile[]> {
    await ensureBundledProfilesMaterialized();
    const entries = await readdir(rootDirectory, { withFileTypes: true });
    const profiles: AnimationProfile[] = [];
    const loadedProfileIds = new Set<string>();

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const profileFilePath = join(
        rootDirectory,
        entry.name,
        PROFILE_FILE_NAME,
      );
      try {
        await access(profileFilePath);
      } catch (error) {
        if (isMissingFileError(error)) {
          continue;
        }

        throw error;
      }

      profiles.push(await readProfile(entry.name));
      loadedProfileIds.add(entry.name);
    }

    for (const profileId of bundledProfiles.keys()) {
      if (loadedProfileIds.has(profileId)) {
        continue;
      }

      profiles.push(await readProfile(profileId));
    }

    return profiles;
  }

  async function readProfile(profileId: string): Promise<AnimationProfile> {
    await ensureBundledProfilesMaterialized();
    assertSafeProfileId(profileId);
    const profileDirectory = join(rootDirectory, profileId);
    const directionalDragFallbackUpgradedProfile =
      await readUpgradedStoredProfile(
        profileDirectory,
        profileId,
        bundledProfiles,
      );

    return materializeImportedAssetFrames(
      profileDirectory,
      directionalDragFallbackUpgradedProfile,
    );
  }

  async function saveProfile(profile: AnimationProfile) {
    const validProfile = validateAnimationProfile(profile);
    assertSafeProfileId(validProfile.id);
    const profileDirectory = join(rootDirectory, validProfile.id);
    await mkdir(profileDirectory, { recursive: true });
    await writeFile(
      join(profileDirectory, PROFILE_FILE_NAME),
      `${JSON.stringify(validProfile, null, 2)}\n`,
      "utf8",
    );
  }

  async function importProfileAsset(profileId: string, sourcePath: string) {
    assertSafeProfileId(profileId);
    await access(join(rootDirectory, profileId, PROFILE_FILE_NAME));
    const assetDirectory = join(rootDirectory, profileId, "assets");
    await mkdir(assetDirectory, { recursive: true });
    const sourceBytes = await readFile(sourcePath);
    const importedFileName = await resolveImportedFileName(
      assetDirectory,
      sourcePath,
      sourceBytes,
    );
    const importedPath = join(assetDirectory, importedFileName);
    await copyFile(sourcePath, importedPath);
    return createProfileAssetUrl(profileId, `assets/${importedFileName}`);
  }

  async function deleteProfile(profileId: string) {
    assertSafeProfileId(profileId);
    await rm(join(rootDirectory, profileId), { recursive: true, force: true });
  }

  async function exportProfilePackage(
    profileId: string,
    destinationPath: string,
    format: ProfilePackageExportFormat,
  ) {
    assertSafeProfileId(profileId);
    const profile = await readProfile(profileId);

    if (format === "directory") {
      await writeProfilePackageDirectory(destinationPath, profile, {
        rootDirectory,
        bundledAssetRoots,
      });
      return destinationPath;
    }

    const tempDirectory = await mkdtemp(
      join(tmpdir(), "hooklusion-profile-package-export-"),
    );

    try {
      const packageDirectory = join(tempDirectory, profileId);
      await writeProfilePackageDirectory(packageDirectory, profile, {
        rootDirectory,
        bundledAssetRoots,
      });
      await mkdir(dirname(destinationPath), { recursive: true });
      await rm(destinationPath, { force: true });
      await execFileAsync("zip", ["-qr", destinationPath, "."], {
        cwd: packageDirectory,
      });
      return destinationPath;
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }

  async function importProfilePackage(request: ProfilePackageImportRequest) {
    const packageDirectory = await extractProfilePackageToDirectory(request);

    try {
      const importedProfile =
        await readProfilePackageDirectory(packageDirectory);
      const targetProfileId = request.targetProfileId ?? importedProfile.id;
      const targetProfileName =
        request.targetProfileName ?? importedProfile.name;
      assertSafeProfileId(targetProfileId);

      if (request.applyMode === "create_profile") {
        if (bundledProfiles.has(targetProfileId)) {
          throw new Error(
            `Profile ${targetProfileId} already exists as a bundled profile.`,
          );
        }

        try {
          await access(join(rootDirectory, targetProfileId, PROFILE_FILE_NAME));
          throw new Error(`Profile ${targetProfileId} already exists.`);
        } catch (error) {
          if (!isMissingFileError(error)) {
            throw error;
          }
        }
      }

      const targetProfileDirectory = join(rootDirectory, targetProfileId);
      await rm(targetProfileDirectory, { recursive: true, force: true });
      await mkdir(join(targetProfileDirectory, "assets"), { recursive: true });
      await cp(
        join(packageDirectory, "assets"),
        join(targetProfileDirectory, "assets"),
        { recursive: true },
      );

      await saveProfile({
        ...importedProfile,
        id: targetProfileId,
        name: targetProfileName,
        spriteRoot: "assets",
      });

      if (
        request.applyMode === "replace_profile" &&
        bundledProfiles.has(targetProfileId)
      ) {
        await writeFile(
          join(targetProfileDirectory, BUNDLED_OVERRIDE_MARKER_FILE_NAME),
          "imported\n",
          "utf8",
        );
      }

      return readProfile(targetProfileId);
    } finally {
      if (request.sourceType === "zip") {
        await rm(packageDirectory, { recursive: true, force: true });
      }
    }
  }

  async function applySpriteSetImport(request: SpriteSetImportRequest) {
    assertSafeProfileId(request.targetProfileId);

    if (request.applyMode === "create_profile") {
      if (bundledProfiles.has(request.targetProfileId)) {
        throw new Error(
          `Profile ${request.targetProfileId} already exists as a bundled profile.`,
        );
      }

      try {
        await access(
          join(rootDirectory, request.targetProfileId, PROFILE_FILE_NAME),
        );
        throw new Error(`Profile ${request.targetProfileId} already exists.`);
      } catch (error) {
        if (!isMissingFileError(error)) {
          throw error;
        }
      }
    }

    const existingProfile =
      request.applyMode === "create_profile"
        ? null
        : await readProfile(request.targetProfileId);
    const prepared = await prepareSpriteSetImport({
      request,
      existingProfile,
    });
    const profileDirectory = join(rootDirectory, prepared.profile.id);
    const assetDirectory = join(profileDirectory, "assets");

    if (
      request.applyMode === "create_profile" ||
      request.applyMode === "replace_profile"
    ) {
      await rm(assetDirectory, { recursive: true, force: true });
    } else {
      const assetDirectories = new Set(
        prepared.assetCopies.flatMap(({ group, state }) =>
          group === undefined || state === undefined
            ? []
            : [join(assetDirectory, group, state)],
        ),
      );

      for (const stateDirectory of assetDirectories) {
        await rm(stateDirectory, { recursive: true, force: true });
      }
    }

    for (const assetCopy of prepared.assetCopies) {
      const destinationPath = join(profileDirectory, assetCopy.assetPath);
      await mkdir(dirname(destinationPath), { recursive: true });
      await copyFile(assetCopy.sourcePath, destinationPath);
    }

    await saveProfile(prepared.profile);
    return readProfile(prepared.profile.id);
  }

  return {
    applySpriteSetImport,
    deleteProfile,
    exportProfilePackage,
    importProfilePackage,
    importProfileAsset,
    listProfiles,
    readProfile,
    saveProfile,
  };
}

async function materializeBundledProfile(options: {
  rootDirectory: string;
  profile: AnimationProfile;
  bundledAssetRoot: string;
}) {
  const { rootDirectory, profile, bundledAssetRoot } = options;
  const profileDirectory = join(rootDirectory, profile.id);
  const profileFilePath = join(profileDirectory, PROFILE_FILE_NAME);
  const normalizedProfile = normalizeProfileForExport(profile);
  let shouldRefreshBundledMaterialization = false;

  await mkdir(join(profileDirectory, "assets"), { recursive: true });

  try {
    await access(join(profileDirectory, BUNDLED_OVERRIDE_MARKER_FILE_NAME));
    return;
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
  }

  try {
    const storedProfile = JSON.parse(
      await readFile(profileFilePath, "utf8"),
    ) as Partial<AnimationProfile>;

    shouldRefreshBundledMaterialization =
      (storedProfile.assetSchemaVersion ?? 0) <
      (profile.assetSchemaVersion ?? 0);
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }

    shouldRefreshBundledMaterialization = true;
  }

  if (shouldRefreshBundledMaterialization) {
    await writeFile(
      profileFilePath,
      `${JSON.stringify(normalizedProfile, null, 2)}\n`,
      "utf8",
    );
  }

  for (const assetPath of collectProfileAssetPaths(profile)) {
    const destinationPath = join(profileDirectory, assetPath);

    if (!shouldRefreshBundledMaterialization) {
      try {
        await access(destinationPath);
        continue;
      } catch (error) {
        if (!isMissingFileError(error)) {
          throw error;
        }
      }
    }

    const bundledAssetPath = join(
      bundledAssetRoot,
      assetPath.slice("assets/".length),
    );
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(bundledAssetPath, destinationPath);
  }
}

function readUpgradedStoredProfile(
  profileDirectory: string,
  profileId: string,
  bundledProfiles: ReadonlyMap<string, AnimationProfile>,
) {
  return readStoredProfile(profileDirectory, profileId, bundledProfiles).then(
    (profile) => {
      const validatedProfile = validateAnimationProfile(profile);
      const bundledBaseline =
        bundledProfiles.get(profileId) ??
        (profileId.startsWith("gpchan-default")
          ? createDefaultAnimationProfile()
          : null);

      return upgradeBundledProfileDefaults(validatedProfile, bundledBaseline);
    },
  );
}

async function readStoredProfile(
  profileDirectory: string,
  profileId: string,
  bundledProfiles: ReadonlyMap<string, AnimationProfile>,
) {
  try {
    return JSON.parse(
      await readFile(join(profileDirectory, PROFILE_FILE_NAME), "utf8"),
    ) as AnimationProfile;
  } catch (error) {
    if (!isMissingFileError(error) || !bundledProfiles.has(profileId)) {
      throw error;
    }

    return bundledProfiles.get(profileId) as AnimationProfile;
  }
}

function assertSafeProfileId(profileId: string) {
  if (!SAFE_PROFILE_ID_PATTERN.test(profileId)) {
    throw new Error(`Profile id ${profileId} must be a safe directory name.`);
  }
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function upgradeBundledGpchanIdleProfile(
  profile: AnimationProfile,
): AnimationProfile {
  if (!isLegacyBundledGpchanProfile(profile)) {
    return profile;
  }

  const defaultProfile = createDefaultAnimationProfile();
  const defaultIdleAnimation = defaultProfile.animations.idle;

  if (defaultIdleAnimation === undefined) {
    return profile;
  }

  const states = {
    ...profile.states,
    idle: {
      ...profile.states.idle,
      animation: "idle",
    },
  };

  return {
    ...profile,
    animations: {
      ...profile.animations,
      idle: profile.animations.idle ?? defaultIdleAnimation,
    },
    states,
  };
}

function upgradeBundledMissingDefaults(
  profile: AnimationProfile,
  baselineProfile: AnimationProfile | null,
): AnimationProfile {
  if (baselineProfile === null || !isLegacyBundledGpchanProfile(profile)) {
    return profile;
  }

  const nextAnimations = { ...profile.animations };
  const nextStates = { ...profile.states };
  let changed = false;

  for (const animationName of PROFILE_TRANSITION_ANIMATION_NAMES) {
    const animation = baselineProfile.animations[animationName];
    if (animation === undefined) {
      continue;
    }

    if (nextAnimations[animationName] !== undefined) {
      continue;
    }

    nextAnimations[animationName] = animation;
    changed = true;
  }

  if (!changed) {
    return profile;
  }

  return {
    ...profile,
    assetSchemaVersion:
      profile.assetSchemaVersion ?? baselineProfile.assetSchemaVersion,
    presentation: profile.presentation ?? baselineProfile.presentation,
    animations: nextAnimations,
    states: nextStates,
  };
}

function upgradeBundledProfileDefaults(
  profile: AnimationProfile,
  baselineProfile: AnimationProfile | null,
) {
  const idleUpgradedProfile = upgradeBundledGpchanIdleProfile(profile);
  return upgradeBundledMissingDefaults(idleUpgradedProfile, baselineProfile);
}

function isLegacyBundledGpchanProfile(profile: AnimationProfile) {
  return (
    profile.id.startsWith("gpchan-default") &&
    (profile.assetSchemaVersion ?? 0) < 2
  );
}

async function materializeImportedAssetFrames(
  profileDirectory: string,
  profile: AnimationProfile,
): Promise<AnimationProfile> {
  const animations = Object.fromEntries(
    await Promise.all(
      Object.entries(profile.animations).map(
        async ([animationName, animation]) => [
          animationName,
          {
            ...animation,
            frames: await Promise.all(
              animation.frames.map((frame) =>
                materializeImportedAssetFrame(profileDirectory, frame),
              ),
            ),
          },
        ],
      ),
    ),
  );

  return {
    ...profile,
    animations,
  };
}

async function materializeImportedAssetFrame(
  profileDirectory: string,
  frame: string,
) {
  const profileId = basename(profileDirectory);

  if (parseProfileAssetUrl(frame) !== null) {
    return frame;
  }

  const fileAssetPath = tryReadProfileAssetPathFromFileUrl(
    profileDirectory,
    frame,
  );

  if (fileAssetPath !== null) {
    return createProfileAssetUrl(profileId, fileAssetPath);
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(frame)) {
    return frame;
  }

  if (!frame.startsWith("assets/")) {
    return frame;
  }

  const importedPath = join(profileDirectory, frame);

  try {
    await access(importedPath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return frame;
    }

    throw error;
  }

  return createProfileAssetUrl(profileId, frame);
}

function tryReadProfileAssetPathFromFileUrl(
  profileDirectory: string,
  frame: string,
) {
  let filePath: string;

  try {
    filePath = fileURLToPath(frame);
  } catch {
    return null;
  }

  const assetDirectory = join(profileDirectory, "assets");

  if (!filePath.startsWith(`${assetDirectory}/`)) {
    return null;
  }

  return `assets/${filePath.slice(assetDirectory.length + 1)}`;
}

async function resolveImportedFileName(
  assetDirectory: string,
  sourcePath: string,
  sourceBytes: Buffer,
) {
  const fileName = basename(sourcePath);

  try {
    await access(join(assetDirectory, fileName));
  } catch (error) {
    if (isMissingFileError(error)) {
      return fileName;
    }

    throw error;
  }

  const extension = extname(fileName);
  const baseName = fileName.slice(0, fileName.length - extension.length);
  const hash = createHash("sha256")
    .update(sourceBytes)
    .digest("hex")
    .slice(0, 8);
  return `${baseName}-${hash}${extension}`;
}

async function writeProfilePackageDirectory(
  destinationPath: string,
  profile: AnimationProfile,
  options: {
    rootDirectory: string;
    bundledAssetRoots: ReadonlyMap<string, string>;
  },
) {
  const exportManifest = buildProfilePackageExportManifest(profile);

  await rm(destinationPath, { recursive: true, force: true });
  await mkdir(join(destinationPath, "assets"), { recursive: true });

  for (const assetCopy of exportManifest.assetCopies) {
    const sourcePath = await resolveProfileAssetSourcePath(
      options.rootDirectory,
      options.bundledAssetRoots,
      profile.id,
      assetCopy.sourceAssetPath,
    );
    const destinationAssetPath = join(
      destinationPath,
      assetCopy.exportedAssetPath,
    );
    await mkdir(dirname(destinationAssetPath), { recursive: true });
    await copyFile(sourcePath, destinationAssetPath);
  }

  await writeFile(
    join(destinationPath, PROFILE_PACKAGE_MANIFEST_FILE_NAME),
    `${JSON.stringify(
      {
        kind: PROFILE_PACKAGE_KIND,
        version: 1,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await writeFile(
    join(destinationPath, PROFILE_FILE_NAME),
    `${JSON.stringify(exportManifest.profile, null, 2)}\n`,
    "utf8",
  );
}

function buildProfilePackageExportManifest(profile: AnimationProfile): {
  profile: AnimationProfile;
  assetCopies: Array<{
    sourceAssetPath: string;
    exportedAssetPath: string;
  }>;
} {
  const stateAnimationOwners = readStateAnimationOwners(profile);
  const assetCopies: Array<{
    sourceAssetPath: string;
    exportedAssetPath: string;
  }> = [];

  return {
    profile: {
      ...profile,
      spriteRoot: "assets",
      animations: Object.fromEntries(
        Object.entries(profile.animations).map(([animationName, animation]) => {
          const ownerStateName =
            stateAnimationOwners.get(animationName) ?? null;
          return [
            animationName,
            {
              ...animation,
              frames: animation.frames.map((frame, frameIndex) => {
                const sourceAssetPath = readExportFrameAssetPath(
                  profile.id,
                  frame,
                );
                const exportedAssetPath = readNormalizedExportAssetPath({
                  sourceAssetPath,
                  ownerStateName,
                  frameIndex,
                });
                assetCopies.push({
                  sourceAssetPath,
                  exportedAssetPath,
                });
                return exportedAssetPath;
              }),
            },
          ];
        }),
      ),
    },
    assetCopies,
  };
}

function readStateAnimationOwners(profile: AnimationProfile) {
  const owners = new Map<string, ProfileStateName | null>();

  for (const [stateName, mapping] of Object.entries(profile.states) as Array<
    [ProfileStateName, AnimationProfile["states"][ProfileStateName]]
  >) {
    if (mapping === undefined) {
      continue;
    }

    const existingOwner = owners.get(mapping.animation);

    if (existingOwner === undefined) {
      owners.set(mapping.animation, stateName);
      continue;
    }

    if (existingOwner !== stateName) {
      owners.set(mapping.animation, null);
    }
  }

  return owners;
}

function collectProfileAssetPaths(profile: AnimationProfile) {
  const assetPaths = new Set<string>();

  for (const animation of Object.values(profile.animations)) {
    for (const frame of animation.frames) {
      assetPaths.add(readExportFrameAssetPath(profile.id, frame));
    }
  }

  return assetPaths;
}

async function readProfilePackageDirectory(packageDirectory: string) {
  const manifest = JSON.parse(
    await readFile(
      join(packageDirectory, PROFILE_PACKAGE_MANIFEST_FILE_NAME),
      "utf8",
    ),
  ) as { kind?: string; version?: number };

  if (manifest.kind !== PROFILE_PACKAGE_KIND || manifest.version !== 1) {
    throw new Error("Unsupported profile package manifest.");
  }

  const profile = validateAnimationProfile(
    JSON.parse(
      await readFile(join(packageDirectory, PROFILE_FILE_NAME), "utf8"),
    ) as AnimationProfile,
  );

  for (const animation of Object.values(profile.animations)) {
    for (const frame of animation.frames) {
      const assetPath = readImportPackageAssetPath(frame);
      await access(join(packageDirectory, assetPath));
    }
  }

  return {
    ...profile,
    spriteRoot: "assets",
  };
}

async function extractProfilePackageToDirectory(
  request: ProfilePackageImportRequest,
) {
  if (request.sourceType === "directory") {
    return request.sourcePath;
  }

  const tempDirectory = await mkdtemp(
    join(tmpdir(), "hooklusion-profile-package-import-"),
  );
  await execFileAsync("unzip", ["-q", request.sourcePath, "-d", tempDirectory]);
  return tempDirectory;
}

function readNormalizedExportAssetPath({
  sourceAssetPath,
  ownerStateName,
  frameIndex,
}: {
  sourceAssetPath: string;
  ownerStateName: ProfileStateName | null;
  frameIndex: number;
}) {
  if (ownerStateName === null) {
    return sourceAssetPath;
  }

  const group = EXPORT_STATE_GROUPS.get(ownerStateName);

  if (group === undefined) {
    return sourceAssetPath;
  }

  return `assets/${group}/${ownerStateName}/frame_${String(frameIndex).padStart(3, "0")}${extname(sourceAssetPath)}`;
}

function normalizeProfileForExport(
  profile: AnimationProfile,
): AnimationProfile {
  return {
    ...profile,
    spriteRoot: "assets",
    animations: Object.fromEntries(
      Object.entries(profile.animations).map(([animationName, animation]) => [
        animationName,
        {
          ...animation,
          frames: animation.frames.map((frame) =>
            readExportFrameAssetPath(profile.id, frame),
          ),
        },
      ]),
    ),
  };
}

function readExportFrameAssetPath(profileId: string, frame: string) {
  const parsedAssetUrl = parseProfileAssetUrl(frame);

  if (parsedAssetUrl !== null) {
    if (parsedAssetUrl.profileId !== profileId) {
      throw new Error(`Cannot export external profile asset ${frame}.`);
    }

    return parsedAssetUrl.assetPath;
  }

  if (frame.startsWith("assets/")) {
    return frame;
  }

  throw new Error(
    `Unsupported frame path for profile package export: ${frame}`,
  );
}

function readImportPackageAssetPath(frame: string) {
  if (!frame.startsWith("assets/")) {
    throw new Error(`Profile package frame ${frame} must live under assets/.`);
  }

  return frame;
}

async function resolveProfileAssetSourcePath(
  rootDirectory: string,
  bundledAssetRoots: ReadonlyMap<string, string>,
  profileId: string,
  assetPath: string,
) {
  const onDiskAssetPath = join(rootDirectory, profileId, assetPath);

  try {
    await access(onDiskAssetPath);
    return onDiskAssetPath;
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
  }

  const bundledAssetRoot = bundledAssetRoots.get(profileId);

  if (bundledAssetRoot === undefined) {
    throw new Error(`Missing asset ${assetPath} for profile ${profileId}.`);
  }

  const bundledAssetPath = join(
    bundledAssetRoot,
    assetPath.slice("assets/".length),
  );
  await access(bundledAssetPath);
  return bundledAssetPath;
}
