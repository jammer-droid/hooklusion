import { describe, expect, it } from "vitest";

import {
  buildCharacterWindowOptions,
  CHARACTER_WINDOW_ASPECT_RATIO,
  CHARACTER_WINDOW_MAX_SIZE,
  CHARACTER_WINDOW_MIN_SIZE,
  createPinnedSessionMenuItems,
  createSessionMenuItems,
  DEFAULT_CHARACTER_WINDOW_SIZE,
  DEFAULT_TRAY_ICON_SIZE_PX,
  getDefaultCharacterWindowPosition,
  getTrayToggleLabel,
  resolveCharacterWindowBounds,
  resolveDesktopAssetIconPath,
  resolvePreloadPath,
  SETUP_HOOKS_MENU_LABEL,
} from "./desktopShell.js";

describe("buildCharacterWindowOptions", () => {
  it("returns the expected character window flags and resize bounds", () => {
    expect(
      buildCharacterWindowOptions("/tmp/hooklusion-preload.js"),
    ).toMatchObject({
      width: DEFAULT_CHARACTER_WINDOW_SIZE.width,
      height: DEFAULT_CHARACTER_WINDOW_SIZE.height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      hasShadow: false,
      resizable: true,
      minWidth: CHARACTER_WINDOW_MIN_SIZE.width,
      minHeight: CHARACTER_WINDOW_MIN_SIZE.height,
      maxWidth: CHARACTER_WINDOW_MAX_SIZE.width,
      maxHeight: CHARACTER_WINDOW_MAX_SIZE.height,
      show: false,
      backgroundColor: "#00000000",
      webPreferences: {
        preload: "/tmp/hooklusion-preload.js",
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
  });

  it("accepts the first mouse event on an inactive character window so drag starts without a prior focus click", () => {
    expect(
      buildCharacterWindowOptions("/tmp/hooklusion-preload.js"),
    ).toMatchObject({
      acceptFirstMouse: true,
    });
  });

  it("keeps the character window resize ratio aligned with the default size", () => {
    expect(CHARACTER_WINDOW_ASPECT_RATIO).toBeCloseTo(
      DEFAULT_CHARACTER_WINDOW_SIZE.width /
        DEFAULT_CHARACTER_WINDOW_SIZE.height,
      4,
    );
  });
});

describe("getDefaultCharacterWindowPosition", () => {
  it("places the window at the bottom-right of the work area with margin", () => {
    expect(
      getDefaultCharacterWindowPosition({
        x: 100,
        y: 50,
        width: 1440,
        height: 900,
      }),
    ).toEqual({
      x: 100 + 1440 - DEFAULT_CHARACTER_WINDOW_SIZE.width - 24,
      y: 50 + 900 - DEFAULT_CHARACTER_WINDOW_SIZE.height - 24,
    });
  });
});

describe("resolveCharacterWindowBounds", () => {
  it("uses the default size and position when no persisted bounds exist", () => {
    expect(
      resolveCharacterWindowBounds(
        {
          x: 100,
          y: 50,
          width: 1440,
          height: 900,
        },
        null,
      ),
    ).toEqual({
      x: 100 + 1440 - DEFAULT_CHARACTER_WINDOW_SIZE.width - 24,
      y: 50 + 900 - DEFAULT_CHARACTER_WINDOW_SIZE.height - 24,
      width: DEFAULT_CHARACTER_WINDOW_SIZE.width,
      height: DEFAULT_CHARACTER_WINDOW_SIZE.height,
    });
  });

  it("restores persisted bounds when they fit inside the work area", () => {
    expect(
      resolveCharacterWindowBounds(
        {
          x: 0,
          y: 0,
          width: 1440,
          height: 900,
        },
        {
          x: 240,
          y: 180,
          width: 336,
          height: 432,
        },
      ),
    ).toEqual({
      x: 240,
      y: 180,
      width: 336,
      height: 432,
    });
  });

  it("clamps persisted bounds back into the visible work area", () => {
    expect(
      resolveCharacterWindowBounds(
        {
          x: 100,
          y: 50,
          width: 500,
          height: 400,
        },
        {
          x: 1000,
          y: -100,
          width: 999,
          height: 999,
        },
      ),
    ).toEqual({
      x: 100,
      y: 50,
      width: CHARACTER_WINDOW_MAX_SIZE.width,
      height: CHARACTER_WINDOW_MAX_SIZE.height,
    });
  });
});

describe("getTrayToggleLabel", () => {
  it("switches between show and hide labels", () => {
    expect(getTrayToggleLabel(true)).toBe("Character: Shown");
    expect(getTrayToggleLabel(false)).toBe("Character: Hidden");
  });
});

describe("setup tray affordance", () => {
  it("uses a stable tray label for the setup window", () => {
    expect(SETUP_HOOKS_MENU_LABEL).toBe("Setup Hooks...");
  });
});

describe("createSessionMenuItems", () => {
  it("shows an empty state when no project sessions are known", () => {
    expect(
      createSessionMenuItems([], {
        mode: "auto",
        activeSessionKey: null,
        pinnedSessionKey: null,
        shouldDisplayEvent: false,
      }),
    ).toEqual([
      {
        kind: "empty",
        label: "No project sessions",
        enabled: false,
      },
    ]);
  });

  it("marks the active session as checked in auto mode", () => {
    expect(
      createSessionMenuItems(
        [
          {
            sessionKey: "codex:session-1",
            provider: "codex",
            sessionId: "session-1",
            state: "thinking",
            providerState: null,
            turnId: "turn-1",
            cwd: "/project",
            lastEventAt: 100,
          },
        ],
        {
          mode: "auto",
          activeSessionKey: "codex:session-1",
          pinnedSessionKey: null,
          shouldDisplayEvent: true,
        },
      ),
    ).toEqual([
      {
        kind: "display-session",
        label: "project · Codex · session-1 · thinking",
        sessionKey: "codex:session-1",
        checked: true,
      },
    ]);
  });

  it("keeps background sessions unadorned in the menu", () => {
    expect(
      createSessionMenuItems(
        [
          {
            sessionKey: "codex:session-1",
            provider: "codex",
            sessionId: "session-1",
            state: "done",
            providerState: null,
            turnId: "turn-1",
            cwd: "/project",
            lastEventAt: 100,
          },
        ],
        {
          mode: "auto",
          activeSessionKey: "claude:session-2",
          pinnedSessionKey: null,
          shouldDisplayEvent: false,
        },
      ),
    ).toEqual([
      {
        kind: "display-session",
        label: "project · Codex · session-1 · done",
        sessionKey: "codex:session-1",
        checked: false,
      },
    ]);
  });

  it("marks the pinned session as checked", () => {
    expect(
      createSessionMenuItems(
        [
          {
            sessionKey: "claude:session-2",
            provider: "claude",
            sessionId: "session-2",
            state: "tool_active",
            providerState: "tool:read",
            turnId: "turn-2",
            cwd: "/project",
            lastEventAt: 200,
          },
        ],
        {
          mode: "pinned",
          activeSessionKey: "claude:session-2",
          pinnedSessionKey: "claude:session-2",
          shouldDisplayEvent: true,
        },
      ),
    ).toEqual([
      {
        kind: "display-session",
        label: "project · Claude · session-2 · tool_active",
        sessionKey: "claude:session-2",
        checked: true,
      },
    ]);
  });
});

describe("createPinnedSessionMenuItems", () => {
  it("includes a none option and marks it when no session is pinned", () => {
    expect(
      createPinnedSessionMenuItems(
        [
          {
            sessionKey: "codex:session-1",
            provider: "codex",
            sessionId: "session-1",
            state: "thinking",
            providerState: null,
            turnId: "turn-1",
            cwd: "/project",
            lastEventAt: 100,
          },
        ],
        {
          mode: "auto",
          activeSessionKey: "codex:session-1",
          pinnedSessionKey: null,
          shouldDisplayEvent: true,
        },
      ),
    ).toEqual([
      {
        kind: "pin-session",
        label: "None",
        sessionKey: null,
        checked: true,
      },
      {
        kind: "pin-session",
        label: "project · Codex · session-1 · thinking",
        sessionKey: "codex:session-1",
        checked: false,
      },
    ]);
  });
});

describe("resolvePreloadPath", () => {
  it("points the built main process at electron-vite's preload bundle", () => {
    expect(resolvePreloadPath("/tmp/hooklusion/out/main")).toBe(
      "/tmp/hooklusion/out/preload/index.js",
    );
  });
});

describe("resolveDesktopAssetIconPath", () => {
  it("points at the hooklusion asset inside the asset root", () => {
    expect(resolveDesktopAssetIconPath("/tmp/hooklusion/assets")).toBe(
      "/tmp/hooklusion/assets/hooklusion.png",
    );
  });

  it("points packaged builds at the bundled app icon inside Resources", () => {
    expect(
      resolveDesktopAssetIconPath("/tmp/hooklusion/assets", {
        isPackaged: true,
        resourcesPath: "/Applications/Hooklusion.app/Contents/Resources",
      }),
    ).toBe("/Applications/Hooklusion.app/Contents/Resources/hooklusion.png");
  });

  it("uses a compact tray icon size suitable for macOS status items", () => {
    expect(DEFAULT_TRAY_ICON_SIZE_PX).toBe(18);
  });
});
