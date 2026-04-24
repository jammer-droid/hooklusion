import { appendFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
  nativeImage,
  net,
  protocol,
  screen,
  Tray,
} from "electron";
import {
  type AnalyticsBehaviorKind,
  type AnalyticsProvider,
  type AnalyticsResolutionReason,
  classifyBehaviorEvent,
  createAnalyticsStore,
  defaultAnalyticsDatabasePath,
  readModelMetadata,
  readProjectRoot,
} from "../../../cli/src/analytics.js";
import {
  installClaudeHooks,
  uninstallClaudeHooks,
} from "../../../cli/src/claudeHooks.js";
import {
  installCodexHooks,
  uninstallCodexHooks,
} from "../../../cli/src/codexHooks.js";

import {
  type CharacterSnapshot,
  createCharacterStateMachine,
} from "../../../server/src/characterStateMachine.js";
import { normalizeEvent } from "../../../server/src/normalize.js";
import type { AnimationProfile } from "../shared/animationProfile.js";
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
  type CharacterDesktopSnapshot,
  type CharacterResizeCorner,
} from "../shared/characterDesktop.js";
import {
  PROFILE_ASSET_PROTOCOL,
  parseProfileAssetUrl,
} from "../shared/profileAssetUrl.js";
import {
  DEFAULT_APP_CONFIG_PATH,
  readAppConfig,
  resolveConfiguredDefaultProfileId,
  writeAppConfig,
} from "./appConfig.js";
import { resolveDefaultProfileDirectory } from "./appPaths.js";
import { createDefaultAnimationProfile } from "./defaultProfile.js";
import {
  buildCharacterWindowOptions,
  CHARACTER_WINDOW_ASPECT_RATIO,
  CHARACTER_WINDOW_MAX_SIZE,
  CHARACTER_WINDOW_MIN_SIZE,
  type CharacterWindowBounds,
  createPinnedSessionMenuItems,
  createSessionMenuItems,
  DEFAULT_TRAY_ICON_SIZE_PX,
  getTrayToggleLabel,
  resolveCharacterWindowBounds,
  resolveDesktopAssetIconPath,
  resolvePreloadPath,
  SETUP_HOOKS_MENU_LABEL,
} from "./desktopShell.js";
import {
  startEmbeddedEventServer,
  stopEmbeddedEventServer,
} from "./embeddedEventServer.js";
import { shouldOpenLaunchVisibilityFallback } from "./launchVisibilityFallback.js";
import {
  createLiveEventTailer,
  dispatchLoggedEventRecord,
  type LoggedEventRecord,
} from "./liveEventBridge.js";
import { routeLiveCharacterEvent } from "./liveSessionRouting.js";
import {
  createOfficeAssistantAnimationProfile,
  OFFICE_ASSISTANT_PROFILE_ID,
} from "./officeAssistantProfile.js";
import {
  createTypedPresentationScheduler,
  type PresentationPolicy,
} from "./presentationScheduler.js";
import {
  applyProfileSelection,
  broadcastResolvedProfileSafely,
  createProfileSelectionState,
  DEFAULT_PROFILE_ID,
} from "./profileApplication.js";
import { resolveProfileBroadcastSessionKeys } from "./profileBroadcastTargets.js";
import { createProfileRepository } from "./profileRepository.js";
import {
  resolveBundledAssetDirectoryForRuntime,
  resolveBundledAssetRoot,
  resolveProjectRoot,
} from "./projectRoot.js";
import { isProjectScopedEvent } from "./projectScope.js";
import { createSessionKey, type SessionKey } from "./sessionKey.js";
import { shouldBroadcastResolvedProfileForSessionChange } from "./sessionProfileTransition.js";
import { createSessionRegistry } from "./sessionRegistry.js";
import { shouldRefreshDisplayedSessionSelection } from "./sessionSelectionRefresh.js";
import { createSetupController } from "./setupController.js";
import { createSetupSmokeTestMonitor } from "./setupSmokeTest.js";

const DEFAULT_LOG_DIRECTORY = join(homedir(), ".hooklusion", "logs");
const RENDERER_DEBUG_LOG_FILE_NAME = "renderer-debug.jsonl";
const DEFAULT_SERVER_HOST = "127.0.0.1";
const DEFAULT_SERVER_PORT = 47321;
const DEFAULT_PROFILE_DIRECTORY = resolveDefaultProfileDirectory({
  cwd: process.cwd(),
  homeDir: homedir(),
  isPackaged: app.isPackaged,
});
const DEFAULT_PROJECT_ROOT = resolveProjectRoot(
  process.env.HOOKLUSION_PROJECT_ROOT ?? process.cwd(),
);
const DEFAULT_LIVE_BRIDGE_POLL_MS = 500;
const SESSION_SWEEP_INTERVAL_MS = 5_000;
const SESSION_DEAD_PID_GRACE_MS = 30 * 60_000;
const SAFE_PROFILE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const LAUNCH_VISIBILITY_FALLBACK_DELAY_MS = 1_500;
const GPCHAN_DEFAULT_PROFILE_SEED_DIRECTORY = app.isPackaged
  ? join(process.resourcesPath, "bundled-profiles", "gpchan-default")
  : join(
      DEFAULT_PROJECT_ROOT,
      "packages",
      "app",
      ".hooklusion",
      "profiles",
      "gpchan-default",
    );
const DESKTOP_ICON_PATH = resolveDesktopAssetIconPath(
  join(
    resolveProjectRoot(DEFAULT_PROJECT_ROOT),
    "packages",
    "app",
    "resources",
  ),
  {
    isPackaged: app.isPackaged,
  },
);

protocol.registerSchemesAsPrivileged([
  {
    scheme: PROFILE_ASSET_PROTOCOL,
    privileges: {
      bypassCSP: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
  },
]);

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let studioWindow: BrowserWindow | null = null;
let setupWindow: BrowserWindow | null = null;
let embeddedEventServer: Awaited<
  ReturnType<typeof startEmbeddedEventServer>
> | null = null;
let liveEventTailer: ReturnType<typeof createLiveEventTailer> | null = null;
let sessionSweepTimer: NodeJS.Timeout | null = null;
let defaultProfileBootstrapped = false;
let persistedPinnedSessionKey: SessionKey | null = null;
let persistedCharacterWindowBounds: CharacterWindowBounds | null = null;
const analyticsStore = createAnalyticsStore({
  databasePath: defaultAnalyticsDatabasePath(),
});
const latestAnalyticsBehaviorBySession = new Map<
  string,
  {
    classifiedEventId: number;
    behaviorKind: AnalyticsBehaviorKind;
    projectRoot: string | null;
    provider: AnalyticsProvider;
    sessionId: string;
    turnId: string | null;
    recordedAtMs: number;
  }
>();
const profileSelectionState = createProfileSelectionState(
  DEFAULT_PROFILE_ID,
  new Map<string, string>(),
);
const bundledProfileAssetRoots = new Map<string, string>([
  ["gpchan-default", join(GPCHAN_DEFAULT_PROFILE_SEED_DIRECTORY, "assets")],
  [
    OFFICE_ASSISTANT_PROFILE_ID,
    app.isPackaged
      ? join(process.resourcesPath, "bundled-assets")
      : resolveBundledAssetRoot(DEFAULT_PROJECT_ROOT, "office-assistant"),
  ],
]);
const profileRepository = createProfileRepository(DEFAULT_PROFILE_DIRECTORY, {
  bundledProfiles: [
    createDefaultAnimationProfile({
      seedProfilePath: join(
        GPCHAN_DEFAULT_PROFILE_SEED_DIRECTORY,
        "profile.json",
      ),
    }),
    createOfficeAssistantAnimationProfile(DEFAULT_PROJECT_ROOT),
  ],
  bundledAssetRoots: Object.fromEntries(bundledProfileAssetRoots),
});
const sessionRegistry = createSessionRegistry({
  projectRoots: [],
});
const setupController = createSetupController({
  configPath: DEFAULT_APP_CONFIG_PATH,
  homeDir: homedir(),
  installer: {
    installClaudeHooks,
    removeClaudeHooks: uninstallClaudeHooks,
    installCodexHooks,
    removeCodexHooks: uninstallCodexHooks,
  },
});
const setupSmokeTestMonitor = createSetupSmokeTestMonitor({
  isProjectEvent(event, projectRoot) {
    return isProjectScopedEvent(event, projectRoot);
  },
  onResult() {},
});
type LivePresentationState = CharacterDesktopSnapshot["state"];
let latestPresentationSnapshot: CharacterSnapshot | null = null;
const presentationScheduler =
  createTypedPresentationScheduler<LivePresentationState>({
    now: () => Date.now(),
    emit(state) {
      const sourceSnapshot =
        latestPresentationSnapshot ?? stateMachine.getSnapshot();
      recordPresentationAnalytics(sourceSnapshot, state);
      broadcastCharacterSnapshot({
        ...sourceSnapshot,
        state,
      });
    },
    resolveSessionProfile: resolveSelectedProfileId,
  });

function debugLogFromRenderer(message: string, payload?: unknown) {
  const record = {
    receivedAt: new Date().toISOString(),
    message,
    payload: payload ?? null,
  };

  console.log("[hooklusion/renderer-debug]", JSON.stringify(record));

  void appendFile(
    join(
      process.env.HOOKLUSION_LOG_DIR ?? DEFAULT_LOG_DIRECTORY,
      RENDERER_DEBUG_LOG_FILE_NAME,
    ),
    `${JSON.stringify(record)}\n`,
    "utf8",
  ).catch((error) => {
    console.warn("[hooklusion/app] failed to append renderer debug log", error);
  });
}

const stateMachine = createCharacterStateMachine({
  onTransition(snapshot) {
    stageCharacterSnapshot(snapshot);
  },
});

function createMainWindow() {
  const preloadPath = resolvePreloadPath(__dirname);
  const bounds = resolveCharacterWindowBounds(
    screen.getPrimaryDisplay().workArea,
    persistedCharacterWindowBounds,
  );
  const window = new BrowserWindow(
    buildCharacterWindowOptions(preloadPath, bounds),
  );

  window.setPosition(bounds.x, bounds.y);
  window.setAspectRatio(CHARACTER_WINDOW_ASPECT_RATIO);

  window.once("ready-to-show", () => {
    window.show();
  });

  window.webContents.on("did-finish-load", () => {
    window.webContents.send(
      CHARACTER_STATE_CHANNEL,
      toDesktopSnapshot(stateMachine.getSnapshot()),
    );
    broadcastResolvedProfileSafely(
      () =>
        broadcastResolvedProfile(
          stateMachine.getSnapshot().sessionId,
          window.webContents,
        ),
      (error) => {
        console.error(
          "[hooklusion/app] failed to broadcast initial profile",
          error,
        );
      },
    );
  });

  loadRendererEntry(window, "index.html");

  return window;
}

function createStudioWindow() {
  const preloadPath = resolvePreloadPath(__dirname);
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    frame: true,
    transparent: false,
    hasShadow: true,
    resizable: true,
    backgroundColor: "#f3f1eb",
    title: "Animation Studio",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => {
    app.focus({ steal: true });
    window.show();
    window.focus();
  });

  window.on("closed", () => {
    if (studioWindow === window) {
      studioWindow = null;
    }
  });

  loadRendererEntry(window, "studio.html");

  return window;
}

function createSetupWindow() {
  const preloadPath = resolvePreloadPath(__dirname);
  const window = new BrowserWindow({
    width: 1040,
    height: 760,
    show: false,
    frame: true,
    transparent: false,
    hasShadow: true,
    resizable: true,
    backgroundColor: "#f5f1e8",
    title: "Hooklusion Setup",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => {
    app.focus({ steal: true });
    window.show();
    window.focus();
  });

  window.on("closed", () => {
    if (setupWindow === window) {
      setupWindow = null;
    }
  });

  loadRendererEntry(window, "setup.html");

  return window;
}

app.whenReady().then(async () => {
  persistedPinnedSessionKey = await loadPersistedPinnedSessionKey();
  persistedCharacterWindowBounds = await loadPersistedCharacterWindowBounds();
  profileSelectionState.defaultProfileId =
    await loadPersistedDefaultProfileId();
  await syncManagedProjectRoots();
  if (persistedPinnedSessionKey !== null) {
    sessionRegistry.pinSession(persistedPinnedSessionKey);
  }
  analyticsStore.pruneExpiredRecords();
  registerProfileAssetProtocol();
  applyMacTrayOnlyBehavior();
  try {
    embeddedEventServer = await startEmbeddedEventServer({
      host: process.env.HOOKLUSION_HOST ?? DEFAULT_SERVER_HOST,
      port: Number(process.env.HOOKLUSION_PORT ?? DEFAULT_SERVER_PORT),
      logDirectory: process.env.HOOKLUSION_LOG_DIR ?? DEFAULT_LOG_DIRECTORY,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "EADDRINUSE"
    ) {
      console.warn(
        "[hooklusion/app] embedded event server port already in use; reusing existing listener",
      );
    } else {
      throw error;
    }
  }
  mainWindow = createMainWindow();
  tray = createTray(mainWindow);
  setTimeout(() => {
    if (
      mainWindow === null ||
      mainWindow.isDestroyed() ||
      !shouldOpenLaunchVisibilityFallback({
        isPackaged: app.isPackaged,
        platform: process.platform,
      })
    ) {
      return;
    }

    openSetupWindow();
  }, LAUNCH_VISIBILITY_FALLBACK_DELAY_MS);
  registerDesktopIpc();
  liveEventTailer = createLiveEventTailer({
    logFilePath: join(
      process.env.HOOKLUSION_LOG_DIR ?? DEFAULT_LOG_DIRECTORY,
      "events.jsonl",
    ),
    skipExistingRecords: true,
    pollIntervalMs: Number(
      process.env.HOOKLUSION_LIVE_BRIDGE_POLL_MS ?? DEFAULT_LIVE_BRIDGE_POLL_MS,
    ),
    onRecord(record) {
      recordAnalyticsHookEvent(record);
      let shouldRefreshTray = false;
      const didDispatch = dispatchLoggedEventRecord(record, (event) => {
        setupSmokeTestMonitor.observeEvent(event);
        const sessionKey = createSessionKey(event.provider, event.sessionId);
        restorePinnedSessionForIncomingEvent(sessionKey);
        routeLiveCharacterEvent(sessionRegistry, event, (displayEvent) => {
          stateMachine.dispatch(displayEvent);
        });
        if (isTrackedManagedSession(sessionKey)) {
          handleCompletionFeedback(event, record.receivedAt, sessionKey);
          shouldRefreshTray = true;
        }
      });

      if (didDispatch || shouldRefreshTray) {
        refreshTrayMenu();
      }
    },
  });
  liveEventTailer.start();
  sessionSweepTimer = setInterval(() => {
    pruneInactiveSessions();
  }, SESSION_SWEEP_INTERVAL_MS);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      if (tray !== null) {
        refreshTrayMenu();
      }
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  presentationScheduler.dispose();
  liveEventTailer?.stop();
  void stopEmbeddedEventServer(embeddedEventServer);
  embeddedEventServer = null;
  if (sessionSweepTimer !== null) {
    clearInterval(sessionSweepTimer);
    sessionSweepTimer = null;
  }
  stateMachine.dispose();
});

function registerDesktopIpc() {
  ipcMain.handle(CHARACTER_GET_STATE_CHANNEL, () => {
    return toDesktopSnapshot(stateMachine.getSnapshot());
  });

  ipcMain.handle(CHARACTER_PROFILE_LIST_CHANNEL, async () => {
    return profileRepository.listProfiles();
  });

  ipcMain.handle(CHARACTER_PROFILE_GET_DEFAULT_CHANNEL, async () => {
    return getDefaultProfileId();
  });

  ipcMain.handle(CHARACTER_PROFILE_SAVE_CHANNEL, async (_event, profile) => {
    await profileRepository.saveProfile(profile as AnimationProfile);
  });

  ipcMain.handle(
    CHARACTER_PROFILE_IMPORT_ASSET_CHANNEL,
    async (_event, profileId: string, sourcePath: string) => {
      return profileRepository.importProfileAsset(profileId, sourcePath);
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_SELECT_ASSETS_CHANNEL,
    async (event, options?: { multiple?: boolean }) => {
      const ownerWindow = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(ownerWindow ?? undefined, {
        properties: options?.multiple
          ? ["openFile", "multiSelections"]
          : ["openFile"],
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });

      return result.canceled ? [] : result.filePaths;
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_SELECT_SPRITE_SET_SOURCE_CHANNEL,
    async (event) => {
      const ownerWindow = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(ownerWindow ?? undefined, {
        properties: ["openDirectory"],
      });

      return result.canceled ? null : (result.filePaths[0] ?? null);
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_SELECT_PACKAGE_SOURCE_CHANNEL,
    async (event) => {
      const ownerWindow = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(ownerWindow ?? undefined, {
        properties: ["openFile", "openDirectory"],
        filters: [
          {
            name: "Profile packages",
            extensions: ["zip"],
          },
        ],
      });

      if (result.canceled) {
        return null;
      }

      const sourcePath = result.filePaths[0] ?? null;

      if (sourcePath === null) {
        return null;
      }

      return {
        sourcePath,
        sourceType: sourcePath.endsWith(".zip") ? "zip" : "directory",
      };
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_SELECT_EXPORT_PATH_CHANNEL,
    async (event, format: "directory" | "zip", profileName: string) => {
      const ownerWindow = BrowserWindow.fromWebContents(event.sender);

      if (format === "directory") {
        const result = await dialog.showOpenDialog(ownerWindow ?? undefined, {
          properties: ["openDirectory", "createDirectory"],
        });

        if (result.canceled) {
          return null;
        }

        const directory = result.filePaths[0] ?? null;
        return directory === null ? null : join(directory, profileName);
      }

      const result = await dialog.showSaveDialog(ownerWindow ?? undefined, {
        defaultPath: `${profileName}.zip`,
        filters: [
          {
            name: "Zip archive",
            extensions: ["zip"],
          },
        ],
      });

      return result.canceled ? null : (result.filePath ?? null);
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_APPLY_SPRITE_SET_CHANNEL,
    async (_event, request) => {
      const importedProfile = await profileRepository.applySpriteSetImport(
        request as Parameters<typeof profileRepository.applySpriteSetImport>[0],
      );

      if (profileSelectionState.defaultProfileId === importedProfile.id) {
        await applyProfileSelection(
          profileRepository,
          profileSelectionState,
          importedProfile.id,
          null,
          broadcastAppliedProfileSelection,
        );
      }

      return importedProfile;
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_IMPORT_PACKAGE_CHANNEL,
    async (_event, request) => {
      const importedProfile = await profileRepository.importProfilePackage(
        request as Parameters<typeof profileRepository.importProfilePackage>[0],
      );

      if (profileSelectionState.defaultProfileId === importedProfile.id) {
        await applyProfileSelection(
          profileRepository,
          profileSelectionState,
          importedProfile.id,
          null,
          broadcastAppliedProfileSelection,
        );
      }

      return importedProfile;
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_EXPORT_PACKAGE_CHANNEL,
    async (_event, request) => {
      return profileRepository.exportProfilePackage(
        request.profileId,
        request.destinationPath,
        request.format,
      );
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_DELETE_CHANNEL,
    async (_event, profileId: string) => {
      await profileRepository.deleteProfile(profileId);

      if (profileSelectionState.defaultProfileId === profileId) {
        const fallbackProfileId = await loadPersistedDefaultProfileId();
        await applyProfileSelection(
          profileRepository,
          profileSelectionState,
          fallbackProfileId,
          null,
          broadcastAppliedProfileSelection,
        );
      }
    },
  );

  ipcMain.handle(
    CHARACTER_PROFILE_APPLY_CHANNEL,
    async (_event, profileId: string, sessionKey?: string | null) => {
      const resolvedSessionKey =
        sessionKey === undefined
          ? (stateMachine.getSnapshot().sessionId ?? null)
          : sessionKey;

      await applyProfileSelection(
        profileRepository,
        profileSelectionState,
        profileId,
        resolvedSessionKey,
        broadcastAppliedProfileSelection,
      );

      if (resolvedSessionKey === null) {
        await persistDefaultProfileSelection(
          profileSelectionState.defaultProfileId,
        );
      }
    },
  );

  ipcMain.handle(CHARACTER_STUDIO_OPEN_CHANNEL, async () => {
    openAnimationStudio();
  });

  ipcMain.handle(CHARACTER_SETUP_LIST_PROJECTS_CHANNEL, async () => {
    return setupController.listManagedProjects();
  });

  ipcMain.handle(CHARACTER_SETUP_PICK_PROJECT_CHANNEL, async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(ownerWindow ?? undefined, {
      properties: ["openDirectory", "createDirectory"],
    });

    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  ipcMain.handle(
    CHARACTER_SETUP_ADD_PROJECT_CHANNEL,
    async (_event, projectRoot: string) => {
      const projects = await setupController.addManagedProject(projectRoot);
      await syncManagedProjectRoots(projects);
      return projects;
    },
  );

  ipcMain.handle(
    CHARACTER_SETUP_REMOVE_PROJECT_CHANNEL,
    async (_event, projectRoot: string) => {
      const projects = await setupController.removeManagedProject(projectRoot);
      await syncManagedProjectRoots(projects);
      return projects;
    },
  );

  ipcMain.handle(
    CHARACTER_SETUP_INSTALL_CLAUDE_CHANNEL,
    async (_event, projectRoot: string) => {
      const project = await setupController.installClaudeHooks(projectRoot);
      await syncManagedProjectRoots();
      return project;
    },
  );

  ipcMain.handle(
    CHARACTER_SETUP_REMOVE_CLAUDE_CHANNEL,
    async (_event, projectRoot: string) => {
      const project = await setupController.removeClaudeHooks(projectRoot);
      await syncManagedProjectRoots();
      return project;
    },
  );

  ipcMain.handle(
    CHARACTER_SETUP_INSTALL_CODEX_CHANNEL,
    async (_event, projectRoot: string) => {
      const project = await setupController.installCodexHooks(projectRoot);
      await syncManagedProjectRoots();
      return project;
    },
  );

  ipcMain.handle(
    CHARACTER_SETUP_REMOVE_CODEX_CHANNEL,
    async (_event, projectRoot: string) => {
      const project = await setupController.removeCodexHooks(projectRoot);
      await syncManagedProjectRoots();
      return project;
    },
  );

  ipcMain.handle(
    CHARACTER_SETUP_GET_MANUAL_PROMPT_CHANNEL,
    async (_event, projectRoot: string) => {
      return setupController.getSetupManualPrompt(projectRoot);
    },
  );

  ipcMain.handle(
    CHARACTER_SETUP_RUN_SMOKE_TEST_CHANNEL,
    async (_event, projectRoot: string) => {
      const result = await setupSmokeTestMonitor.start(projectRoot).completed;
      return setupController.recordSmokeTestResult(
        result.projectRoot,
        result.status,
        result.completedAt,
      );
    },
  );

  let dragOffset: { dx: number; dy: number } | null = null;

  ipcMain.on(CHARACTER_DRAG_START_CHANNEL, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (window === null) {
      return;
    }

    const [wx, wy] = window.getPosition();
    const cursor = screen.getCursorScreenPoint();
    dragOffset = { dx: wx - cursor.x, dy: wy - cursor.y };
  });

  ipcMain.on(CHARACTER_DRAG_MOVE_CHANNEL, (event) => {
    if (dragOffset === null) {
      return;
    }

    const window = BrowserWindow.fromWebContents(event.sender);

    if (window === null) {
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    window.setPosition(cursor.x + dragOffset.dx, cursor.y + dragOffset.dy);
  });

  ipcMain.on(CHARACTER_DRAG_END_CHANNEL, (event) => {
    dragOffset = null;

    const window = BrowserWindow.fromWebContents(event.sender);

    if (window !== null) {
      void persistCharacterWindowBounds(window);
    }
  });

  ipcMain.on(
    CHARACTER_DEBUG_LOG_CHANNEL,
    (_event, entry: { message?: unknown; payload?: unknown } | undefined) => {
      debugLogFromRenderer(
        typeof entry?.message === "string"
          ? entry.message
          : "unknown-renderer-debug",
        entry?.payload,
      );
    },
  );

  let resizeState: {
    corner: CharacterResizeCorner;
    anchorX: number;
    anchorY: number;
  } | null = null;

  ipcMain.on(
    CHARACTER_RESIZE_START_CHANNEL,
    (event, corner: CharacterResizeCorner) => {
      const window = BrowserWindow.fromWebContents(event.sender);

      if (window === null) {
        return;
      }

      const bounds = window.getBounds();
      const anchorX =
        corner === "nw" || corner === "sw" ? bounds.x + bounds.width : bounds.x;
      const anchorY =
        corner === "nw" || corner === "ne"
          ? bounds.y + bounds.height
          : bounds.y;

      resizeState = { corner, anchorX, anchorY };
    },
  );

  ipcMain.on(CHARACTER_RESIZE_MOVE_CHANNEL, (event) => {
    if (resizeState === null) {
      return;
    }

    const window = BrowserWindow.fromWebContents(event.sender);

    if (window === null) {
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    const rawWidth = Math.abs(cursor.x - resizeState.anchorX);
    const rawHeight = Math.abs(cursor.y - resizeState.anchorY);

    let width =
      rawWidth / rawHeight > CHARACTER_WINDOW_ASPECT_RATIO
        ? rawHeight * CHARACTER_WINDOW_ASPECT_RATIO
        : rawWidth;

    width = Math.max(
      CHARACTER_WINDOW_MIN_SIZE.width,
      Math.min(CHARACTER_WINDOW_MAX_SIZE.width, width),
    );
    const height = width / CHARACTER_WINDOW_ASPECT_RATIO;

    const { corner, anchorX, anchorY } = resizeState;
    const x = corner === "nw" || corner === "sw" ? anchorX - width : anchorX;
    const y = corner === "nw" || corner === "ne" ? anchorY - height : anchorY;

    window.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });
  });

  ipcMain.on(CHARACTER_RESIZE_END_CHANNEL, (event) => {
    resizeState = null;

    const window = BrowserWindow.fromWebContents(event.sender);

    if (window !== null) {
      void persistCharacterWindowBounds(window);
    }
  });
}

function openAnimationStudio() {
  if (studioWindow !== null && !studioWindow.isDestroyed()) {
    if (studioWindow.isMinimized()) {
      studioWindow.restore();
    }

    studioWindow.show();
    studioWindow.focus();
    return studioWindow;
  }

  studioWindow = createStudioWindow();
  return studioWindow;
}

function openSetupWindow() {
  if (setupWindow !== null && !setupWindow.isDestroyed()) {
    if (setupWindow.isMinimized()) {
      setupWindow.restore();
    }

    setupWindow.show();
    setupWindow.focus();
    return setupWindow;
  }

  setupWindow = createSetupWindow();
  return setupWindow;
}

function stageCharacterSnapshot(snapshot: CharacterSnapshot) {
  const previousSessionKey = latestPresentationSnapshot?.sessionId ?? null;
  latestPresentationSnapshot = { ...snapshot };

  if (
    shouldBroadcastResolvedProfileForSessionChange(
      previousSessionKey,
      snapshot.sessionId,
    )
  ) {
    broadcastResolvedProfileSafely(
      () => broadcastResolvedProfile(snapshot.sessionId),
      (error) => {
        console.error(
          "[hooklusion/app] failed to broadcast session profile",
          error,
        );
      },
    );
  }

  if (snapshot.sessionId !== null) {
    presentationScheduler.switchSession(snapshot.sessionId);
  }

  presentationScheduler.receive(snapshot.state);
}

function refreshDisplayedSessionSelection(
  previousSessionKey: SessionKey | null,
) {
  const nextSessionKey = sessionRegistry.getSelection().activeSessionKey;
  syncAnalyticsDisplayedSessionSelection(nextSessionKey);

  if (
    !shouldRefreshDisplayedSessionSelection(previousSessionKey, nextSessionKey)
  ) {
    return;
  }

  stageCharacterSnapshot(stateMachine.getSnapshot(nextSessionKey));
}

function syncAnalyticsDisplayedSessionSelection(
  sessionKey: SessionKey | null = sessionRegistry.getSelection()
    .activeSessionKey,
) {
  analyticsStore.setCurrentDisplayedSessionKey(sessionKey);
}

function broadcastCharacterSnapshot(snapshot: CharacterSnapshot) {
  const desktopSnapshot = toDesktopSnapshot(snapshot);
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(CHARACTER_STATE_CHANNEL, desktopSnapshot);
  }
}

function recordAnalyticsHookEvent(record: LoggedEventRecord) {
  const activeDisplayedSessionKey =
    sessionRegistry.getSelection().activeSessionKey;
  syncAnalyticsDisplayedSessionSelection(activeDisplayedSessionKey);
  const event = normalizeEvent({
    provider: record.provider,
    payload: record.payload,
  });

  if (event === null) {
    return;
  }

  const sessionKey = createSessionKey(event.provider, event.sessionId);
  const isDisplayedSession = activeDisplayedSessionKey === sessionKey;
  const rawEventId = analyticsStore.recordRawEvent({
    record,
    isDisplayedSession,
  });
  const classified = classifyBehaviorEvent(event);
  if (classified === null) {
    return;
  }

  const metadata = readModelMetadata(record.payload);
  const classifiedEventId = analyticsStore.recordClassifiedEvent({
    rawEventId,
    recordedAt: record.receivedAt,
    provider: record.provider,
    model: metadata.model,
    modelVersion: metadata.modelVersion,
    projectRoot: readProjectRoot(record.payload),
    sessionId: event.sessionId,
    turnId: event.turnId,
    isDisplayedSession,
    ...classified,
  });

  latestAnalyticsBehaviorBySession.set(sessionKey, {
    classifiedEventId,
    behaviorKind: classified.behaviorKind,
    projectRoot: readProjectRoot(record.payload),
    provider: event.provider,
    sessionId: event.sessionId,
    turnId: event.turnId,
    recordedAtMs: Date.parse(record.receivedAt),
  });
}

function recordPresentationAnalytics(
  snapshot: CharacterSnapshot,
  presentedState: LivePresentationState,
) {
  const recordedAt = new Date().toISOString();
  const sessionKey = snapshot.sessionId;
  const latestBehavior =
    sessionKey === null
      ? null
      : (latestAnalyticsBehaviorBySession.get(sessionKey) ?? null);
  const presentationEventId = analyticsStore.recordPresentationEvent({
    recordedAt,
    provider: snapshot.provider,
    projectRoot: latestBehavior?.projectRoot ?? null,
    sessionId: snapshot.sessionId,
    turnId: snapshot.turnId,
    presentedState,
    providerState: snapshot.providerState,
    isDisplayedSession: true,
  });

  const expectedBehavior = latestBehavior?.behaviorKind ?? null;
  const reason = resolveAnalyticsResolutionReason(
    expectedBehavior,
    presentedState,
  );
  analyticsStore.recordPresentationResolution({
    recordedAt,
    provider: snapshot.provider,
    projectRoot: latestBehavior?.projectRoot ?? null,
    sessionId: snapshot.sessionId,
    turnId: snapshot.turnId,
    classifiedEventId: latestBehavior?.classifiedEventId ?? null,
    presentationEventId,
    expectedBehavior,
    presentedState,
    behaviorToPresentationLatencyMs:
      latestBehavior === null ? null : Date.now() - latestBehavior.recordedAtMs,
    reason,
    fallbackState: reason === "fallback_state" ? presentedState : null,
    isDisplayedSession: true,
  });
}

function resolveAnalyticsResolutionReason(
  expectedBehavior: AnalyticsBehaviorKind | null,
  presentedState: LivePresentationState,
): AnalyticsResolutionReason {
  if (expectedBehavior === null) {
    return "no_expected_behavior";
  }

  if (expectedBehavior === presentedState) {
    return "matched_behavior";
  }

  if (presentedState === "idle") {
    return "unexpected_idle";
  }

  if (
    expectedBehavior.startsWith("tool_") &&
    presentedState === "tool_active"
  ) {
    return "fallback_state";
  }

  return "true_mismatch";
}

async function broadcastResolvedProfile(
  sessionKey: string | null,
  targetWebContents?: Electron.WebContents,
) {
  const profile = await resolveProfile(sessionKey);
  broadcastProfile(profile, sessionKey, targetWebContents);
}

function broadcastProfile(
  profile: AnimationProfile,
  sessionKey: string | null,
  targetWebContents?: Electron.WebContents,
) {
  updatePresentationProfile(profile, sessionKey);

  if (targetWebContents !== undefined) {
    targetWebContents.send(
      CHARACTER_PROFILE_APPLIED_CHANNEL,
      profile,
      sessionKey,
    );
    return;
  }

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(
      CHARACTER_PROFILE_APPLIED_CHANNEL,
      profile,
      sessionKey,
    );
  }
}

async function broadcastAppliedProfileSelection(
  profile: AnimationProfile,
  appliedSessionKey: string | null,
) {
  const activeSessionKey = stateMachine.getSnapshot().sessionId ?? null;
  const broadcastSessionKeys = resolveProfileBroadcastSessionKeys({
    appliedSessionKey,
    activeSessionKey,
    hasActiveSessionOverride:
      activeSessionKey !== null &&
      profileSelectionState.sessionProfileOverrides.has(activeSessionKey),
  });

  for (const targetSessionKey of broadcastSessionKeys) {
    if (targetSessionKey === appliedSessionKey) {
      broadcastProfile(profile, targetSessionKey);
      continue;
    }

    await broadcastResolvedProfile(targetSessionKey);
  }
}

async function resolveProfile(sessionKey: string | null) {
  const profileId =
    sessionKey !== null
      ? (profileSelectionState.sessionProfileOverrides.get(sessionKey) ??
        (await getDefaultProfileId()))
      : await getDefaultProfileId();

  return profileRepository.readProfile(profileId);
}

function resolveSelectedProfileId(sessionKey: string) {
  return (
    profileSelectionState.sessionProfileOverrides.get(sessionKey) ??
    profileSelectionState.defaultProfileId
  );
}

function updatePresentationProfile(
  profile: AnimationProfile,
  sessionKey: string | null,
) {
  if (!isPresentationProfileActive(sessionKey)) {
    return;
  }

  presentationScheduler.setPolicy(createPresentationPolicy(profile));
}

function isPresentationProfileActive(sessionKey: string | null) {
  const activeSessionKey = stateMachine.getSnapshot().sessionId;
  return activeSessionKey === sessionKey || activeSessionKey === null;
}

function createPresentationPolicy(
  profile: AnimationProfile,
): PresentationPolicy<LivePresentationState> {
  return Object.fromEntries(
    Object.entries(profile.states)
      .filter(
        (
          entry,
        ): entry is [
          LivePresentationState,
          NonNullable<(typeof profile.states)[LivePresentationState]>,
        ] => entry[0] !== "idle" && entry[1] !== undefined,
      )
      .map(([stateName, mapping]) => [
        stateName,
        {
          interruptible: mapping.interruptible,
          minCycles: mapping.minCycles,
          minDwellMs: mapping.minDwellMs,
        },
      ]),
  );
}

async function getDefaultProfileId() {
  if (!defaultProfileBootstrapped) {
    profileSelectionState.defaultProfileId =
      await loadPersistedDefaultProfileId();
    defaultProfileBootstrapped = true;
  }
  return profileSelectionState.defaultProfileId;
}

function toDesktopSnapshot(
  snapshot: CharacterSnapshot,
): CharacterDesktopSnapshot {
  return {
    provider: snapshot.provider,
    sessionId: snapshot.sessionId,
    turnId: snapshot.turnId,
    state: snapshot.state,
    providerState: snapshot.providerState,
  };
}

function createTray(window: BrowserWindow) {
  const nextTray = new Tray(createTrayIcon());
  nextTray.setToolTip("Hooklusion");
  nextTray.setContextMenu(buildTrayMenu(window));
  return nextTray;
}

function refreshTrayMenu() {
  if (mainWindow === null || tray === null) {
    return;
  }

  tray.setContextMenu(buildTrayMenu(mainWindow));
}

async function syncManagedProjectRoots(
  projects?: Awaited<ReturnType<typeof setupController.listManagedProjects>>,
) {
  const resolvedProjects =
    projects ?? (await setupController.listManagedProjects());
  const selection = sessionRegistry.setProjectRoots(
    resolvedProjects.map((project) => project.projectRoot),
  );
  const shouldPreservePersistedPin =
    selection.pinnedSessionKey === null &&
    persistedPinnedSessionKey !== null &&
    sessionRegistry.listSessions().length === 0;
  if (
    !shouldPreservePersistedPin &&
    selection.pinnedSessionKey !== persistedPinnedSessionKey
  ) {
    void persistPinnedSessionSelection(selection.pinnedSessionKey);
  }
  syncAnalyticsDisplayedSessionSelection(selection.activeSessionKey);
  refreshTrayMenu();
}

function buildTrayMenu(window: BrowserWindow) {
  return Menu.buildFromTemplate([
    {
      label: getTrayToggleLabel(window.isVisible()),
      click: () => {
        toggleWindow(window);
        tray?.setContextMenu(buildTrayMenu(window));
      },
    },
    {
      label: "Open Animation Studio",
      click: () => {
        openAnimationStudio();
      },
    },
    {
      label: SETUP_HOOKS_MENU_LABEL,
      click: () => {
        openSetupWindow();
      },
    },
    {
      label: "Sessions",
      submenu: createSessionMenuItems(
        sessionRegistry.listSessions(),
        sessionRegistry.getSelection(),
      ).map(createElectronSessionMenuItem),
    },
    {
      label: "Pinned Session",
      submenu: createPinnedSessionMenuItems(
        sessionRegistry.listSessions(),
        sessionRegistry.getSelection(),
      ).map(createElectronSessionMenuItem),
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);
}

function createElectronSessionMenuItem(
  item: ReturnType<typeof createSessionMenuItems>[number],
): MenuItemConstructorOptions {
  switch (item.kind) {
    case "display-session":
      return {
        label: item.label,
        type: "checkbox",
        checked: item.checked,
        click: () => {
          const selection = sessionRegistry.getSelection();
          const previousActiveSessionKey = selection.activeSessionKey;
          sessionRegistry.selectSession(item.sessionKey);
          refreshDisplayedSessionSelection(previousActiveSessionKey);
          refreshTrayMenu();
        },
      };
    case "pin-session":
      return {
        label: item.label,
        type: "checkbox",
        checked: item.checked,
        click: () => {
          const selection = sessionRegistry.getSelection();
          const previousActiveSessionKey = selection.activeSessionKey;

          if (item.sessionKey === null) {
            sessionRegistry.unpinSession();
          } else {
            sessionRegistry.pinSession(item.sessionKey);
          }

          void persistPinnedSessionSelection(
            sessionRegistry.getSelection().pinnedSessionKey,
          );
          refreshDisplayedSessionSelection(previousActiveSessionKey);
          refreshTrayMenu();
        },
      };
    case "empty":
      return {
        label: item.label,
        enabled: item.enabled,
      };
  }
}

function toggleWindow(window: BrowserWindow) {
  if (window.isVisible()) {
    window.hide();
    return;
  }

  window.show();
}

function createTrayIcon() {
  const icon = nativeImage.createFromPath(DESKTOP_ICON_PATH);
  if (icon.isEmpty()) {
    return icon;
  }

  const resizedIcon = icon.resize({
    width: DEFAULT_TRAY_ICON_SIZE_PX,
    height: DEFAULT_TRAY_ICON_SIZE_PX,
    quality: "best",
  });

  if (process.platform === "darwin") {
    resizedIcon.setTemplateImage(true);
  } else {
    resizedIcon.setTemplateImage(false);
  }
  return resizedIcon;
}

function applyMacTrayOnlyBehavior() {
  if (process.platform !== "darwin") {
    return;
  }

  app.setActivationPolicy("accessory");
  void app.dock?.hide();
}

function isTrackedManagedSession(sessionKey: SessionKey) {
  return sessionRegistry
    .listSessions()
    .some((session) => session.sessionKey === sessionKey);
}

function clearRemovedSessionState(sessionKey: SessionKey) {
  void sessionKey;
}

async function loadPersistedPinnedSessionKey() {
  const config = await readAppConfig(DEFAULT_APP_CONFIG_PATH);
  return config.sessionSelection.pinnedSessionKey as SessionKey | null;
}

async function loadPersistedCharacterWindowBounds() {
  const config = await readAppConfig(DEFAULT_APP_CONFIG_PATH);
  return config.characterWindow.bounds;
}

async function loadPersistedDefaultProfileId() {
  const config = await readAppConfig(DEFAULT_APP_CONFIG_PATH);
  const profiles = await profileRepository.listProfiles();
  const resolvedDefaultProfileId = resolveConfiguredDefaultProfileId(
    config,
    profiles.map((profile) => profile.id),
    DEFAULT_PROFILE_ID,
  );

  if (config.profiles.defaultProfileId !== resolvedDefaultProfileId) {
    config.profiles = {
      defaultProfileId: resolvedDefaultProfileId,
    };
    await writeAppConfig(DEFAULT_APP_CONFIG_PATH, config);
  }

  defaultProfileBootstrapped = true;
  return resolvedDefaultProfileId;
}

async function persistPinnedSessionSelection(
  pinnedSessionKey: SessionKey | null,
) {
  const config = await readAppConfig(DEFAULT_APP_CONFIG_PATH);
  config.sessionSelection = {
    pinnedSessionKey,
  };
  persistedPinnedSessionKey = pinnedSessionKey;
  await writeAppConfig(DEFAULT_APP_CONFIG_PATH, config);
}

async function persistDefaultProfileSelection(defaultProfileId: string | null) {
  const config = await readAppConfig(DEFAULT_APP_CONFIG_PATH);
  config.profiles = {
    defaultProfileId,
  };
  await writeAppConfig(DEFAULT_APP_CONFIG_PATH, config);
}

async function persistCharacterWindowBounds(window: BrowserWindow) {
  const [x, y] = window.getPosition();
  const [width, height] = window.getSize();
  const bounds = { x, y, width, height };
  const config = await readAppConfig(DEFAULT_APP_CONFIG_PATH);
  config.characterWindow = {
    bounds,
  };
  persistedCharacterWindowBounds = bounds;
  await writeAppConfig(DEFAULT_APP_CONFIG_PATH, config);
}

function restorePinnedSessionForIncomingEvent(sessionKey: SessionKey) {
  if (
    persistedPinnedSessionKey === null ||
    persistedPinnedSessionKey !== sessionKey
  ) {
    return;
  }

  if (sessionRegistry.getSelection().pinnedSessionKey === sessionKey) {
    return;
  }

  sessionRegistry.pinSession(sessionKey);
}

function pruneInactiveSessions() {
  const previousActiveSessionKey =
    sessionRegistry.getSelection().activeSessionKey;
  const previousPinnedSessionKey =
    sessionRegistry.getSelection().pinnedSessionKey;
  const result = sessionRegistry.pruneSessions({
    isProcessAlive,
    staleAfterDeadPidMs: SESSION_DEAD_PID_GRACE_MS,
    staleWithoutPidAfterMs: null,
  });

  if (result.removedSessionKeys.length === 0) {
    return;
  }

  for (const sessionKey of result.removedSessionKeys) {
    clearRemovedSessionState(sessionKey);
  }

  if (result.selection.pinnedSessionKey !== previousPinnedSessionKey) {
    void persistPinnedSessionSelection(result.selection.pinnedSessionKey);
  }

  refreshDisplayedSessionSelection(previousActiveSessionKey);
  refreshTrayMenu();
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return !(
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ESRCH"
    );
  }
}

function handleCompletionFeedback(
  event: Parameters<typeof routeLiveCharacterEvent>[1],
  receivedAt: string,
  sessionKey: SessionKey,
) {
  void event;
  void receivedAt;
  void sessionKey;
}

function registerProfileAssetProtocol() {
  protocol.handle(PROFILE_ASSET_PROTOCOL, (request) => {
    const parsed = parseProfileAssetUrl(request.url);

    if (
      parsed === null ||
      !SAFE_PROFILE_ID_PATTERN.test(parsed.profileId) ||
      !parsed.assetPath.startsWith("assets/")
    ) {
      return new Response("Profile asset not found", { status: 404 });
    }

    const profileDirectory = resolve(
      DEFAULT_PROFILE_DIRECTORY,
      parsed.profileId,
    );
    const assetPath = resolve(profileDirectory, parsed.assetPath);
    const relativeAssetPath = relative(profileDirectory, assetPath);

    if (
      relativeAssetPath.startsWith("..") ||
      isAbsolute(relativeAssetPath) ||
      !relativeAssetPath.startsWith(`assets${sep}`)
    ) {
      return new Response("Profile asset not found", { status: 404 });
    }

    const bundledAssetsRoot = bundledProfileAssetRoots.get(parsed.profileId);

    if (bundledAssetsRoot !== undefined) {
      const bundledAssetPath = resolve(
        bundledAssetsRoot,
        parsed.assetPath.slice("assets/".length),
      );
      const bundledRelativeAssetPath = relative(
        bundledAssetsRoot,
        bundledAssetPath,
      );

      if (
        bundledRelativeAssetPath.startsWith("..") ||
        isAbsolute(bundledRelativeAssetPath)
      ) {
        return new Response("Profile asset not found", { status: 404 });
      }

      return net
        .fetch(pathToFileURL(assetPath).href)
        .catch(() => net.fetch(pathToFileURL(bundledAssetPath).href))
        .catch(() => new Response("Profile asset not found", { status: 404 }));
    }

    return net.fetch(pathToFileURL(assetPath).href);
  });
}

function loadRendererEntry(window: BrowserWindow, entry: string) {
  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(
      new URL(entry, process.env.ELECTRON_RENDERER_URL).toString(),
    );
    return;
  }

  void window.loadFile(join(__dirname, "../renderer", entry));
}
