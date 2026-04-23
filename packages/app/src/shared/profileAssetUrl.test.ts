import { describe, expect, it } from "vitest";

import {
  createProfileAssetUrl,
  formatProfileAssetPath,
  PROFILE_ASSET_PROTOCOL,
  parseProfileAssetUrl,
} from "./profileAssetUrl.js";

describe("profile asset URLs", () => {
  it("creates and parses app profile asset URLs", () => {
    const url = createProfileAssetUrl(
      "gpchan-default",
      "assets/imported frame.png",
    );

    expect(url).toBe(
      `${PROFILE_ASSET_PROTOCOL}://gpchan-default/assets/imported%20frame.png`,
    );
    expect(parseProfileAssetUrl(url)).toEqual({
      profileId: "gpchan-default",
      assetPath: "assets/imported frame.png",
    });
  });

  it("formats app profile asset URLs as short project paths", () => {
    expect(
      formatProfileAssetPath(
        "hooklusion-profile://gpchan-default/assets/frame_000.png",
      ),
    ).toBe("profiles/gpchan-default/assets/frame_000.png");
  });

  it("leaves normal bundled paths unchanged", () => {
    expect(formatProfileAssetPath("sprites/gpchan/done_a.png")).toBe(
      "sprites/gpchan/done_a.png",
    );
  });
});
