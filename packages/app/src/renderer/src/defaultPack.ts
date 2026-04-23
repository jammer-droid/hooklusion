import { type AnimationPack, validateAnimationPack } from "./animationPack.js";
import packJson from "./packs/default/pack.json";

const defaultPackAssetUrls = import.meta.glob(
  "./packs/default/sprites/**/*.svg",
  {
    eager: true,
    import: "default",
  },
);

export const defaultPackSourceDirectoryUrl = new URL(
  /* @vite-ignore */
  "./packs/default/",
  import.meta.url,
);

export const defaultAnimationPackSource = validateAnimationPack(
  packJson as AnimationPack,
);

export const defaultAnimationPack = validateAnimationPack(
  materializeAnimationPack(defaultAnimationPackSource, defaultPackAssetUrls),
);

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
  const assetUrl = assetUrls[`./packs/default/${framePath}`];

  if (assetUrl === undefined) {
    throw new Error(`Default animation asset is missing for ${framePath}.`);
  }

  return assetUrl;
}
