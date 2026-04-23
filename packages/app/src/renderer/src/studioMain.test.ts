import { describe, expect, it, vi } from "vitest";

import { createDefaultAnimationProfile } from "../../main/defaultProfile.js";
import { requestStudioSpriteSetImport } from "./studioSpriteSetImport.js";

describe("studioMain sprite-set import", () => {
  it("always creates a new profile from the selected folder name", async () => {
    const importedProfile = {
      ...createDefaultAnimationProfile(),
      id: "cozy-sprite-set",
      name: "Imported GP Chan",
    };
    const applyImport = vi.fn().mockResolvedValue(importedProfile);

    const result = await requestStudioSpriteSetImport({
      existingProfileIds: ["gpchan-default", "office-assistant-default"],
      confirmImport: vi.fn().mockResolvedValue(true),
      selectSourcePath: vi.fn().mockResolvedValue("/tmp/Cozy Sprite Set"),
      applyImport,
    });

    expect(applyImport).toHaveBeenCalledWith({
      sourcePath: "/tmp/Cozy Sprite Set",
      sourceType: "directory",
      applyMode: "create_profile",
      targetProfileId: "cozy-sprite-set",
      targetProfileName: "Cozy Sprite Set",
    });
    expect(result?.name).toBe("Imported GP Chan");
  });

  it("adds a numeric suffix when the imported folder id already exists", async () => {
    const applyImport = vi.fn().mockResolvedValue({
      ...createDefaultAnimationProfile(),
      id: "cozy-sprite-set-2",
      name: "Cozy Sprite Set",
    });

    await requestStudioSpriteSetImport({
      existingProfileIds: ["cozy-sprite-set", "gpchan-default"],
      confirmImport: vi.fn().mockResolvedValue(true),
      selectSourcePath: vi.fn().mockResolvedValue("/tmp/cozy-sprite-set"),
      applyImport,
    });

    expect(applyImport).toHaveBeenCalledWith({
      sourcePath: "/tmp/cozy-sprite-set",
      sourceType: "directory",
      applyMode: "create_profile",
      targetProfileId: "cozy-sprite-set-2",
      targetProfileName: "Cozy Sprite Set",
    });
  });
});
