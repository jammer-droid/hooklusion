import {
  type AnimationProfile,
  isFloatingMotionEnabled,
  PROFILE_TRANSITION_IN_ANIMATION,
  PROFILE_TRANSITION_OUT_ANIMATION,
} from "../../shared/animationProfile.js";
import type {
  CharacterDesktopApi,
  CharacterDesktopSnapshot,
  CharacterResizeCorner,
} from "../../shared/characterDesktop.js";
import type {
  InteractionPackStateName,
  PackStateName,
  TransientInteractionPackStateName,
} from "../../shared/packState.js";
import type { AnimationPack } from "./animationPack.js";
import { createCharacterAnimator } from "./characterAnimator.js";
import { finishCharacterDragInteraction } from "./characterDragInteraction.js";
import {
  type DragDirection,
  resolveDirectionalDragState,
} from "./dragDirection.js";
import {
  gpchanAnimationPack,
  resolveGpchanBundledFrameUrl,
} from "./gpchanPack.js";
import {
  readInteractionAnimationDurationMs,
  resolvePresentedPackState,
} from "./interactionPresentation.js";
import {
  getCachedBySession,
  getOrCreatePackForSession,
} from "./profilePackCache.js";
import { resolveSnapshotPackState } from "./rendererPackState.js";
import { buildCharacterRendererHtml } from "./rendererShell.js";
import {
  type HeldTransientInteractionState,
  resolveHeldTransientInteractionState,
  shouldHoldTransientInteraction,
} from "./transientInteractionHold.js";

declare global {
  interface Window {
    projectCDesktop: CharacterDesktopApi;
  }
}

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("Renderer root element was not found.");
}

const animator = createCharacterAnimator(
  gpchanAnimationPack,
  new URL(import.meta.url),
);
let currentAppliedPack: AnimationPack = gpchanAnimationPack;
let currentAppliedProfile: AnimationProfile | null = null;
let currentSnapshot: CharacterDesktopSnapshot = {
  provider: null,
  sessionId: null,
  turnId: null,
  state: "idle",
  providerState: null,
};
let activeInteractionState: InteractionPackStateName | null = null;
let heldTransientInteraction: HeldTransientInteractionState | null = null;
let interactionTimer: ReturnType<typeof setTimeout> | null = null;
let dragAnimationFrameId: number | null = null;
let lastDragDirection: DragDirection | null = null;
let lastDragWindowPosition: { x: number; y: number } | null = null;

let lastTransitionId = -1;
let lastTick = performance.now();
let floatingMotionEnabled = true;
let displayedSessionKey: string | null = null;
let hasReceivedLiveCharacterState = false;
let displayTransitionGeneration = 0;
let pendingIncomingSwapSessionKey: string | null | undefined;
const appliedPackBySessionKey = new Map<
  string | null,
  { signature: string; pack: AnimationPack }
>();
const appliedPackBySignature = new Map<string, AnimationPack>();
const appliedProfileBySessionKey = new Map<string | null, AnimationProfile>();

app.innerHTML = buildCharacterRendererHtml();

const currentImage =
  document.querySelector<HTMLImageElement>("#character-current");
const previousImage = document.querySelector<HTMLImageElement>(
  "#character-previous",
);
const characterStage =
  document.querySelector<HTMLDivElement>("#character-stage");
const characterFrame = document.querySelector<HTMLElement>(
  "[data-role='character-frame']",
);

if (
  currentImage === null ||
  previousImage === null ||
  characterStage === null ||
  characterFrame === null
) {
  throw new Error("Character renderer elements were not found.");
}

function render() {
  const model = animator.getRenderModel();
  currentImage.src = model.frameUrl;
  characterStage.style.transform = floatingMotionEnabled
    ? model.motionTransform
    : "translate3d(0, 0, 0) scale(1)";

  if (model.transitionId !== lastTransitionId) {
    lastTransitionId = model.transitionId;

    previousImage.src = model.previousFrameUrl ?? model.frameUrl;
    previousImage.style.transitionDuration = `${model.transitionMs}ms`;
    currentImage.style.transitionDuration = `${model.transitionMs}ms`;

    previousImage.style.opacity = "1";
    currentImage.style.opacity = "0";

    requestAnimationFrame(() => {
      previousImage.style.opacity = "0";
      currentImage.style.opacity = "1";
    });
  }
}

function debugRendererState(
  message: string,
  payload: Record<string, unknown> = {},
) {
  window.projectCDesktop.debugLog(message, {
    animatorState: animator.getRenderModel().state,
    activeInteractionState,
    didDragMove,
    focused: document.hasFocus(),
    heldTransientInteraction:
      heldTransientInteraction?.interactionState ?? null,
    isDragging,
    isHovering,
    snapshotProviderState: currentSnapshot.providerState,
    snapshotState: currentSnapshot.state,
    ...payload,
  });
}

function tick(now: number) {
  const deltaMs = now - lastTick;
  lastTick = now;
  animator.tick(deltaMs);
  render();
  requestAnimationFrame(tick);
}

window.addEventListener("focus", () => {
  document.body.dataset.focused = "true";
});

window.addEventListener("blur", () => {
  debugRendererState("window-blur");
  if (isDragging) {
    window.projectCDesktop.endCharacterDrag();
  }

  releaseActiveDragPointerCapture();
  isDragging = false;
  didDragMove = false;
  isHovering = false;
  document.body.dataset.dragging = "false";
  document.body.dataset.hovering = "false";
  document.body.dataset.focused = "false";
  stopDirectionalDragTracking();
  clearInteractionState();
});

window.addEventListener("mouseover", () => {
  if (isHovering) {
    return;
  }

  isHovering = true;
  document.body.dataset.hovering = "true";
  triggerTransientInteraction("hover_in");
});

window.addEventListener("mouseout", (event) => {
  if (event.relatedTarget !== null || !isHovering) {
    return;
  }

  isHovering = false;
  document.body.dataset.hovering = "false";

  if (!isDragging) {
    triggerTransientInteraction("hover_out");
  }
});

let isDragging = false;
let didDragMove = false;
let isHovering = false;
let activeDragPointerId: number | null = null;

characterFrame.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }

  isDragging = true;
  didDragMove = false;
  activeDragPointerId = event.pointerId;
  document.body.dataset.dragging = "true";
  characterFrame.setPointerCapture(event.pointerId);
  startDirectionalDragTracking();
  window.projectCDesktop.beginCharacterDrag();
});

characterFrame.addEventListener("lostpointercapture", () => {
  if (!isDragging) {
    activeDragPointerId = null;
    return;
  }

  completeCharacterDrag({ triggerClickWhenStationary: false });
});

window.addEventListener("pointermove", () => {
  if (!isDragging) {
    return;
  }

  if (!didDragMove) {
    didDragMove = true;
    debugRendererState("set-drag-on-pointermove");
    setInteractionState("drag");
  }

  window.projectCDesktop.moveCharacterDrag();
});

window.addEventListener("pointerup", () => {
  completeCharacterDrag();
});

window.addEventListener("pointercancel", () => {
  completeCharacterDrag({ triggerClickWhenStationary: false });
});

let isResizing = false;

for (const handle of document.querySelectorAll<HTMLElement>(
  "[data-role='character-resize-handle']",
)) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const corner = handle.dataset.corner as CharacterResizeCorner;
    isResizing = true;
    window.projectCDesktop.beginCharacterResize(corner);
  });
}

window.addEventListener("pointermove", () => {
  if (!isResizing) {
    return;
  }

  window.projectCDesktop.moveCharacterResize();
});

window.addEventListener("pointerup", () => {
  if (!isResizing) {
    return;
  }

  isResizing = false;
  window.projectCDesktop.endCharacterResize();
});

void window.projectCDesktop.getCurrentCharacterState().then((snapshot) => {
  if (hasReceivedLiveCharacterState) {
    return;
  }

  applyCharacterStateSnapshot(snapshot);
});

window.projectCDesktop.onCharacterState((snapshot) => {
  hasReceivedLiveCharacterState = true;
  debugRendererState("on-character-state", {
    incomingProviderState: snapshot.providerState,
    incomingSessionId: snapshot.sessionId,
    incomingState: snapshot.state,
    incomingTurnId: snapshot.turnId,
  });
  applyCharacterStateSnapshot(snapshot);
});

window.projectCDesktop.onProfileApplied((profile, sessionKey) => {
  debugRendererState("on-profile-applied", {
    appliedProfileId: profile.id,
    sessionKey,
  });
  appliedProfileBySessionKey.set(sessionKey, profile);
  getOrCreatePackForSession(
    appliedPackBySessionKey,
    appliedPackBySignature,
    profile,
    sessionKey,
    {
      resolveFrameUrl: resolveProfileFrameUrl,
    },
  );
  applyResolvedDisplayForDisplayedSession();
});

requestAnimationFrame(tick);

function resolveDisplayedProfile() {
  return (
    appliedProfileBySessionKey.get(displayedSessionKey) ??
    appliedProfileBySessionKey.get(null) ??
    null
  );
}

function getResolvedPackForDisplayedSession() {
  return getCachedBySession(appliedPackBySessionKey, displayedSessionKey);
}

function applyResolvedDisplayForDisplayedSession() {
  const resolvedPack = getResolvedPackForDisplayedSession()?.pack;
  const resolvedProfile = resolveDisplayedProfile();

  if (
    resolvedPack === undefined ||
    (resolvedPack === currentAppliedPack &&
      resolvedProfile === currentAppliedProfile)
  ) {
    return false;
  }

  const isCompletingPendingSessionSwap =
    pendingIncomingSwapSessionKey === displayedSessionKey;
  pendingIncomingSwapSessionKey = undefined;

  runDisplayTransition({
    outgoingPack: currentAppliedPack,
    outgoingProfile: currentAppliedProfile,
    commit: () => {
      commitResolvedDisplay(resolvedPack, resolvedProfile);
    },
    incomingPack: resolvedPack,
    skipOutgoing: isCompletingPendingSessionSwap,
  });
  return true;
}

function runDisplayTransition(args: {
  outgoingPack: AnimationPack;
  outgoingProfile: AnimationProfile | null;
  commit: () => void;
  incomingPack: AnimationPack | null;
  skipOutgoing?: boolean;
}) {
  debugRendererState("run-display-transition", {
    incomingHasTransition:
      args.incomingPack?.transitions?.[PROFILE_TRANSITION_IN_ANIMATION] !==
      undefined,
    outgoingHasTransition:
      args.outgoingPack.transitions?.[PROFILE_TRANSITION_OUT_ANIMATION] !==
      undefined,
    skipOutgoing: args.skipOutgoing ?? false,
  });
  const outgoingTransition =
    args.skipOutgoing === true || args.outgoingProfile === null
      ? undefined
      : args.outgoingPack.transitions?.[PROFILE_TRANSITION_OUT_ANIMATION];
  const generation = ++displayTransitionGeneration;

  const finishSwap = () => {
    if (generation !== displayTransitionGeneration) {
      return;
    }

    args.commit();

    if (pendingIncomingSwapSessionKey !== undefined) {
      return;
    }

    const incomingTransition = (args.incomingPack ?? currentAppliedPack)
      .transitions?.[PROFILE_TRANSITION_IN_ANIMATION];

    if (incomingTransition !== undefined) {
      animator.playTemporaryAnimation(incomingTransition, {
        onComplete() {
          if (generation !== displayTransitionGeneration) {
            return;
          }

          render();
        },
      });
    }
  };

  if (outgoingTransition !== undefined) {
    animator.playTemporaryAnimation(outgoingTransition, {
      onComplete: finishSwap,
    });
    return;
  }

  finishSwap();
}

function commitResolvedDisplay(
  resolvedPack: AnimationPack,
  resolvedProfile: AnimationProfile | null,
) {
  debugRendererState("commit-resolved-display", {
    packChanged: resolvedPack !== currentAppliedPack,
    resolvedProfileId: resolvedProfile?.id ?? null,
  });
  currentAppliedProfile = resolvedProfile;
  heldTransientInteraction = null;

  if (resolvedProfile !== null) {
    floatingMotionEnabled = isFloatingMotionEnabled(resolvedProfile);
  }

  const packChanged = resolvedPack !== currentAppliedPack;
  currentAppliedPack = resolvedPack;

  if (packChanged) {
    animator.setPack(resolvedPack, {
      transition: false,
      state: resolveSnapshotPackState(
        currentSnapshot,
        Object.keys(resolvedPack.states) as PackStateName[],
      ),
    });
  }

  syncPresentedState({ transition: false });
}

function applyCharacterStateSnapshot(snapshot: CharacterDesktopSnapshot) {
  const previousSessionKey = displayedSessionKey;
  const nextSessionKey = snapshot.sessionId;
  debugRendererState("apply-character-state-snapshot", {
    nextSessionKey,
    previousSessionKey,
    snapshotProviderState: snapshot.providerState,
    snapshotState: snapshot.state,
  });
  currentSnapshot = snapshot;

  if (nextSessionKey !== previousSessionKey) {
    beginSessionTransition(nextSessionKey);
    return;
  }

  if (!applyResolvedDisplayForDisplayedSession()) {
    syncPresentedState();
  }
}

function beginSessionTransition(nextSessionKey: string | null) {
  const outgoingPack = currentAppliedPack;
  const outgoingProfile = currentAppliedProfile;
  pendingIncomingSwapSessionKey = undefined;

  runDisplayTransition({
    outgoingPack,
    outgoingProfile,
    commit: () => {
      displayedSessionKey = nextSessionKey;
      const resolvedCache = getResolvedPackForDisplayedSession();
      const resolvedProfileForNext =
        appliedProfileBySessionKey.get(nextSessionKey);

      if (resolvedCache === undefined || resolvedProfileForNext === undefined) {
        pendingIncomingSwapSessionKey = nextSessionKey;
        return;
      }

      commitResolvedDisplay(resolvedCache.pack, resolvedProfileForNext);
    },
    incomingPack: null,
  });
}

function resolveProfileFrameUrl(framePath: string): string {
  return resolveGpchanBundledFrameUrl(framePath) ?? framePath;
}

function syncPresentedState(options: { transition?: boolean } = {}) {
  const availableStates = Object.keys(
    currentAppliedPack.states,
  ) as PackStateName[];
  const baseState = resolveSnapshotPackState(currentSnapshot, availableStates);
  const heldInteractionState = resolveHeldTransientInteractionState({
    heldInteraction: heldTransientInteraction,
    baseState,
    availableStates,
  });

  if (heldTransientInteraction !== null && heldInteractionState === null) {
    heldTransientInteraction = null;
  }

  const nextState =
    currentAppliedProfile === null
      ? baseState
      : activeInteractionState !== null
        ? resolvePresentedPackState({
            snapshot: currentSnapshot,
            interactionState: activeInteractionState,
            profile: currentAppliedProfile,
            availableStates,
            focused: document.hasFocus(),
          })
        : (heldInteractionState ?? baseState);

  debugRendererState("sync-presented-state", {
    baseState,
    heldInteractionState,
    nextState,
    transition: options.transition ?? true,
  });

  if (animator.getRenderModel().state !== nextState) {
    animator.setState(nextState, options);
  }

  render();
}

function triggerTransientInteraction(
  interactionState: TransientInteractionPackStateName,
) {
  const durationMs = readTransientInteractionDuration(interactionState);
  if (durationMs === null) {
    return;
  }

  setInteractionState(interactionState);
  clearInteractionTimer();
  interactionTimer = setTimeout(() => {
    interactionTimer = null;
    if (activeInteractionState !== interactionState) {
      return;
    }

    if (currentAppliedProfile !== null) {
      const availableStates = Object.keys(
        currentAppliedPack.states,
      ) as PackStateName[];
      const presentedState = resolvePresentedPackState({
        snapshot: currentSnapshot,
        interactionState,
        profile: currentAppliedProfile,
        availableStates,
        focused: document.hasFocus(),
      });

      debugRendererState("transient-interaction-timeout", {
        interactionState,
        presentedState,
      });

      if (
        shouldHoldTransientInteraction({
          interactionState,
          holdLastFrame:
            currentAppliedProfile.states[interactionState]?.holdLastFrame ??
            false,
          presentedState,
        })
      ) {
        heldTransientInteraction = {
          interactionState,
          baseState: resolveSnapshotPackState(currentSnapshot, availableStates),
        };
        activeInteractionState = null;
        syncPresentedState();
        return;
      }
    }

    activeInteractionState = null;
    syncPresentedState();
  }, durationMs);
}

function setInteractionState(interactionState: InteractionPackStateName) {
  clearInteractionTimer();
  heldTransientInteraction = null;
  debugRendererState("set-interaction-state", {
    interactionState,
  });
  activeInteractionState = interactionState;
  syncPresentedState();
}

function clearInteractionState() {
  clearInteractionTimer();
  const hadHeldTransientInteraction = heldTransientInteraction !== null;
  heldTransientInteraction = null;

  if (activeInteractionState === null) {
    if (hadHeldTransientInteraction) {
      debugRendererState("clear-interaction-state:held-only");
      syncPresentedState();
    }
    return;
  }

  debugRendererState("clear-interaction-state", {
    interactionState: activeInteractionState,
  });
  activeInteractionState = null;
  syncPresentedState();
}

function clearInteractionTimer() {
  if (interactionTimer === null) {
    return;
  }

  clearTimeout(interactionTimer);
  interactionTimer = null;
}

function completeCharacterDrag(
  options: { triggerClickWhenStationary?: boolean } = {},
) {
  debugRendererState("complete-character-drag:start", {
    triggerClickWhenStationary: options.triggerClickWhenStationary ?? true,
  });
  const result = finishCharacterDragInteraction({
    isDragging,
    didDragMove,
    triggerClickWhenStationary: options.triggerClickWhenStationary,
  });

  if (!isDragging) {
    return;
  }

  isDragging = result.isDragging;
  didDragMove = result.didDragMove;
  document.body.dataset.dragging = "false";
  releaseActiveDragPointerCapture();
  window.projectCDesktop.endCharacterDrag();
  stopDirectionalDragTracking();

  if (result.shouldClearInteraction) {
    debugRendererState("complete-character-drag:clear-interaction");
    clearInteractionState();
    return;
  }

  if (result.shouldTriggerClick) {
    debugRendererState("complete-character-drag:trigger-click");
    triggerTransientInteraction("click");
  }
}

function releaseActiveDragPointerCapture() {
  const pointerId = activeDragPointerId;
  activeDragPointerId = null;

  if (pointerId === null) {
    return;
  }

  try {
    if (characterFrame.hasPointerCapture(pointerId)) {
      characterFrame.releasePointerCapture(pointerId);
    }
  } catch {
    // Native window dragging may drop pointer capture before the DOM sees pointerup.
  }
}

function startDirectionalDragTracking() {
  stopDirectionalDragTracking();
  lastDragWindowPosition = readWindowPosition();
  dragAnimationFrameId = requestAnimationFrame(trackDirectionalDrag);
}

function stopDirectionalDragTracking() {
  if (dragAnimationFrameId !== null) {
    cancelAnimationFrame(dragAnimationFrameId);
    dragAnimationFrameId = null;
  }

  lastDragDirection = null;
  lastDragWindowPosition = null;
}

function trackDirectionalDrag() {
  dragAnimationFrameId = null;

  if (!isDragging) {
    return;
  }

  const currentWindowPosition = readWindowPosition();
  const previousWindowPosition = lastDragWindowPosition;
  lastDragWindowPosition = currentWindowPosition;

  if (didDragMove && previousWindowPosition !== null) {
    const availableStates = Object.keys(
      currentAppliedPack.states,
    ) as PackStateName[];
    const resolvedState = resolveDirectionalDragState({
      deltaX: currentWindowPosition.x - previousWindowPosition.x,
      deltaY: currentWindowPosition.y - previousWindowPosition.y,
      lastDirection: lastDragDirection,
      availableStates,
    });

    lastDragDirection = resolvedState.direction;

    if (activeInteractionState !== resolvedState.interactionState) {
      debugRendererState("set-directional-drag-state", {
        deltaX: currentWindowPosition.x - previousWindowPosition.x,
        deltaY: currentWindowPosition.y - previousWindowPosition.y,
        resolvedInteractionState: resolvedState.interactionState,
      });
      setInteractionState(resolvedState.interactionState);
    }
  }

  dragAnimationFrameId = requestAnimationFrame(trackDirectionalDrag);
}

function readWindowPosition() {
  return {
    x: window.screenX,
    y: window.screenY,
  };
}

function readTransientInteractionDuration(
  interactionState: TransientInteractionPackStateName,
) {
  if (currentAppliedProfile === null) {
    return null;
  }

  return readInteractionAnimationDurationMs(
    currentAppliedProfile,
    interactionState,
  );
}
