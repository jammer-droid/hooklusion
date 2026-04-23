import { join } from "node:path";
import { formatSessionLabel, type SessionKey } from "./sessionKey.js";
import type { SessionSelection, SessionSummary } from "./sessionRegistry.js";

export const DEFAULT_CHARACTER_WINDOW_SIZE = {
  width: 280,
  height: 360,
};
export const CHARACTER_WINDOW_ASPECT_RATIO =
  DEFAULT_CHARACTER_WINDOW_SIZE.width / DEFAULT_CHARACTER_WINDOW_SIZE.height;
export const CHARACTER_WINDOW_MIN_SIZE = {
  width: 196,
  height: 252,
};
export const CHARACTER_WINDOW_MAX_SIZE = {
  width: 560,
  height: 720,
};

const DEFAULT_WINDOW_MARGIN = 24;
export const SETUP_HOOKS_MENU_LABEL = "Setup Hooks...";
export const DEFAULT_TRAY_ICON_SIZE_PX = 18;
const DESKTOP_ICON_FILENAME = "hooklusion.png";

export interface DesktopWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TraySessionMenuItem =
  | {
      kind: "display-session";
      label: string;
      sessionKey: SessionKey;
      checked: boolean;
    }
  | {
      kind: "pin-session";
      label: string;
      sessionKey: SessionKey | null;
      checked: boolean;
    }
  | {
      kind: "empty";
      label: string;
      enabled: false;
    };

export function buildCharacterWindowOptions(
  preload: string,
  bounds = DEFAULT_CHARACTER_WINDOW_SIZE,
) {
  return {
    width: bounds.width,
    height: bounds.height,
    show: false,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    minWidth: CHARACTER_WINDOW_MIN_SIZE.width,
    minHeight: CHARACTER_WINDOW_MIN_SIZE.height,
    maxWidth: CHARACTER_WINDOW_MAX_SIZE.width,
    maxHeight: CHARACTER_WINDOW_MAX_SIZE.height,
    backgroundColor: "#00000000",
    acceptFirstMouse: true,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
}

export function getDefaultCharacterWindowPosition(workArea: DesktopWorkArea) {
  return {
    x:
      workArea.x +
      workArea.width -
      DEFAULT_CHARACTER_WINDOW_SIZE.width -
      DEFAULT_WINDOW_MARGIN,
    y:
      workArea.y +
      workArea.height -
      DEFAULT_CHARACTER_WINDOW_SIZE.height -
      DEFAULT_WINDOW_MARGIN,
  };
}

export function resolveCharacterWindowBounds(
  workArea: DesktopWorkArea,
  persistedBounds: CharacterWindowBounds | null,
): CharacterWindowBounds {
  const defaultPosition = getDefaultCharacterWindowPosition(workArea);

  if (persistedBounds === null) {
    return {
      ...defaultPosition,
      ...DEFAULT_CHARACTER_WINDOW_SIZE,
    };
  }

  const width = Math.max(
    CHARACTER_WINDOW_MIN_SIZE.width,
    Math.min(
      CHARACTER_WINDOW_MAX_SIZE.width,
      Math.round(persistedBounds.width),
    ),
  );
  const height = Math.round(width / CHARACTER_WINDOW_ASPECT_RATIO);
  const maxX = Math.max(workArea.x, workArea.x + workArea.width - width);
  const maxY = Math.max(workArea.y, workArea.y + workArea.height - height);

  return {
    x: Math.max(workArea.x, Math.min(maxX, Math.round(persistedBounds.x))),
    y: Math.max(workArea.y, Math.min(maxY, Math.round(persistedBounds.y))),
    width,
    height,
  };
}

export function getTrayToggleLabel(isVisible: boolean) {
  return isVisible ? "Character: Shown" : "Character: Hidden";
}

export function createSessionMenuItems(
  sessions: SessionSummary[],
  selection: SessionSelection,
): TraySessionMenuItem[] {
  if (sessions.length === 0) {
    return [
      {
        kind: "empty",
        label: "No project sessions",
        enabled: false,
      },
    ];
  }

  return sessions.map((session) => ({
    kind: "display-session",
    label: formatSessionLabel(session),
    sessionKey: session.sessionKey,
    checked: selection.activeSessionKey === session.sessionKey,
  }));
}

export function createPinnedSessionMenuItems(
  sessions: SessionSummary[],
  selection: SessionSelection,
): TraySessionMenuItem[] {
  const items: TraySessionMenuItem[] = [
    {
      kind: "pin-session",
      label: "None",
      sessionKey: null,
      checked: selection.pinnedSessionKey === null,
    },
  ];

  if (sessions.length === 0) {
    return items;
  }

  return items.concat(
    sessions.map((session) => ({
      kind: "pin-session" as const,
      label: formatSessionLabel(session),
      sessionKey: session.sessionKey,
      checked: selection.pinnedSessionKey === session.sessionKey,
    })),
  );
}

export function resolvePreloadPath(mainBundleDirectory: string) {
  return join(mainBundleDirectory, "../preload/index.js");
}

export function resolveDesktopAssetIconPath(
  assetRoot: string,
  options?: {
    isPackaged?: boolean;
    resourcesPath?: string;
  },
) {
  if (options?.isPackaged) {
    return join(
      options.resourcesPath ?? process.resourcesPath,
      DESKTOP_ICON_FILENAME,
    );
  }

  return join(assetRoot, DESKTOP_ICON_FILENAME);
}
