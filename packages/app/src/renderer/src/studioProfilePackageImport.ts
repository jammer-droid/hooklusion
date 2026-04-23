import type {
  AnimationProfile,
  ProfilePackageImportRequest,
  ProfilePackageSourceType,
} from "../../shared/animationProfile.js";

export function createStudioProfilePackageImportRequest(options: {
  selectedProfile: AnimationProfile;
  sourcePath: string;
  sourceType: ProfilePackageSourceType;
}): ProfilePackageImportRequest {
  return {
    sourcePath: options.sourcePath,
    sourceType: options.sourceType,
    applyMode: "replace_profile",
    targetProfileId: options.selectedProfile.id,
    targetProfileName: options.selectedProfile.name,
  };
}
