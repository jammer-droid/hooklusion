import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export function resolveBundledAssetDirectoryForRuntime(options: {
  projectRoot: string;
  assetDirectoryName: string;
  isPackaged: boolean;
  resourcesPath?: string;
}) {
  if (options.isPackaged) {
    return join(
      options.resourcesPath ?? process.resourcesPath,
      "bundled-assets",
      options.assetDirectoryName,
    );
  }

  return resolveBundledProfileAssetDirectory(
    options.projectRoot,
    options.assetDirectoryName,
  );
}

export function resolveProjectRoot(startDirectory: string) {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    if (hasProjectRootMarker(currentDirectory)) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return resolvePackagesAppFallback(startDirectory);
    }
    currentDirectory = parentDirectory;
  }
}

export function resolveBundledAssetRoot(
  projectRoot: string,
  assetDirectoryName: string,
) {
  const resolvedProjectRoot = resolveProjectRoot(projectRoot);
  const localAssetsRoot = join(resolvedProjectRoot, "assets");

  if (existsSync(join(localAssetsRoot, assetDirectoryName))) {
    return localAssetsRoot;
  }

  const parentDirectory = dirname(resolvedProjectRoot);
  const parentName = basename(parentDirectory);

  if (parentName === ".worktrees" || parentName === "worktrees") {
    const mainRepoAssetsRoot = join(dirname(parentDirectory), "assets");
    if (existsSync(join(mainRepoAssetsRoot, assetDirectoryName))) {
      return mainRepoAssetsRoot;
    }
  }

  return localAssetsRoot;
}

export function resolveBundledProfileAssetDirectory(
  projectRoot: string,
  assetDirectoryName: string,
) {
  return join(
    resolveBundledAssetRoot(projectRoot, assetDirectoryName),
    assetDirectoryName,
  );
}

function hasProjectRootMarker(directory: string) {
  return (
    existsSync(join(directory, "pnpm-workspace.yaml")) ||
    existsSync(join(directory, ".git"))
  );
}

function resolvePackagesAppFallback(startDirectory: string) {
  const resolvedStartDirectory = resolve(startDirectory);
  const parentDirectory = dirname(resolvedStartDirectory);

  if (
    basename(resolvedStartDirectory) === "app" &&
    basename(parentDirectory) === "packages"
  ) {
    return dirname(parentDirectory);
  }

  return resolvedStartDirectory;
}
