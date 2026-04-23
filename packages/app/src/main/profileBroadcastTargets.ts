export function resolveProfileBroadcastSessionKeys({
  appliedSessionKey,
  activeSessionKey,
  hasActiveSessionOverride,
}: {
  appliedSessionKey: string | null;
  activeSessionKey: string | null;
  hasActiveSessionOverride: boolean;
}) {
  if (appliedSessionKey !== null) {
    return [appliedSessionKey];
  }

  if (activeSessionKey === null || hasActiveSessionOverride) {
    return [null];
  }

  return [null, activeSessionKey];
}
