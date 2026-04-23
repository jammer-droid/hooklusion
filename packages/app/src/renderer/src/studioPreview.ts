import type { AnimationProfile } from "../../shared/animationProfile.js";
import { materializeProfileFramePath } from "./profileFramePath.js";

export interface StudioPreviewFrameOptions {
  resolveFrameUrl?: (framePath: string) => string;
}

export function getStudioPreviewFrameUrls(
  profile: AnimationProfile,
  animationName: string,
  options: StudioPreviewFrameOptions = {},
): string[] {
  const animation = profile.animations[animationName];

  if (animation === undefined) {
    throw new Error(`Animation ${animationName} was not found.`);
  }

  return animation.frames.map((frame) =>
    materializeProfileFramePath(profile, frame, options),
  );
}
