import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import type { CharacterWindowBounds } from "./desktopShell.js";

export const DEFAULT_APP_CONFIG_PATH = join(
  homedir(),
  ".hooklusion",
  "config.json",
);

export type SmokeTestStatus = "ok" | "failed";

export interface ManagedProjectConfig {
  projectRoot: string;
  claudeInstalled: boolean;
  codexInstalled: boolean;
  lastSetupAt: string | null;
  lastSmokeTestAt: string | null;
  lastSmokeTestStatus: SmokeTestStatus | null;
}

export interface SessionSelectionConfig {
  pinnedSessionKey: string | null;
}

export interface ProfilePreferencesConfig {
  defaultProfileId: string | null;
}

export interface CharacterWindowConfig {
  bounds: CharacterWindowBounds | null;
}

export interface ProjectCAppConfig {
  managedProjects: ManagedProjectConfig[];
  profiles: ProfilePreferencesConfig;
  sessionSelection: SessionSelectionConfig;
  characterWindow: CharacterWindowConfig;
}

type ManagedProjectUpdate = Partial<Omit<ManagedProjectConfig, "projectRoot">>;

export async function readAppConfig(
  configPath = DEFAULT_APP_CONFIG_PATH,
): Promise<ProjectCAppConfig> {
  try {
    const parsed = JSON.parse(
      await readFile(configPath, "utf8"),
    ) as Partial<ProjectCAppConfig>;

    return {
      managedProjects: Array.isArray(parsed.managedProjects)
        ? parsed.managedProjects.map(normalizeManagedProject)
        : [],
      profiles: normalizeProfilePreferences(parsed.profiles),
      sessionSelection: normalizeSessionSelection(parsed.sessionSelection),
      characterWindow: normalizeCharacterWindow(parsed.characterWindow),
    };
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return createEmptyAppConfig();
    }

    throw error;
  }
}

export async function writeAppConfig(
  configPath: string,
  config: ProjectCAppConfig,
) {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(
    configPath,
    `${JSON.stringify(
      {
        managedProjects: config.managedProjects.map(normalizeManagedProject),
        profiles: normalizeProfilePreferences(config.profiles),
        sessionSelection: normalizeSessionSelection(config.sessionSelection),
        characterWindow: normalizeCharacterWindow(config.characterWindow),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export function upsertManagedProject(
  config: ProjectCAppConfig,
  projectRoot: string,
  updates: ManagedProjectUpdate = {},
): ProjectCAppConfig {
  const normalizedProjectRoot = resolve(projectRoot);
  const existing = config.managedProjects.find(
    (project) => project.projectRoot === normalizedProjectRoot,
  );
  const managedProject = normalizeManagedProject({
    ...existing,
    ...updates,
    projectRoot: normalizedProjectRoot,
  });
  const managedProjects = config.managedProjects
    .filter((project) => project.projectRoot !== normalizedProjectRoot)
    .concat(managedProject);

  return {
    managedProjects,
    profiles: normalizeProfilePreferences(config.profiles),
    sessionSelection: normalizeSessionSelection(config.sessionSelection),
    characterWindow: normalizeCharacterWindow(config.characterWindow),
  };
}

export function removeManagedProject(
  config: ProjectCAppConfig,
  projectRoot: string,
): ProjectCAppConfig {
  const normalizedProjectRoot = resolve(projectRoot);

  return {
    managedProjects: config.managedProjects.filter(
      (project) => project.projectRoot !== normalizedProjectRoot,
    ),
    profiles: normalizeProfilePreferences(config.profiles),
    sessionSelection: normalizeSessionSelection(config.sessionSelection),
    characterWindow: normalizeCharacterWindow(config.characterWindow),
  };
}

export function resolveConfiguredDefaultProfileId(
  config: ProjectCAppConfig,
  availableProfileIds: string[],
  fallbackProfileId: string,
) {
  if (availableProfileIds.includes(config.profiles.defaultProfileId ?? "")) {
    return config.profiles.defaultProfileId;
  }

  if (availableProfileIds.includes(fallbackProfileId)) {
    return fallbackProfileId;
  }

  return availableProfileIds[0] ?? fallbackProfileId;
}

function createEmptyAppConfig(): ProjectCAppConfig {
  return {
    managedProjects: [],
    profiles: {
      defaultProfileId: null,
    },
    sessionSelection: {
      pinnedSessionKey: null,
    },
    characterWindow: {
      bounds: null,
    },
  };
}

function normalizeManagedProject(
  project: Partial<ManagedProjectConfig> & { projectRoot: string },
): ManagedProjectConfig {
  return {
    projectRoot: resolve(project.projectRoot),
    claudeInstalled: project.claudeInstalled ?? false,
    codexInstalled: project.codexInstalled ?? false,
    lastSetupAt: project.lastSetupAt ?? null,
    lastSmokeTestAt: project.lastSmokeTestAt ?? null,
    lastSmokeTestStatus: project.lastSmokeTestStatus ?? null,
  };
}

function normalizeSessionSelection(
  selection: Partial<SessionSelectionConfig> | undefined,
): SessionSelectionConfig {
  return {
    pinnedSessionKey:
      typeof selection?.pinnedSessionKey === "string"
        ? selection.pinnedSessionKey
        : null,
  };
}

function normalizeProfilePreferences(
  profiles: Partial<ProfilePreferencesConfig> | undefined,
): ProfilePreferencesConfig {
  return {
    defaultProfileId:
      typeof profiles?.defaultProfileId === "string"
        ? profiles.defaultProfileId
        : null,
  };
}

function normalizeCharacterWindow(
  characterWindow: Partial<CharacterWindowConfig> | undefined,
): CharacterWindowConfig {
  return {
    bounds: normalizeCharacterWindowBounds(characterWindow?.bounds),
  };
}

function normalizeCharacterWindowBounds(
  bounds: Partial<CharacterWindowBounds> | null | undefined,
) {
  if (bounds === null || bounds === undefined) {
    return null;
  }

  if (
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height)
  ) {
    return null;
  }

  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  };
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
