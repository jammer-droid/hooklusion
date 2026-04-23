import type { AnimationProfile } from "../../shared/animationProfile.js";

export interface MaterializeProfileFramePathOptions {
  resolveFrameUrl?: (framePath: string) => string | undefined;
}

export function materializeProfileFramePath(
  profile: AnimationProfile,
  frame: string,
  options: MaterializeProfileFramePathOptions = {},
) {
  if (isResolvedFramePath(frame)) {
    return frame;
  }

  const framePath = frame.startsWith(`${profile.spriteRoot}/`)
    ? frame
    : `${profile.spriteRoot}/${frame}`;
  return options.resolveFrameUrl?.(framePath) ?? framePath;
}

function isResolvedFramePath(frame: string) {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(frame);
}
