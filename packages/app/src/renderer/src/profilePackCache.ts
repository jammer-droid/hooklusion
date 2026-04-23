import type { AnimationProfile } from "../../shared/animationProfile.js";
import {
  type CreateAnimationPackFromProfileOptions,
  createAnimationPackFromProfile,
} from "./profileAnimationPack.js";

export interface CachedPackEntry {
  signature: string;
  pack: ReturnType<typeof createAnimationPackFromProfile>;
}

export function getCachedBySession<T>(
  cache: Map<string | null, T>,
  sessionKey: string | null,
): T | undefined {
  if (sessionKey !== null && cache.has(sessionKey)) {
    return cache.get(sessionKey);
  }

  return cache.get(null);
}

export function getOrCreatePackForSession(
  sessionCache: Map<string | null, CachedPackEntry>,
  packCache: Map<string, ReturnType<typeof createAnimationPackFromProfile>>,
  profile: AnimationProfile,
  sessionKey: string | null,
  options: CreateAnimationPackFromProfileOptions = {},
) {
  const signature = createProfileSignature(profile);
  const existing = sessionCache.get(sessionKey);

  if (existing !== undefined && existing.signature === signature) {
    return existing.pack;
  }

  let pack = packCache.get(signature);

  if (pack === undefined) {
    pack = createAnimationPackFromProfile(profile, options);
    packCache.set(signature, pack);
  }

  sessionCache.set(sessionKey, { signature, pack });
  return pack;
}

function createProfileSignature(profile: AnimationProfile): string {
  return JSON.stringify(normalizeValue(profile));
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeValue((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}
