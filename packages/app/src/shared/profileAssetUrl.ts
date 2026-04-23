export const PROFILE_ASSET_PROTOCOL = "hooklusion-profile";

export interface ProfileAssetReference {
  profileId: string;
  assetPath: string;
}

export function createProfileAssetUrl(profileId: string, assetPath: string) {
  return `${PROFILE_ASSET_PROTOCOL}://${encodeURIComponent(profileId)}/${assetPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function parseProfileAssetUrl(
  value: string,
): ProfileAssetReference | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== `${PROFILE_ASSET_PROTOCOL}:`) {
    return null;
  }

  const profileId = decodeURIComponent(url.hostname);
  const assetPath = url.pathname
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent)
    .join("/");

  if (profileId === "" || assetPath === "") {
    return null;
  }

  return { profileId, assetPath };
}

export function formatProfileAssetPath(value: string) {
  const parsed = parseProfileAssetUrl(value);

  if (parsed === null) {
    return value;
  }

  return `profiles/${parsed.profileId}/${parsed.assetPath}`;
}
