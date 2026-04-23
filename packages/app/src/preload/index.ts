import { contextBridge, ipcRenderer } from "electron";
import type {
  AnimationProfile,
  ProfilePackageExportRequest,
  ProfilePackageImportRequest,
  SpriteSetImportRequest,
} from "../shared/animationProfile.js";
import {
  CHARACTER_DEBUG_LOG_CHANNEL,
  CHARACTER_DRAG_END_CHANNEL,
  CHARACTER_DRAG_MOVE_CHANNEL,
  CHARACTER_DRAG_START_CHANNEL,
  CHARACTER_GET_STATE_CHANNEL,
  CHARACTER_PROFILE_APPLIED_CHANNEL,
  CHARACTER_PROFILE_APPLY_CHANNEL,
  CHARACTER_PROFILE_APPLY_SPRITE_SET_CHANNEL,
  CHARACTER_PROFILE_DELETE_CHANNEL,
  CHARACTER_PROFILE_EXPORT_PACKAGE_CHANNEL,
  CHARACTER_PROFILE_GET_DEFAULT_CHANNEL,
  CHARACTER_PROFILE_IMPORT_ASSET_CHANNEL,
  CHARACTER_PROFILE_IMPORT_PACKAGE_CHANNEL,
  CHARACTER_PROFILE_LIST_CHANNEL,
  CHARACTER_PROFILE_SAVE_CHANNEL,
  CHARACTER_PROFILE_SELECT_ASSETS_CHANNEL,
  CHARACTER_PROFILE_SELECT_EXPORT_PATH_CHANNEL,
  CHARACTER_PROFILE_SELECT_PACKAGE_SOURCE_CHANNEL,
  CHARACTER_PROFILE_SELECT_SPRITE_SET_SOURCE_CHANNEL,
  CHARACTER_RESIZE_END_CHANNEL,
  CHARACTER_RESIZE_MOVE_CHANNEL,
  CHARACTER_RESIZE_START_CHANNEL,
  CHARACTER_SETUP_ADD_PROJECT_CHANNEL,
  CHARACTER_SETUP_GET_MANUAL_PROMPT_CHANNEL,
  CHARACTER_SETUP_INSTALL_CLAUDE_CHANNEL,
  CHARACTER_SETUP_INSTALL_CODEX_CHANNEL,
  CHARACTER_SETUP_LIST_PROJECTS_CHANNEL,
  CHARACTER_SETUP_PICK_PROJECT_CHANNEL,
  CHARACTER_SETUP_REMOVE_CLAUDE_CHANNEL,
  CHARACTER_SETUP_REMOVE_CODEX_CHANNEL,
  CHARACTER_SETUP_REMOVE_PROJECT_CHANNEL,
  CHARACTER_SETUP_RUN_SMOKE_TEST_CHANNEL,
  CHARACTER_STATE_CHANNEL,
  CHARACTER_STUDIO_OPEN_CHANNEL,
  type CharacterDesktopApi,
  type CharacterDesktopSnapshot,
} from "../shared/characterDesktop.js";

const desktopApi: CharacterDesktopApi = {
  async getCurrentCharacterState() {
    return ipcRenderer.invoke(CHARACTER_GET_STATE_CHANNEL);
  },
  async listProfiles() {
    return ipcRenderer.invoke(CHARACTER_PROFILE_LIST_CHANNEL);
  },
  async getDefaultProfileId() {
    return ipcRenderer.invoke(CHARACTER_PROFILE_GET_DEFAULT_CHANNEL);
  },
  async saveProfile(profile) {
    await ipcRenderer.invoke(CHARACTER_PROFILE_SAVE_CHANNEL, profile);
  },
  async importProfileAsset(profileId, sourcePath) {
    return ipcRenderer.invoke(
      CHARACTER_PROFILE_IMPORT_ASSET_CHANNEL,
      profileId,
      sourcePath,
    );
  },
  async selectProfileAssetPaths(options) {
    return ipcRenderer.invoke(CHARACTER_PROFILE_SELECT_ASSETS_CHANNEL, options);
  },
  async selectSpriteSetSourcePath() {
    return ipcRenderer.invoke(
      CHARACTER_PROFILE_SELECT_SPRITE_SET_SOURCE_CHANNEL,
    );
  },
  async selectProfilePackageSource() {
    return ipcRenderer.invoke(CHARACTER_PROFILE_SELECT_PACKAGE_SOURCE_CHANNEL);
  },
  async selectProfilePackageExportPath(format, profileName) {
    return ipcRenderer.invoke(
      CHARACTER_PROFILE_SELECT_EXPORT_PATH_CHANNEL,
      format,
      profileName,
    );
  },
  async applySpriteSetImport(request: SpriteSetImportRequest) {
    return ipcRenderer.invoke(
      CHARACTER_PROFILE_APPLY_SPRITE_SET_CHANNEL,
      request,
    );
  },
  async importProfilePackage(request: ProfilePackageImportRequest) {
    return ipcRenderer.invoke(
      CHARACTER_PROFILE_IMPORT_PACKAGE_CHANNEL,
      request,
    );
  },
  async exportProfilePackage(request: ProfilePackageExportRequest) {
    return ipcRenderer.invoke(
      CHARACTER_PROFILE_EXPORT_PACKAGE_CHANNEL,
      request,
    );
  },
  async deleteProfile(profileId) {
    await ipcRenderer.invoke(CHARACTER_PROFILE_DELETE_CHANNEL, profileId);
  },
  async applyProfile(profileId, sessionKey) {
    await ipcRenderer.invoke(
      CHARACTER_PROFILE_APPLY_CHANNEL,
      profileId,
      sessionKey,
    );
  },
  async openAnimationStudio() {
    await ipcRenderer.invoke(CHARACTER_STUDIO_OPEN_CHANNEL);
  },
  async listManagedProjects() {
    return ipcRenderer.invoke(CHARACTER_SETUP_LIST_PROJECTS_CHANNEL);
  },
  async addManagedProject(projectRoot) {
    return ipcRenderer.invoke(CHARACTER_SETUP_ADD_PROJECT_CHANNEL, projectRoot);
  },
  async pickManagedProjectPath() {
    return ipcRenderer.invoke(CHARACTER_SETUP_PICK_PROJECT_CHANNEL);
  },
  async removeManagedProject(projectRoot) {
    return ipcRenderer.invoke(
      CHARACTER_SETUP_REMOVE_PROJECT_CHANNEL,
      projectRoot,
    );
  },
  async installClaudeHooks(projectRoot) {
    return ipcRenderer.invoke(
      CHARACTER_SETUP_INSTALL_CLAUDE_CHANNEL,
      projectRoot,
    );
  },
  async removeClaudeHooks(projectRoot) {
    return ipcRenderer.invoke(
      CHARACTER_SETUP_REMOVE_CLAUDE_CHANNEL,
      projectRoot,
    );
  },
  async installCodexHooks(projectRoot) {
    return ipcRenderer.invoke(
      CHARACTER_SETUP_INSTALL_CODEX_CHANNEL,
      projectRoot,
    );
  },
  async removeCodexHooks(projectRoot) {
    return ipcRenderer.invoke(
      CHARACTER_SETUP_REMOVE_CODEX_CHANNEL,
      projectRoot,
    );
  },
  async getSetupManualPrompt(projectRoot) {
    return ipcRenderer.invoke(
      CHARACTER_SETUP_GET_MANUAL_PROMPT_CHANNEL,
      projectRoot,
    );
  },
  async runSetupSmokeTest(projectRoot) {
    return ipcRenderer.invoke(
      CHARACTER_SETUP_RUN_SMOKE_TEST_CHANNEL,
      projectRoot,
    );
  },
  onCharacterState(listener) {
    const handleState = (
      _event: Electron.IpcRendererEvent,
      snapshot: CharacterDesktopSnapshot,
    ) => {
      listener(snapshot);
    };

    ipcRenderer.on(CHARACTER_STATE_CHANNEL, handleState);

    return () => {
      ipcRenderer.off(CHARACTER_STATE_CHANNEL, handleState);
    };
  },
  onProfileApplied(listener) {
    const handleProfileApplied = (
      _event: Electron.IpcRendererEvent,
      profile: AnimationProfile,
      sessionKey: string | null,
    ) => {
      listener(profile, sessionKey);
    };

    ipcRenderer.on(CHARACTER_PROFILE_APPLIED_CHANNEL, handleProfileApplied);

    return () => {
      ipcRenderer.off(CHARACTER_PROFILE_APPLIED_CHANNEL, handleProfileApplied);
    };
  },
  beginCharacterDrag() {
    ipcRenderer.send(CHARACTER_DRAG_START_CHANNEL);
  },
  moveCharacterDrag() {
    ipcRenderer.send(CHARACTER_DRAG_MOVE_CHANNEL);
  },
  endCharacterDrag() {
    ipcRenderer.send(CHARACTER_DRAG_END_CHANNEL);
  },
  beginCharacterResize(corner) {
    ipcRenderer.send(CHARACTER_RESIZE_START_CHANNEL, corner);
  },
  moveCharacterResize() {
    ipcRenderer.send(CHARACTER_RESIZE_MOVE_CHANNEL);
  },
  endCharacterResize() {
    ipcRenderer.send(CHARACTER_RESIZE_END_CHANNEL);
  },
  debugLog(message, payload) {
    ipcRenderer.send(CHARACTER_DEBUG_LOG_CHANNEL, { message, payload });
  },
};

contextBridge.exposeInMainWorld("projectCDesktop", desktopApi);
