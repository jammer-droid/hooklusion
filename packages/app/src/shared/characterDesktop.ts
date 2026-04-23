import type {
  AnimationProfile,
  ProfilePackageExportRequest,
  ProfilePackageImportRequest,
  ProfilePackageSourceType,
  SpriteSetImportRequest,
} from "./animationProfile.js";
import type { CanonicalPackStateName } from "./packState.js";

export type CharacterDesktopState = CanonicalPackStateName;

export type CharacterSetupSmokeTestStatus = "ok" | "failed";

export interface CharacterSetupProjectStatus {
  projectRoot: string;
  claudeInstalled: boolean;
  codexInstalled: boolean;
  lastSetupAt: string | null;
  lastSmokeTestAt: string | null;
  lastSmokeTestStatus: CharacterSetupSmokeTestStatus | null;
}

export interface CharacterDesktopSnapshot {
  provider: "claude" | "codex" | null;
  sessionId: string | null;
  turnId: string | null;
  state: CharacterDesktopState;
  providerState: string | null;
}

export interface CharacterDesktopApi {
  getCurrentCharacterState(): Promise<CharacterDesktopSnapshot>;
  listProfiles(): Promise<AnimationProfile[]>;
  getDefaultProfileId(): Promise<string | null>;
  saveProfile(profile: AnimationProfile): Promise<void>;
  importProfileAsset(profileId: string, sourcePath: string): Promise<string>;
  selectProfileAssetPaths(options?: { multiple?: boolean }): Promise<string[]>;
  selectSpriteSetSourcePath(): Promise<string | null>;
  selectProfilePackageSource(): Promise<{
    sourcePath: string;
    sourceType: ProfilePackageSourceType;
  } | null>;
  selectProfilePackageExportPath(
    format: "directory" | "zip",
    profileName: string,
  ): Promise<string | null>;
  applySpriteSetImport(
    request: SpriteSetImportRequest,
  ): Promise<AnimationProfile>;
  importProfilePackage(
    request: ProfilePackageImportRequest,
  ): Promise<AnimationProfile>;
  exportProfilePackage(request: ProfilePackageExportRequest): Promise<string>;
  deleteProfile(profileId: string): Promise<void>;
  applyProfile(profileId: string, sessionKey?: string | null): Promise<void>;
  openAnimationStudio(): Promise<void>;
  listManagedProjects(): Promise<CharacterSetupProjectStatus[]>;
  addManagedProject(
    projectRoot: string,
  ): Promise<CharacterSetupProjectStatus[]>;
  pickManagedProjectPath(): Promise<string | null>;
  removeManagedProject(
    projectRoot: string,
  ): Promise<CharacterSetupProjectStatus[]>;
  installClaudeHooks(
    projectRoot: string,
  ): Promise<CharacterSetupProjectStatus | null>;
  removeClaudeHooks(
    projectRoot: string,
  ): Promise<CharacterSetupProjectStatus | null>;
  installCodexHooks(
    projectRoot: string,
  ): Promise<CharacterSetupProjectStatus | null>;
  removeCodexHooks(
    projectRoot: string,
  ): Promise<CharacterSetupProjectStatus | null>;
  getSetupManualPrompt(projectRoot: string): Promise<string>;
  runSetupSmokeTest(
    projectRoot: string,
  ): Promise<CharacterSetupProjectStatus | null>;
  onCharacterState(
    listener: (snapshot: CharacterDesktopSnapshot) => void,
  ): () => void;
  onProfileApplied(
    listener: (profile: AnimationProfile, sessionKey: string | null) => void,
  ): () => void;
  beginCharacterDrag(): void;
  moveCharacterDrag(): void;
  endCharacterDrag(): void;
  beginCharacterResize(corner: CharacterResizeCorner): void;
  moveCharacterResize(): void;
  endCharacterResize(): void;
  debugLog(message: string, payload?: Record<string, unknown> | null): void;
}

export type CharacterResizeCorner = "nw" | "ne" | "sw" | "se";

export const CHARACTER_STATE_CHANNEL = "character:state";
export const CHARACTER_STUDIO_OPEN_CHANNEL = "character:studio-open";
export const CHARACTER_PROFILE_LIST_CHANNEL = "character:profiles-list";
export const CHARACTER_PROFILE_GET_DEFAULT_CHANNEL =
  "character:profiles-default";
export const CHARACTER_PROFILE_SAVE_CHANNEL = "character:profiles-save";
export const CHARACTER_PROFILE_IMPORT_ASSET_CHANNEL =
  "character:profiles-import-asset";
export const CHARACTER_PROFILE_SELECT_ASSETS_CHANNEL =
  "character:profiles-select-assets";
export const CHARACTER_PROFILE_SELECT_SPRITE_SET_SOURCE_CHANNEL =
  "character:profiles-select-sprite-set-source";
export const CHARACTER_PROFILE_SELECT_PACKAGE_SOURCE_CHANNEL =
  "character:profiles-select-package-source";
export const CHARACTER_PROFILE_SELECT_EXPORT_PATH_CHANNEL =
  "character:profiles-select-export-path";
export const CHARACTER_PROFILE_APPLY_SPRITE_SET_CHANNEL =
  "character:profiles-apply-sprite-set";
export const CHARACTER_PROFILE_IMPORT_PACKAGE_CHANNEL =
  "character:profiles-import-package";
export const CHARACTER_PROFILE_EXPORT_PACKAGE_CHANNEL =
  "character:profiles-export-package";
export const CHARACTER_PROFILE_DELETE_CHANNEL = "character:profiles-delete";
export const CHARACTER_PROFILE_APPLY_CHANNEL = "character:profiles-apply";
export const CHARACTER_PROFILE_APPLIED_CHANNEL = "character:profiles-applied";
export const CHARACTER_GET_STATE_CHANNEL = "character:get-current-state";
export const CHARACTER_DRAG_START_CHANNEL = "character:drag-start";
export const CHARACTER_DRAG_MOVE_CHANNEL = "character:drag-move";
export const CHARACTER_DRAG_END_CHANNEL = "character:drag-end";
export const CHARACTER_RESIZE_START_CHANNEL = "character:resize-start";
export const CHARACTER_RESIZE_MOVE_CHANNEL = "character:resize-move";
export const CHARACTER_RESIZE_END_CHANNEL = "character:resize-end";
export const CHARACTER_DEBUG_LOG_CHANNEL = "character:debug-log";
export const CHARACTER_SETUP_LIST_PROJECTS_CHANNEL = "character:setup:list";
export const CHARACTER_SETUP_ADD_PROJECT_CHANNEL = "character:setup:add";
export const CHARACTER_SETUP_PICK_PROJECT_CHANNEL = "character:setup:pick";
export const CHARACTER_SETUP_REMOVE_PROJECT_CHANNEL = "character:setup:remove";
export const CHARACTER_SETUP_INSTALL_CLAUDE_CHANNEL =
  "character:setup:install-claude";
export const CHARACTER_SETUP_REMOVE_CLAUDE_CHANNEL =
  "character:setup:remove-claude";
export const CHARACTER_SETUP_INSTALL_CODEX_CHANNEL =
  "character:setup:install-codex";
export const CHARACTER_SETUP_REMOVE_CODEX_CHANNEL =
  "character:setup:remove-codex";
export const CHARACTER_SETUP_GET_MANUAL_PROMPT_CHANNEL =
  "character:setup:manual-prompt";
export const CHARACTER_SETUP_RUN_SMOKE_TEST_CHANNEL =
  "character:setup:run-smoke-test";
