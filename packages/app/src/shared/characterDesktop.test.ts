import { describe, expect, it } from "vitest";

import {
  CHARACTER_PROFILE_APPLIED_CHANNEL,
  CHARACTER_PROFILE_APPLY_CHANNEL,
  CHARACTER_PROFILE_APPLY_SPRITE_SET_CHANNEL,
  CHARACTER_PROFILE_EXPORT_PACKAGE_CHANNEL,
  CHARACTER_PROFILE_IMPORT_PACKAGE_CHANNEL,
  CHARACTER_PROFILE_LIST_CHANNEL,
  CHARACTER_PROFILE_SAVE_CHANNEL,
  CHARACTER_PROFILE_SELECT_ASSETS_CHANNEL,
  CHARACTER_PROFILE_SELECT_EXPORT_PATH_CHANNEL,
  CHARACTER_PROFILE_SELECT_PACKAGE_SOURCE_CHANNEL,
  CHARACTER_PROFILE_SELECT_SPRITE_SET_SOURCE_CHANNEL,
  CHARACTER_STUDIO_OPEN_CHANNEL,
} from "./characterDesktop.js";

describe("desktop shared IPC contracts", () => {
  it("exposes animation studio profile channels", () => {
    expect(CHARACTER_STUDIO_OPEN_CHANNEL).toBe("character:studio-open");
    expect(CHARACTER_PROFILE_LIST_CHANNEL).toBe("character:profiles-list");
    expect(CHARACTER_PROFILE_SAVE_CHANNEL).toBe("character:profiles-save");
    expect(CHARACTER_PROFILE_APPLY_CHANNEL).toBe("character:profiles-apply");
    expect(CHARACTER_PROFILE_APPLIED_CHANNEL).toBe(
      "character:profiles-applied",
    );
    expect(CHARACTER_PROFILE_SELECT_ASSETS_CHANNEL).toBe(
      "character:profiles-select-assets",
    );
    expect(CHARACTER_PROFILE_SELECT_SPRITE_SET_SOURCE_CHANNEL).toBe(
      "character:profiles-select-sprite-set-source",
    );
    expect(CHARACTER_PROFILE_SELECT_PACKAGE_SOURCE_CHANNEL).toBe(
      "character:profiles-select-package-source",
    );
    expect(CHARACTER_PROFILE_SELECT_EXPORT_PATH_CHANNEL).toBe(
      "character:profiles-select-export-path",
    );
    expect(CHARACTER_PROFILE_APPLY_SPRITE_SET_CHANNEL).toBe(
      "character:profiles-apply-sprite-set",
    );
    expect(CHARACTER_PROFILE_IMPORT_PACKAGE_CHANNEL).toBe(
      "character:profiles-import-package",
    );
    expect(CHARACTER_PROFILE_EXPORT_PACKAGE_CHANNEL).toBe(
      "character:profiles-export-package",
    );
  });
});
