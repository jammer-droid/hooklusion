export function shouldOpenLaunchVisibilityFallback(options: {
  isPackaged: boolean;
  platform: NodeJS.Platform;
}) {
  return options.isPackaged && options.platform === "darwin";
}
