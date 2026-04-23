import type {
  AnimationProfile,
  SpriteSetImportRequest,
} from "../../shared/animationProfile.js";

export interface StudioSpriteSetImportOptions {
  existingProfileIds: string[];
  confirmImport: () => Promise<boolean>;
  selectSourcePath: () => Promise<string | null>;
  applyImport: (request: SpriteSetImportRequest) => Promise<AnimationProfile>;
}

export async function requestStudioSpriteSetImport({
  existingProfileIds,
  confirmImport,
  selectSourcePath,
  applyImport,
}: StudioSpriteSetImportOptions) {
  if (!(await confirmImport())) {
    return null;
  }

  const sourcePath = await selectSourcePath();

  if (sourcePath === null) {
    return null;
  }

  const { targetProfileId, targetProfileName } = deriveImportedProfileIdentity(
    sourcePath,
    existingProfileIds,
  );

  const request: SpriteSetImportRequest = {
    sourcePath,
    sourceType: "directory",
    applyMode: "create_profile",
    targetProfileId,
    targetProfileName,
  };

  return applyImport(request);
}

function deriveImportedProfileIdentity(
  sourcePath: string,
  existingProfileIds: string[],
) {
  const folderName = readLastPathSegment(sourcePath);
  const targetProfileName = formatImportedProfileName(folderName);
  const baseProfileId = formatImportedProfileId(folderName);

  return {
    targetProfileId: ensureUniqueProfileId(baseProfileId, existingProfileIds),
    targetProfileName,
  };
}

function readLastPathSegment(sourcePath: string) {
  const normalized = sourcePath.replaceAll("\\", "/");
  const segments = normalized.split("/").filter(Boolean);
  return segments.at(-1) ?? "imported-profile";
}

function formatImportedProfileId(folderName: string) {
  const normalized = folderName
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^[-_]+|[-_]+$/g, "");

  return normalized === "" ? "imported-profile" : normalized;
}

function formatImportedProfileName(folderName: string) {
  const cleaned = folderName
    .trim()
    .replaceAll(/[-_]+/g, " ")
    .replaceAll(/\s+/g, " ");

  if (cleaned === "") {
    return "Imported Profile";
  }

  return cleaned.replaceAll(/\b\w/g, (letter) => letter.toUpperCase());
}

function ensureUniqueProfileId(
  baseProfileId: string,
  existingProfileIds: string[],
) {
  const existing = new Set(existingProfileIds);

  if (!existing.has(baseProfileId)) {
    return baseProfileId;
  }

  let index = 2;
  while (existing.has(`${baseProfileId}-${index}`)) {
    index += 1;
  }

  return `${baseProfileId}-${index}`;
}
