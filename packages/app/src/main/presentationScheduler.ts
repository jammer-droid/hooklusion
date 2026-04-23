import type {
  ProfileStateMapping,
  ProfileStateName,
} from "../shared/animationProfile.js";

export type PresentationPolicy<StateName extends string = ProfileStateName> =
  Partial<
    Record<
      StateName,
      Pick<ProfileStateMapping, "interruptible" | "minCycles" | "minDwellMs">
    >
  >;

export interface CreatePresentationSchedulerOptions<
  StateName extends string = ProfileStateName,
> {
  now: () => number;
  emit: (state: StateName) => void;
  policy?: PresentationPolicy<StateName>;
  resolveSessionProfile?: (sessionKey: string) => string;
  setTimer?: (
    callback: () => void,
    delayMs: number,
  ) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

export function createPresentationScheduler(
  options: CreatePresentationSchedulerOptions,
) {
  return createTypedPresentationScheduler(options);
}

export function createTypedPresentationScheduler<StateName extends string>(
  options: CreatePresentationSchedulerOptions<StateName>,
) {
  let policy = options.policy ?? {};
  let currentState: StateName | null = null;
  let currentStateStartedAt = 0;
  let queuedState: StateName | null = null;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;
  let currentSessionProfile: string | null = null;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;

  function receive(state: StateName) {
    if (shouldHoldCurrentState()) {
      queuedState = state;
      scheduleQueuedStateRelease();
      return;
    }

    emitState(state);
  }

  function switchSession(sessionKey: string) {
    const nextSessionProfile = options.resolveSessionProfile?.(sessionKey);

    if (nextSessionProfile === undefined) {
      return;
    }

    if (currentSessionProfile === null) {
      currentSessionProfile = nextSessionProfile;
      return;
    }

    if (currentSessionProfile === nextSessionProfile) {
      return;
    }

    currentSessionProfile = nextSessionProfile;
  }

  function setPolicy(nextPolicy: PresentationPolicy<StateName>) {
    policy = nextPolicy;
  }

  function dispose() {
    if (releaseTimer !== null) {
      clearTimer(releaseTimer);
      releaseTimer = null;
    }
  }

  function shouldHoldCurrentState() {
    if (currentState === null) {
      return false;
    }

    const currentPolicy = policy[currentState];

    if (currentPolicy?.interruptible !== false) {
      return false;
    }

    return (
      options.now() - currentStateStartedAt < (currentPolicy.minDwellMs ?? 0)
    );
  }

  function scheduleQueuedStateRelease() {
    if (releaseTimer !== null || currentState === null) {
      return;
    }

    const currentPolicy = policy[currentState];
    const remainingMs = Math.max(
      0,
      (currentPolicy?.minDwellMs ?? 0) -
        (options.now() - currentStateStartedAt),
    );

    releaseTimer = setTimer(() => {
      releaseTimer = null;
      flushQueuedState();
    }, remainingMs);
  }

  function flushQueuedState() {
    if (queuedState === null) {
      return;
    }

    const nextState = queuedState;
    queuedState = null;
    emitState(nextState);
  }

  function emitState(state: StateName) {
    currentState = state;
    currentStateStartedAt = options.now();
    queuedState = null;
    options.emit(state);
  }

  return {
    dispose,
    receive,
    setPolicy,
    switchSession,
  };
}
