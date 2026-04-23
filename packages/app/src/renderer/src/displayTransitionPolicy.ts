export function shouldPlayDisplayTransition({
  previousSessionKey,
  nextSessionKey,
  packChanged,
  profileChanged,
}: {
  previousSessionKey: string | null;
  nextSessionKey: string | null;
  packChanged: boolean;
  profileChanged: boolean;
}) {
  return previousSessionKey !== nextSessionKey || packChanged || profileChanged;
}
