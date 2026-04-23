import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  AnimationProfile,
  ProfileAnimation,
  ProfileStateMapping,
  ProfileStateName,
  ProfileTransitionAnimationName,
  SpriteSetImportRequest,
} from "../shared/animationProfile.js";
import { PROFILE_TRANSITION_ANIMATION_NAMES } from "../shared/animationProfile.js";
import {
  CANONICAL_PACK_STATES,
  EXTENDED_TOOL_PACK_STATES,
  INTERACTION_PACK_STATES,
} from "../shared/packState.js";
import { createProfileAssetUrl } from "../shared/profileAssetUrl.js";
import { createDefaultAnimationProfile } from "./defaultProfile.js";

type SpriteSetGroupName = "basic" | "extension" | "interact";

interface PreparedSpriteSetImport {
  profile: AnimationProfile;
  assetCopies: Array<{
    sourcePath: string;
    assetPath: string;
    group?: SpriteSetGroupName;
    state?: ProfileStateName;
  }>;
}

interface PrepareSpriteSetImportOptions {
  request: SpriteSetImportRequest;
  existingProfile: AnimationProfile | null;
}

const GROUP_STATE_NAMES: Record<
  SpriteSetGroupName,
  readonly ProfileStateName[]
> = {
  basic: CANONICAL_PACK_STATES,
  extension: EXTENDED_TOOL_PACK_STATES,
  interact: INTERACTION_PACK_STATES,
};

const STATE_GROUPS = new Map<ProfileStateName, SpriteSetGroupName>(
  Object.entries(GROUP_STATE_NAMES).flatMap(([group, states]) =>
    states.map((state) => [state, group as SpriteSetGroupName]),
  ),
);

export async function prepareSpriteSetImport({
  request,
  existingProfile,
}: PrepareSpriteSetImportOptions): Promise<PreparedSpriteSetImport> {
  if (request.sourceType !== "directory") {
    throw new Error("Only directory sprite-set imports are supported.");
  }

  const discovered = await readSpriteSetDirectory(request.sourcePath);
  const importedStateNames = discovered.states.map((state) => state.stateName);

  if (request.applyMode === "replace_states") {
    validateReplaceStateNames(request.replaceStates, importedStateNames);
  }

  const fallbackProfile =
    request.applyMode === "create_profile"
      ? createDefaultAnimationProfile()
      : existingProfile;

  if (fallbackProfile === null) {
    throw new Error(
      `Sprite-set apply mode ${request.applyMode} requires an existing profile.`,
    );
  }

  const importedAnimations = Object.fromEntries(
    [...discovered.states, ...discovered.transitions].map((state) => [
      state.animationName,
      buildImportedAnimation({
        targetProfileId: request.targetProfileId,
        animationName: state.animationName,
        relativeFramePaths: state.relativeFramePaths,
        fallbackProfile,
      }),
    ]),
  );

  const importedStates = Object.fromEntries(
    discovered.states.map((state) => [
      state.stateName,
      buildImportedStateMapping(state.stateName, fallbackProfile),
    ]),
  );

  const profile =
    request.applyMode === "replace_states"
      ? {
          ...fallbackProfile,
          assetSchemaVersion: 2,
          animations: {
            ...fallbackProfile.animations,
            ...importedAnimations,
          },
          states: {
            ...fallbackProfile.states,
            ...importedStates,
          },
        }
      : {
          ...fallbackProfile,
          assetSchemaVersion: 2,
          id: request.targetProfileId,
          name:
            request.applyMode === "create_profile"
              ? (request.targetProfileName ?? request.targetProfileId)
              : fallbackProfile.name,
          animations: importedAnimations,
          states: importedStates,
        };

  return {
    profile,
    assetCopies: [
      ...discovered.states.flatMap((state) =>
        state.relativeFramePaths.map((relativeFramePath) => ({
          sourcePath: join(request.sourcePath, relativeFramePath),
          assetPath: `assets/${relativeFramePath}`,
          group: state.group,
          state: state.stateName,
        })),
      ),
      ...discovered.transitions.flatMap((transition) =>
        transition.relativeFramePaths.map((relativeFramePath) => ({
          sourcePath: join(request.sourcePath, relativeFramePath),
          assetPath: `assets/${relativeFramePath}`,
        })),
      ),
    ],
  };
}

async function readSpriteSetDirectory(rootPath: string) {
  const rootEntries = await readdir(rootPath, { withFileTypes: true });
  const rootNames = rootEntries.map((entry) => entry.name).sort();
  const allowedRootNames = new Set([
    "basic",
    "extension",
    "interact",
    ...PROFILE_TRANSITION_ANIMATION_NAMES,
  ]);

  for (const entry of rootEntries) {
    if (!entry.isDirectory()) {
      throw new Error("Sprite-set root must contain only directories.");
    }

    if (!allowedRootNames.has(entry.name)) {
      throw new Error(
        "Sprite-set root must contain only basic, extension, interact, transition_in, and transition_out directories.",
      );
    }
  }

  const states: Array<{
    group: SpriteSetGroupName;
    animationName: ProfileStateName;
    stateName: ProfileStateName;
    relativeFramePaths: string[];
  }> = [];
  const transitions: Array<{
    animationName: ProfileTransitionAnimationName;
    relativeFramePaths: string[];
  }> = [];
  const rootEntryNames = new Set(rootNames);

  for (const group of ["basic", "extension", "interact"] as const) {
    if (!rootEntryNames.has(group)) {
      continue;
    }

    const groupEntries = await readdir(join(rootPath, group), {
      withFileTypes: true,
    });

    for (const entry of groupEntries) {
      if (!entry.isDirectory()) {
        throw new Error(
          `Sprite-set group ${group} must contain only state directories.`,
        );
      }

      if (!GROUP_STATE_NAMES[group].includes(entry.name as ProfileStateName)) {
        throw new Error(
          `Unsupported sprite-set state ${entry.name} in ${group}.`,
        );
      }

      const stateName = entry.name as ProfileStateName;
      const sortedFiles = await readFrameDirectory(
        join(rootPath, group, stateName),
        {
          label: `Sprite-set state ${stateName}`,
        },
      );

      states.push({
        group,
        animationName: stateName,
        stateName,
        relativeFramePaths: sortedFiles.map((fileName) =>
          join(group, stateName, fileName),
        ),
      });
    }
  }

  for (const animationName of PROFILE_TRANSITION_ANIMATION_NAMES) {
    if (!rootEntryNames.has(animationName)) {
      continue;
    }

    const sortedFiles = await readFrameDirectory(
      join(rootPath, animationName),
      {
        label: `Transition animation ${animationName}`,
      },
    );

    transitions.push({
      animationName,
      relativeFramePaths: sortedFiles.map((fileName) =>
        join(animationName, fileName),
      ),
    });
  }

  return { states, transitions };
}

function validateReplaceStateNames(
  replaceStates: ProfileStateName[] | undefined,
  importedStateNames: ProfileStateName[],
) {
  if (replaceStates === undefined || replaceStates.length === 0) {
    throw new Error("replace_states imports must declare replaceStates.");
  }

  const declared = new Set(replaceStates);
  const imported = new Set(importedStateNames);

  for (const stateName of replaceStates) {
    if (!imported.has(stateName)) {
      throw new Error(
        `replace_states import is missing requested state ${stateName}.`,
      );
    }
  }

  for (const stateName of importedStateNames) {
    if (!declared.has(stateName)) {
      throw new Error(
        `replace_states import included undeclared state ${stateName}.`,
      );
    }
  }
}

function buildImportedAnimation({
  targetProfileId,
  animationName,
  relativeFramePaths,
  fallbackProfile,
}: {
  targetProfileId: string;
  animationName: string;
  relativeFramePaths: string[];
  fallbackProfile: AnimationProfile;
}): ProfileAnimation {
  const templateState =
    fallbackProfile.states[animationName as ProfileStateName];
  const templateAnimation =
    fallbackProfile.animations[animationName] ??
    (templateState === undefined
      ? undefined
      : fallbackProfile.animations[templateState.animation]);

  return {
    frames: relativeFramePaths.map((relativeFramePath) =>
      createProfileAssetUrl(targetProfileId, `assets/${relativeFramePath}`),
    ),
    totalDurationMs:
      templateAnimation?.totalDurationMs ??
      Math.max(120 * relativeFramePaths.length, 1),
    frameWeights:
      templateAnimation?.frameWeights.length === relativeFramePaths.length
        ? [...templateAnimation.frameWeights]
        : relativeFramePaths.map(() => 1),
    loop:
      templateAnimation?.loop ??
      !isTransientState(animationName as ProfileStateName),
    transitionMs: templateAnimation?.transitionMs ?? 120,
  };
}

function buildImportedStateMapping(
  stateName: ProfileStateName,
  fallbackProfile: AnimationProfile,
): ProfileStateMapping {
  const templateMapping = fallbackProfile.states[stateName];

  return {
    ...(templateMapping ?? buildFallbackStateMapping(stateName)),
    animation: stateName,
  };
}

function buildFallbackStateMapping(
  stateName: ProfileStateName,
): ProfileStateMapping {
  if (stateName === "hover_in" || stateName === "click") {
    return {
      animation: stateName,
      allowDuringHookActivity: false,
    };
  }

  if (stateName === "hover_out") {
    return {
      animation: stateName,
      allowDuringHookActivity: false,
    };
  }

  if (STATE_GROUPS.get(stateName) === "extension") {
    return {
      animation: stateName,
    };
  }

  if (stateName === "drag" || INTERACTION_PACK_STATES.includes(stateName)) {
    return {
      animation: stateName,
      allowDuringHookActivity: true,
    };
  }

  return {
    animation: stateName,
  };
}

function isTransientState(stateName: ProfileStateName) {
  return (
    stateName === "hover_in" ||
    stateName === "hover_out" ||
    stateName === "click"
  );
}

async function readFrameDirectory(
  directoryPath: string,
  options: { label: string },
) {
  const frameEntries = await readdir(directoryPath, { withFileTypes: true });
  const sortedFiles = frameEntries
    .map((frameEntry) => {
      if (!frameEntry.isFile()) {
        throw new Error(`${options.label} must contain only PNG frames.`);
      }

      return frameEntry.name;
    })
    .sort();

  if (sortedFiles.length === 0) {
    throw new Error(`${options.label} must contain at least one frame.`);
  }

  for (const [index, fileName] of sortedFiles.entries()) {
    const expectedFileName = `frame_${String(index).padStart(3, "0")}.png`;
    if (fileName !== expectedFileName) {
      throw new Error(
        `${options.label} must use contiguous frame_000.png naming.`,
      );
    }
  }

  return sortedFiles;
}
