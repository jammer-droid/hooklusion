import { isAbsolute, relative, resolve } from "node:path";

import type { CharacterEvent } from "../../../server/src/characterEvent.js";

export function readEventCwd(event: CharacterEvent): string | null {
  if (!isRecord(event.raw)) {
    return null;
  }

  const cwd = event.raw.cwd;
  return typeof cwd === "string" && cwd.length > 0 ? cwd : null;
}

export function isProjectScopedEvent(
  event: CharacterEvent,
  projectRoot: string,
) {
  const cwd = readEventCwd(event);

  if (cwd === null) {
    return false;
  }

  return isProjectScopedCwd(cwd, projectRoot);
}

export function isManagedProjectScopedEvent(
  event: CharacterEvent,
  projectRoots: string[],
) {
  const cwd = readEventCwd(event);

  if (cwd === null) {
    return false;
  }

  return isManagedProjectScopedCwd(cwd, projectRoots);
}

export function isProjectScopedCwd(cwd: string, projectRoot: string) {
  const resolvedCwd = resolve(cwd);
  const resolvedProjectRoot = resolve(projectRoot);

  if (resolvedCwd === resolvedProjectRoot) {
    return true;
  }

  const relativePath = relative(resolvedProjectRoot, resolvedCwd);

  return (
    relativePath.length > 0 &&
    !relativePath.startsWith("..") &&
    !isAbsolute(relativePath)
  );
}

export function isManagedProjectScopedCwd(cwd: string, projectRoots: string[]) {
  if (projectRoots.length === 0) {
    return false;
  }

  return projectRoots.some((projectRoot) =>
    isProjectScopedCwd(cwd, projectRoot),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
