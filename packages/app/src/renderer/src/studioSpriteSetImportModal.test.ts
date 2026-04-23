import { describe, expect, it } from "vitest";

import {
  createStudioExportChoiceModalState,
  createStudioImportChoiceModalState,
  renderStudioTransferModal,
} from "./studioSpriteSetImportModal.js";

describe("studioSpriteSetImportModal", () => {
  it("renders sprite-set and profile choices in the import modal", () => {
    const html = renderStudioTransferModal(
      createStudioImportChoiceModalState(),
    );

    expect(html).toContain("Import");
    expect(html).toContain("Import Sprite-Set");
    expect(html).toContain("Import Profile");
    expect(html).toContain('data-action="confirm-import-sprite-set"');
    expect(html).toContain('data-action="confirm-import-profile"');
    expect(html).toContain('data-action="cancel-transfer-modal"');
  });

  it("renders folder and zip choices in the export modal", () => {
    const html = renderStudioTransferModal(
      createStudioExportChoiceModalState(),
    );

    expect(html).toContain("Export");
    expect(html).toContain("Export Folder");
    expect(html).toContain("Export Zip");
    expect(html).toContain('data-action="confirm-export-directory"');
    expect(html).toContain('data-action="confirm-export-zip"');
  });

  it("keeps modal actions thin and compact", () => {
    const html = renderStudioTransferModal(
      createStudioImportChoiceModalState(),
    );

    expect(html).toContain('data-tone="thin"');
    expect(
      html.indexOf("Import Sprite-Set") < html.indexOf("Import Profile"),
    ).toBeTruthy();
    expect(
      html.indexOf("Import Profile") < html.indexOf("Cancel"),
    ).toBeTruthy();
  });
});
