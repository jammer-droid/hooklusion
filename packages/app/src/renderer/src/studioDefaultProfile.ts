export function resolveStudioDefaultProfileId(
  profileIds: string[],
  reportedDefaultProfileId: string | null,
) {
  if (
    reportedDefaultProfileId !== null &&
    profileIds.includes(reportedDefaultProfileId)
  ) {
    return reportedDefaultProfileId;
  }

  return profileIds[0] ?? null;
}
