export function shouldBroadcastResolvedProfileForSessionChange(
  previousSessionKey: string | null,
  nextSessionKey: string | null,
) {
  return previousSessionKey !== nextSessionKey;
}
