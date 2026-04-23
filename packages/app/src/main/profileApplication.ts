import type { AnimationProfile } from "../shared/animationProfile.js";

export interface ProfileRepositoryLike {
  readProfile(profileId: string): Promise<AnimationProfile>;
}

export interface ProfileSelectionState {
  defaultProfileId: string;
  sessionProfileOverrides: Map<string, string>;
}

export const DEFAULT_PROFILE_ID = "gpchan-default";

interface SelectionRevisionState {
  started: number;
  committed: number;
}

const selectionRevisions = new WeakMap<
  ProfileSelectionState,
  SelectionRevisionState
>();

export function createProfileSelectionState(
  initialDefaultProfileId: string,
  sessionProfileOverrides = new Map<string, string>(),
): ProfileSelectionState {
  let defaultProfileId = initialDefaultProfileId;

  return {
    get defaultProfileId() {
      return defaultProfileId;
    },
    set defaultProfileId(value: string) {
      defaultProfileId = value;
    },
    sessionProfileOverrides,
  };
}

export async function applyProfileSelection(
  profileRepository: ProfileRepositoryLike,
  state: ProfileSelectionState,
  profileId: string,
  sessionKey: string | null,
  broadcastProfile?: (
    profile: AnimationProfile,
    sessionKey: string | null,
  ) => void | Promise<void>,
): Promise<AnimationProfile> {
  const revisionState = getSelectionRevisionState(state);
  const startedRevision = ++revisionState.started;
  const profile = await profileRepository.readProfile(profileId);
  if (startedRevision !== revisionState.started) {
    return profile;
  }

  const previousDefaultProfileId = state.defaultProfileId;
  const hadPreviousSessionOverride =
    sessionKey !== null && state.sessionProfileOverrides.has(sessionKey);
  const previousSessionOverride =
    sessionKey !== null
      ? state.sessionProfileOverrides.get(sessionKey)
      : undefined;
  const previousCommittedRevision = revisionState.committed;

  if (sessionKey === null) {
    state.defaultProfileId = profileId;
  } else {
    state.sessionProfileOverrides.set(sessionKey, profileId);
  }

  revisionState.committed = startedRevision;

  try {
    if (broadcastProfile !== undefined) {
      await broadcastProfile(profile, sessionKey);
    }
    return profile;
  } catch (error) {
    if (revisionState.committed === startedRevision) {
      state.defaultProfileId = previousDefaultProfileId;

      if (sessionKey !== null) {
        if (hadPreviousSessionOverride) {
          state.sessionProfileOverrides.set(
            sessionKey,
            previousSessionOverride as string,
          );
        } else {
          state.sessionProfileOverrides.delete(sessionKey);
        }
      }

      revisionState.committed = previousCommittedRevision;
    }

    throw error;
  }
}

export function broadcastResolvedProfileSafely(
  broadcast: () => Promise<void>,
  onError: (error: unknown) => void = console.error,
) {
  void broadcast().catch((error) => {
    onError(error);
  });
}

function getSelectionRevisionState(
  state: ProfileSelectionState,
): SelectionRevisionState {
  const existing = selectionRevisions.get(state);
  if (existing !== undefined) {
    return existing;
  }

  const created = {
    started: 0,
    committed: 0,
  };
  selectionRevisions.set(state, created);
  return created;
}
