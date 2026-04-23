import type { SessionKey } from "./sessionKey.js";

export function shouldRefreshDisplayedSessionSelection(
  previousSessionKey: SessionKey | null,
  nextSessionKey: SessionKey | null,
) {
  return previousSessionKey !== nextSessionKey;
}
