import { type AnimationPack, validateAnimationPack } from "./animationPack.js";
import packJson from "./packs/gpchan/pack.json";

const gpchanPackAssetUrls = import.meta.glob(
  "./packs/gpchan/sprites/**/*.png",
  {
    eager: true,
    import: "default",
  },
);

export const gpchanPackSourceDirectoryUrl = new URL(
  /* @vite-ignore */
  "./packs/gpchan/",
  import.meta.url,
);

export const gpchanAnimationPackSource = validateAnimationPack(
  packJson as AnimationPack,
);

export const gpchanAnimationPack = validateAnimationPack(
  materializeAnimationPack(gpchanAnimationPackSource, gpchanPackAssetUrls),
);

export function resolveGpchanBundledFrameUrl(
  framePath: string,
): string | undefined {
  return (
    readOptionalAssetUrl(gpchanPackAssetUrls, framePath) ??
    readOptionalAssetUrl(gpchanPackAssetUrls, stripPrefix(framePath, "assets/"))
  );
}

function materializeAnimationPack(
  pack: AnimationPack,
  assetUrls: Record<string, string>,
): AnimationPack {
  return {
    ...pack,
    states: Object.fromEntries(
      Object.entries(pack.states).map(([stateName, animation]) => {
        if (animation === undefined) {
          return [stateName, animation];
        }

        return [
          stateName,
          {
            ...animation,
            frames: animation.frames.map((framePath) =>
              readAssetUrl(assetUrls, framePath),
            ),
          },
        ];
      }),
    ),
  };
}

function readAssetUrl(
  assetUrls: Record<string, string>,
  framePath: string,
): string {
  const assetUrl = readOptionalAssetUrl(assetUrls, framePath);

  if (assetUrl === undefined) {
    throw new Error(`gpchan animation asset is missing for ${framePath}.`);
  }

  return assetUrl;
}

function readOptionalAssetUrl(
  assetUrls: Record<string, string>,
  framePath: string,
): string | undefined {
  return assetUrls[`./packs/gpchan/${framePath}`];
}

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
