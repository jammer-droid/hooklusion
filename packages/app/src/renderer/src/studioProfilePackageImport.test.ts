import { describe, expect, it } from "vitest";

import { createDefaultAnimationProfile } from "../../main/defaultProfile.js";
import { createStudioProfilePackageImportRequest } from "./studioProfilePackageImport.js";

describe("studioProfilePackageImport", () => {
  it("replaces the currently selected profile when importing a profile package", () => {
    const selectedProfile = createDefaultAnimationProfile();

    expect(
      createStudioProfilePackageImportRequest({
        selectedProfile,
        sourcePath: "/tmp/gpchan-profile.zip",
        sourceType: "zip",
      }),
    ).toEqual({
      sourcePath: "/tmp/gpchan-profile.zip",
      sourceType: "zip",
      applyMode: "replace_profile",
      targetProfileId: "gpchan-default",
      targetProfileName: "GP Chan",
    });
  });
});
