export type StudioTransferModalState =
  | { kind: "import" }
  | { kind: "export"; profileName: string };

export function createStudioImportChoiceModalState(): StudioTransferModalState {
  return { kind: "import" };
}

export function createStudioExportChoiceModalState(
  profileName = "Current Profile",
): StudioTransferModalState {
  return { kind: "export", profileName };
}

export function renderStudioTransferModal(state: StudioTransferModalState) {
  if (state.kind === "import") {
    return `
      <div class="studio-modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-import-title">
        <h3 id="profile-import-title">Import</h3>
        <p class="studio-modal-copy">Choose whether to import a sprite-set or a full profile package.</p>
        <div class="studio-modal-form">
          <div class="studio-modal-actions">
            <button class="studio-button" data-action="confirm-import-sprite-set" data-tone="thin" type="button">Import Sprite-Set</button>
            <button class="studio-button" data-action="confirm-import-profile" data-tone="thin" type="button">Import Profile</button>
            <button class="studio-button" data-action="cancel-transfer-modal" data-tone="thin" type="button">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="studio-modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-export-title">
      <h3 id="profile-export-title">Export</h3>
      <p class="studio-modal-copy">Choose whether to export ${state.profileName} as a folder or zip package.</p>
      <div class="studio-modal-form">
        <div class="studio-modal-actions">
          <button class="studio-button" data-action="confirm-export-directory" data-tone="thin" type="button">Export Folder</button>
          <button class="studio-button" data-action="confirm-export-zip" data-tone="thin" type="button">Export Zip</button>
          <button class="studio-button" data-action="cancel-transfer-modal" data-tone="thin" type="button">Cancel</button>
        </div>
      </div>
    </div>
  `;
}
