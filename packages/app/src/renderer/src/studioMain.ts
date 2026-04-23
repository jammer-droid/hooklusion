import type {
  AnimationProfile,
  ProfileAnimation,
  ProfileStateName,
} from "../../shared/animationProfile.js";
import {
  deriveAnimationDurations,
  isFloatingMotionEnabled,
  validateAnimationProfile,
} from "../../shared/animationProfile.js";
import type { CharacterDesktopApi } from "../../shared/characterDesktop.js";
import {
  isInteractionPackState,
  isTransientInteractionPackState,
} from "../../shared/packState.js";
import { formatProfileAssetPath } from "../../shared/profileAssetUrl.js";
import { resolveGpchanBundledFrameUrl } from "./gpchanPack.js";
import { resolveStudioDefaultProfileId } from "./studioDefaultProfile.js";
import {
  canRemoveAnimationFrame,
  getSelectedFrameIndexAfterRemoval,
} from "./studioFrameRemoval.js";
import {
  buildStatePolicySectionTitle,
  buildStudioInspector,
  STATE_POLICY_FIELD_HELP,
  shouldShowStudioLoopControl,
  shouldShowStudioMinDwellControl,
} from "./studioInspector.js";
import { buildStudioMetaBar } from "./studioMeta.js";
import {
  advanceScheduledPlayback,
  clampFrameIndex,
  moveToNextFrame,
  moveToPreviousFrame,
  type StudioPlaybackState,
  selectPreviewFrame,
  shouldHandlePreviewControlClick,
  togglePreviewPlayback,
} from "./studioPlayback.js";
import { getStudioPreviewFrameUrls } from "./studioPreview.js";
import {
  PROFILE_ACTION_LAYOUT,
  type StudioProfileActionId,
} from "./studioProfileActions.js";
import {
  addAnimationFrame,
  cloneAnimationProfile,
  removeAnimationFrame,
  renameAnimationProfile,
  reorderAnimationFrame,
  replaceAnimationFrame,
  setAnimationFrameWeight,
  setAnimationLoop,
  setProfileFloatingMotion,
  updateAnimationTiming,
  updateStatePolicy,
} from "./studioProfileEditing.js";
import { createStudioProfilePackageImportRequest } from "./studioProfilePackageImport.js";
import { buildAnimationStudioHtml } from "./studioShell.js";
import { requestStudioSpriteSetImport } from "./studioSpriteSetImport.js";
import {
  createStudioExportChoiceModalState,
  createStudioImportChoiceModalState,
  renderStudioTransferModal,
  type StudioTransferModalState,
} from "./studioSpriteSetImportModal.js";
import { buildStudioTimeline } from "./studioTimeline.js";
import {
  createFrameMoveToastMessage,
  dismissStudioToast,
  enqueueStudioToast,
  STUDIO_TOAST_TIMEOUT_MS,
  type StudioToast,
} from "./studioToast.js";
import {
  buildStudioProfileTree,
  type StudioProfileTreeAnimationItem,
  type StudioProfileTreeProfileItem,
} from "./studioTree.js";

declare global {
  interface Window {
    projectCDesktop: CharacterDesktopApi;
  }
}

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("Renderer root element was not found.");
}

app.innerHTML = buildAnimationStudioHtml();

const profilesBody = readElement("[data-role='profiles-body']");
const importProfileButton = readElement<HTMLButtonElement>(
  "[data-role='import-profile']",
);
const addProfileButton = readElement<HTMLButtonElement>(
  "[data-role='add-profile']",
);
const metaBody = readElement("[data-role='meta-body']");
const previewBody = readElement("[data-role='preview-body']");
const timelineBody = readElement("[data-role='timeline-body']");
const inspectorBody = readElement("[data-role='inspector-body']");
const toastBody = readElement("[data-role='toast-body']");
const profileImportModalRoot = readElement<HTMLDivElement>(
  "[data-role='profile-import-modal']",
);
const profileExportModalRoot = readElement<HTMLDivElement>(
  "[data-role='profile-export-modal']",
);

let profiles: AnimationProfile[] = [];
let selectedProfileId: string | null = null;
let selectedAnimationName: string | null = null;
let selectedTreeItemId: string | null = null;
let defaultProfileId: string | null = null;
let collapsedProfileIds = new Set<string>();
let selectedFrameIndex = 0;
let playbackPlaying = false;
let playbackEpoch = 0;
let playbackTimer: ReturnType<typeof setTimeout> | null = null;
let draggingFrameIndex: number | null = null;
let suppressNextFrameClick = false;
let toasts: StudioToast[] = [];
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();
const toastExitTimers = new Map<string, ReturnType<typeof setTimeout>>();
const STUDIO_TOAST_EXIT_MS = 180;
let importChoiceModalState: StudioTransferModalState | null = null;
let resolveImportChoice:
  | ((value: "sprite_set" | "profile" | null) => void)
  | null = null;
let exportChoiceModalState: StudioTransferModalState | null = null;
let resolveExportChoice: ((value: "directory" | "zip" | null) => void) | null =
  null;

void Promise.all([
  window.projectCDesktop.listProfiles(),
  window.projectCDesktop.getDefaultProfileId(),
]).then(([loadedProfiles, reportedDefaultProfileId]) => {
  profiles = loadedProfiles;
  selectedProfileId = profiles[0]?.id ?? null;
  defaultProfileId = resolveStudioDefaultProfileId(
    profiles.map((profile) => profile.id),
    reportedDefaultProfileId,
  );
  selectedAnimationName =
    selectedProfileId === null
      ? null
      : (Object.keys(readSelectedProfile()?.animations ?? {})[0] ?? null);
  selectedTreeItemId =
    selectedProfileId === null
      ? null
      : createProfileTreeItemId(selectedProfileId);
  renderStudio();
});

window.projectCDesktop.onProfileApplied((profile, sessionKey) => {
  if (sessionKey === null) {
    defaultProfileId = profile.id;
  }
  renderProfiles();
});

addProfileButton.addEventListener("click", () => {
  cloneSelectedProfile();
});

importProfileButton.addEventListener("click", () => {
  void importProfileFromChoice();
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    applyPlaybackState(
      togglePreviewPlayback({
        selectedFrameIndex,
        playing: playbackPlaying,
      }),
    );
    renderStudio();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    movePreviewFrame("previous");
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    movePreviewFrame("next");
  }
});

function renderStudio() {
  renderProfiles();
  renderMeta();
  renderInspector();
  renderPreview();
  renderTimeline();
  renderImportChoiceModal();
  renderExportChoiceModal();
}

function renderProfiles() {
  profilesBody.replaceChildren();

  if (profiles.length === 0) {
    profilesBody.append(createEmptyState("No profiles"));
    return;
  }

  const layout = document.createElement("div");
  layout.className = "studio-profile-layout";
  const treeSection = document.createElement("div");
  treeSection.className = "studio-list";
  const tree = document.createElement("div");
  tree.className = "studio-tree";

  const treeItems = buildStudioProfileTree({
    profiles,
    selectedProfileId,
    selectedAnimationName,
    activeProfileId: defaultProfileId,
    selectedTreeItemId,
    collapsedProfileIds: [...collapsedProfileIds],
  });

  for (const item of treeItems) {
    if (item.kind === "profile") {
      tree.append(createProfileTreeRow(item));
      if (item.expanded) {
        const profile = profiles.find((p) => p.id === item.profileId);
        if (profile !== undefined) {
          tree.append(createFloatingMotionRow(profile));
        }
      }
      continue;
    }

    if (item.kind === "subheader") {
      tree.append(createProfileTreeSubheader(item.label, item.depth));
      continue;
    }

    if (item.kind === "divider") {
      tree.append(createProfileTreeDivider());
      continue;
    }

    tree.append(createAnimationTreeRow(item));
  }
  treeSection.append(tree);

  const selectedProfile = readSelectedProfile();

  const actions = document.createElement("div");
  actions.className = "studio-profile-actions";
  const leadingActions = document.createElement("div");
  leadingActions.className = "studio-profile-actions-group";
  leadingActions.dataset.align = "start";
  const trailingActions = document.createElement("div");
  trailingActions.className = "studio-profile-actions-group";
  trailingActions.dataset.align = "end";
  const defaultButton = document.createElement("button");
  defaultButton.className = "studio-button studio-icon-action";
  defaultButton.type = "button";
  defaultButton.setAttribute("aria-label", "Set as default profile");
  defaultButton.title = "Set as default";
  defaultButton.innerHTML =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="1.6"/></svg>';
  defaultButton.addEventListener("click", () => {
    void setSelectedProfileAsDefault();
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "studio-button studio-icon-action";
  deleteButton.type = "button";
  deleteButton.dataset.tone = "danger";
  deleteButton.setAttribute("aria-label", "Delete profile");
  deleteButton.title = "Delete";
  deleteButton.innerHTML =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h10"/><path d="M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"/><path d="M5 4l.7 8.1a1 1 0 0 0 1 .9h2.6a1 1 0 0 0 1-.9L11 4"/><path d="M7 7v4M9 7v4"/></svg>';
  deleteButton.addEventListener("click", () => {
    void deleteSelectedProfile();
  });

  const saveButton = document.createElement("button");
  saveButton.className = "studio-button studio-icon-action";
  saveButton.type = "button";
  saveButton.setAttribute("aria-label", "Save profile");
  saveButton.title = "Save";
  saveButton.innerHTML =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2h8l2 2v10H3z"/><path d="M5 2v4h6V2"/><path d="M5 10h6v4H5z"/></svg>';
  saveButton.addEventListener("click", () => {
    void saveSelectedProfile();
  });
  const exportButton = document.createElement("button");
  exportButton.className = "studio-button studio-icon-action";
  exportButton.type = "button";
  exportButton.setAttribute("aria-label", "Export profile");
  exportButton.title = "Export";
  exportButton.innerHTML =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13.5v-8"/><path d="M5 6.5 8 3.5l3 3"/><path d="M3 13.5h10"/></svg>';
  exportButton.addEventListener("click", () => {
    void exportSelectedProfileFromChoice();
  });
  const actionButtons = new Map<StudioProfileActionId, HTMLButtonElement>([
    ["default", defaultButton],
    ["delete", deleteButton],
    ["export", exportButton],
    ["save", saveButton],
  ]);

  for (const actionId of PROFILE_ACTION_LAYOUT.start) {
    const button = actionButtons.get(actionId);
    if (button !== undefined) {
      leadingActions.append(button);
    }
  }

  for (const actionId of PROFILE_ACTION_LAYOUT.end) {
    const button = actionButtons.get(actionId);
    if (button !== undefined) {
      trailingActions.append(button);
    }
  }

  actions.append(leadingActions, trailingActions);

  const spacer = document.createElement("div");

  const footer = document.createElement("div");
  footer.className = "studio-profile-footer";
  if (selectedProfile !== undefined) {
    footer.append(createProfileInfoSection(selectedProfile));
  }

  layout.append(treeSection, spacer, actions, footer);
  profilesBody.append(layout);
}

function createProfileTreeSubheader(label: string, depth: 1 | 2) {
  const subheader = document.createElement("div");
  subheader.className = "studio-tree-subheader";
  subheader.dataset.depth = String(depth);
  subheader.textContent = label;
  return subheader;
}

function createProfileTreeDivider() {
  const divider = document.createElement("div");
  divider.className = "studio-tree-divider";
  divider.setAttribute("aria-hidden", "true");
  return divider;
}

function createFloatingMotionRow(profile: AnimationProfile) {
  const row = document.createElement("div");
  row.className = "studio-tree-floating";
  row.dataset.depth = "1";
  const label = document.createElement("span");
  label.className = "studio-tree-floating-label";
  label.textContent = "Floating motion";
  row.append(
    label,
    createToggle(isFloatingMotionEnabled(profile), (floatingMotion) => {
      updateSelectedProfile((current) => {
        if (current.id !== profile.id) {
          return current;
        }
        return setProfileFloatingMotion(current, floatingMotion);
      });
    }),
  );
  return row;
}

function createProfileTreeRow(item: StudioProfileTreeProfileItem) {
  const profile = profiles.find((candidate) => candidate.id === item.profileId);

  if (profile === undefined) {
    throw new Error(`Profile ${item.profileId} was not found.`);
  }

  const button = document.createElement("button");
  button.className = "studio-button studio-tree-row studio-profile-select";
  button.type = "button";
  button.dataset.selected = String(item.selected);
  button.setAttribute("aria-expanded", item.expanded ? "true" : "false");
  button.addEventListener("click", () => {
    const wasAlreadySelected = selectedProfileId === item.profileId;
    selectProfileRow(profile);
    if (wasAlreadySelected) {
      toggleProfileCollapse(item.profileId);
    } else if (!item.expanded) {
      toggleProfileCollapse(item.profileId);
    }
  });

  const chevron = document.createElement("span");
  chevron.className = "studio-tree-chevron";
  chevron.textContent = item.expanded ? "▾" : "▸";
  chevron.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "studio-tree-row-label";
  label.textContent = item.label;
  button.append(chevron, label);

  if (item.active) {
    const icon = document.createElement("span");
    icon.className = "studio-active-icon";
    icon.setAttribute("aria-label", "Default profile");
    icon.title = "Default profile";
    button.append(icon);
  }

  return button;
}

function createAnimationTreeRow(item: StudioProfileTreeAnimationItem) {
  const button = document.createElement("button");
  button.className = "studio-tree-anim-row";
  button.type = "button";
  button.dataset.depth = String(item.depth);
  button.dataset.selected = String(item.selected);
  button.addEventListener("click", () => {
    selectedProfileId = item.profileId;
    selectedAnimationName = item.animationName;
    selectedTreeItemId = item.id;
    selectedFrameIndex = 0;
    playbackPlaying = false;
    renderStudio();
  });

  const dot = document.createElement("span");
  dot.className = "studio-tree-dot";
  const label = document.createElement("span");
  label.className = "studio-tree-row-label";
  label.textContent = item.label;
  const frameCount = document.createElement("span");
  frameCount.className = "studio-tree-count";
  frameCount.textContent = item.frameCountLabel;
  button.append(dot, label, frameCount);
  return button;
}

function renderMeta() {
  metaBody.replaceChildren();
  const profile = readSelectedProfile();

  if (profile === undefined || selectedAnimationName === null) {
    metaBody.append(createEmptyState("No animation selected"));
    return;
  }

  const selectedAnimation = readSelectedAnimation(profile);

  if (selectedAnimation === undefined) {
    metaBody.append(createEmptyState("No animation selected"));
    return;
  }

  metaBody.append(
    createAnimationMetaControls(selectedAnimationName, selectedAnimation),
  );
}

function renderInspector() {
  inspectorBody.replaceChildren();
  const profile = readSelectedProfile();

  if (profile === undefined || selectedAnimationName === null) {
    inspectorBody.append(createEmptyState("No profile selected"));
    return;
  }

  const list = document.createElement("div");
  list.className = "studio-list";
  const stateName = readSelectedStateName(profile);
  const inspector = buildStudioInspector({
    profile,
    animationName: selectedAnimationName,
    selectedFrameIndex,
    selectedStateName: stateName,
  });

  list.append(
    createViewingSection(inspector.viewing),
    createStateMappingControls(profile),
    createDerivedSection(inspector.derived),
  );

  inspectorBody.append(list);
}

function createViewingSection(viewing: {
  profileName: string;
  animationName: string;
  frameLabel: string;
  framePath: string;
}) {
  const section = document.createElement("section");
  section.className = "studio-section";
  const heading = document.createElement("div");
  heading.className = "studio-section-title";
  heading.textContent = "What you're viewing";
  section.append(heading);
  section.append(
    createInspectorKeyValueRow("Profile", viewing.profileName),
    createInspectorKeyValueRow("Animation", viewing.animationName),
    createInspectorKeyValueRow("Frame", viewing.frameLabel),
  );
  const path = document.createElement("div");
  path.className = "studio-inspector-path";
  path.textContent = viewing.framePath;
  section.append(path);
  return section;
}

function createInspectorKeyValueRow(key: string, value: string) {
  const row = document.createElement("div");
  row.className = "studio-inspector-row";
  const keyElement = document.createElement("span");
  keyElement.textContent = key;
  const valueElement = document.createElement("span");
  valueElement.textContent = value;
  row.append(keyElement, valueElement);
  return row;
}

function createDerivedSection(derived: {
  frameDurationsMs: number[];
  totalDurationMs: number;
  loop: boolean;
}) {
  const section = document.createElement("section");
  section.className = "studio-section";
  const heading = document.createElement("div");
  heading.className = "studio-section-title";
  heading.textContent = "Derived";
  section.append(heading);
  const frames = document.createElement("p");
  frames.className = "studio-derived-line";
  frames.textContent = `frames: ${derived.frameDurationsMs.join("·")} ms`;
  const total = document.createElement("p");
  total.className = "studio-derived-line";
  total.textContent = `total: ${derived.totalDurationMs} ms${derived.loop ? " / loop" : ""}`;
  section.append(frames, total);
  return section;
}

function renderPreview() {
  previewBody.replaceChildren();
  const profile = readSelectedProfile();

  if (profile === undefined || selectedAnimationName === null) {
    previewBody.append(createEmptyState("No animation selected"));
    return;
  }

  const animationName = readPreviewAnimationName();

  if (animationName === null) {
    previewBody.append(createEmptyState("No mapped animation selected"));
    return;
  }

  const frameUrls = getStudioPreviewFrameUrls(profile, animationName, {
    resolveFrameUrl: resolveProfileFrameUrl,
  });
  const frameIndex = clampFrameIndex(selectedFrameIndex, frameUrls.length);
  const animation = profile.animations[animationName];
  const durations =
    animation === undefined ? [] : deriveAnimationDurations(animation);
  const duration = durations[frameIndex] ?? 0;
  const stage = document.createElement("div");
  stage.className = "studio-preview-stage";
  const overlay = document.createElement("span");
  overlay.className = "studio-preview-overlay";
  overlay.textContent = `Frame ${frameIndex + 1}/${frameUrls.length} · ${duration} ms`;
  const frame = document.createElement("img");
  frame.className = "preview-frame";
  frame.alt = animationName;
  frame.src = frameUrls[frameIndex] ?? "";
  stage.append(frame, overlay);
  previewBody.append(stage);
  refreshPlaybackTimer(profile, animationName);
}

function renderTimeline() {
  timelineBody.replaceChildren();
  const profile = readSelectedProfile();

  if (profile === undefined || selectedAnimationName === null) {
    timelineBody.append(createEmptyState("No animation selected"));
    return;
  }

  const animation = readSelectedAnimation(profile);

  if (animation === undefined) {
    timelineBody.append(createEmptyState("No animation selected"));
    return;
  }

  timelineBody.append(createTimelineControls(selectedAnimationName, animation));
}

function readSelectedProfile() {
  return profiles.find((profile) => profile.id === selectedProfileId);
}

function readSelectedAnimation(profile: AnimationProfile) {
  if (selectedAnimationName === null) {
    return undefined;
  }

  return profile.animations[selectedAnimationName];
}

function readPreviewAnimationName() {
  return selectedAnimationName;
}

function updateSelectedProfile(
  update: (profile: AnimationProfile) => AnimationProfile,
) {
  const profile = readSelectedProfile();

  if (profile === undefined) {
    return;
  }

  const updatedProfile = update(profile);
  profiles = profiles.map((candidate) =>
    candidate.id === updatedProfile.id ? updatedProfile : candidate,
  );
  selectedFrameIndex = clampSelectedFrameIndex(updatedProfile);
  renderStudio();
}

function clearPlaybackTimer() {
  if (playbackTimer === null) {
    return;
  }

  clearTimeout(playbackTimer);
  playbackTimer = null;
}

function showInfoToast(message: string) {
  showToast(message, "info");
}

function showErrorToast(message: string) {
  showToast(message, "error");
}

function showToast(message: string, kind: "info" | "error") {
  const nextToastState = enqueueStudioToast(toasts, message, { kind });
  toasts = nextToastState.toasts;
  const { toast } = nextToastState;

  renderToasts();

  if (toast.kind === "info") {
    const timer = setTimeout(() => {
      dismissToast(toast.id);
    }, STUDIO_TOAST_TIMEOUT_MS);
    toastTimers.set(toast.id, timer);
  }
}

function dismissToast(toastId: string) {
  const timer = toastTimers.get(toastId);

  if (timer !== undefined) {
    clearTimeout(timer);
    toastTimers.delete(toastId);
  }

  const exitTimer = toastExitTimers.get(toastId);

  if (exitTimer !== undefined) {
    clearTimeout(exitTimer);
    toastExitTimers.delete(toastId);
  }

  const finalizeDismiss = () => {
    toasts = dismissStudioToast(toasts, toastId);
    toastBody
      .querySelector<HTMLElement>(`[data-toast-id="${toastId}"]`)
      ?.remove();
  };

  const toastElement = toastBody.querySelector<HTMLElement>(
    `[data-toast-id="${toastId}"]`,
  );

  if (toastElement === null) {
    finalizeDismiss();
    return;
  }

  if (toastElement.dataset.leaving === "true") {
    return;
  }

  toastElement.dataset.leaving = "true";
  const nextExitTimer = setTimeout(() => {
    toastExitTimers.delete(toastId);
    finalizeDismiss();
  }, STUDIO_TOAST_EXIT_MS);
  toastExitTimers.set(toastId, nextExitTimer);
}

function renderToasts() {
  for (const toast of toasts) {
    if (toastBody.querySelector(`[data-toast-id="${toast.id}"]`) !== null) {
      continue;
    }

    toastBody.prepend(createToastElement(toast));
  }
}

function createToastElement(toast: StudioToast) {
  const item = document.createElement("div");
  item.className = "studio-toast";
  item.dataset.kind = toast.kind;
  item.dataset.toastId = toast.id;
  const message = document.createElement("span");
  message.className = "studio-toast-message";
  message.textContent = toast.message;
  item.append(message);

  if (toast.kind === "error") {
    const closeButton = document.createElement("button");
    closeButton.className = "studio-toast-close";
    closeButton.type = "button";
    closeButton.textContent = "x";
    closeButton.title = "Dismiss";
    closeButton.addEventListener("click", () => {
      dismissToast(toast.id);
    });
    item.append(closeButton);
  }

  return item;
}

function selectProfileRow(profile: AnimationProfile) {
  selectedProfileId = profile.id;
  selectedAnimationName = Object.keys(profile.animations)[0] ?? null;
  selectedTreeItemId = createProfileTreeItemId(profile.id);
  selectedFrameIndex = 0;
  playbackPlaying = false;
  renderStudio();
}

function toggleProfileCollapse(profileId: string) {
  const nextCollapsedProfileIds = new Set(collapsedProfileIds);

  if (nextCollapsedProfileIds.has(profileId)) {
    nextCollapsedProfileIds.delete(profileId);
  } else {
    nextCollapsedProfileIds.add(profileId);
  }

  collapsedProfileIds = nextCollapsedProfileIds;
  renderProfiles();
}

function createProfileTreeItemId(profileId: string) {
  return `profile:${profileId}`;
}

async function saveSelectedProfile() {
  const profile = readSelectedProfile();

  if (profile === undefined) {
    showErrorToast("No profile selected");
    return;
  }

  try {
    await window.projectCDesktop.saveProfile(validateAnimationProfile(profile));
    if (profile.id === defaultProfileId) {
      await window.projectCDesktop.applyProfile(profile.id, null);
    }
    showInfoToast("Saved");
  } catch (error) {
    showErrorToast(error instanceof Error ? error.message : "Save failed");
  }
}

async function importSpriteSetForSelectedProfile() {
  try {
    const importedProfile = await requestStudioSpriteSetImport({
      existingProfileIds: profiles.map((candidate) => candidate.id),
      confirmImport() {
        return Promise.resolve(true);
      },
      selectSourcePath() {
        return window.projectCDesktop.selectSpriteSetSourcePath();
      },
      applyImport(request) {
        return window.projectCDesktop.applySpriteSetImport(request);
      },
    });

    if (importedProfile === null) {
      return;
    }

    profiles = upsertImportedProfile(profiles, importedProfile);
    selectedProfileId = importedProfile.id;
    selectedAnimationName =
      selectedAnimationName !== null &&
      importedProfile.animations[selectedAnimationName] !== undefined
        ? selectedAnimationName
        : (Object.keys(importedProfile.animations)[0] ?? null);
    selectedTreeItemId = createProfileTreeItemId(importedProfile.id);
    collapsedProfileIds.delete(importedProfile.id);
    selectedFrameIndex = 0;
    playbackPlaying = false;
    showInfoToast(`Imported sprite-set into ${importedProfile.name}`);
  } catch (error) {
    showErrorToast(
      error instanceof Error ? error.message : "Sprite-set import failed",
    );
  }

  renderStudio();
}

async function importProfileFromChoice() {
  const choice = await openImportChoiceModal();

  if (choice === null) {
    return;
  }

  if (choice === "sprite_set") {
    await importSpriteSetForSelectedProfile();
    return;
  }

  await importProfilePackage();
}

async function importProfilePackage() {
  const selectedProfile = readSelectedProfile();

  if (selectedProfile === undefined) {
    showErrorToast("No profile selected");
    return;
  }

  try {
    const selection = await window.projectCDesktop.selectProfilePackageSource();

    if (selection === null) {
      return;
    }

    const importedProfile = await window.projectCDesktop.importProfilePackage(
      createStudioProfilePackageImportRequest({
        selectedProfile,
        sourcePath: selection.sourcePath,
        sourceType: selection.sourceType,
      }),
    );

    applyImportedProfileSelection(
      importedProfile,
      `Imported profile ${importedProfile.name}`,
    );
  } catch (error) {
    showErrorToast(
      error instanceof Error ? error.message : "Profile import failed",
    );
  }
}

async function exportSelectedProfilePackage(format: "directory" | "zip") {
  const profile = readSelectedProfile();

  if (profile === undefined) {
    showErrorToast("No profile selected");
    return;
  }

  try {
    const destinationPath =
      await window.projectCDesktop.selectProfilePackageExportPath(
        format,
        profile.name,
      );

    if (destinationPath === null) {
      return;
    }

    await window.projectCDesktop.exportProfilePackage({
      profileId: profile.id,
      destinationPath,
      format,
    });
    showInfoToast(
      format === "zip"
        ? `Exported ${profile.name} as zip`
        : `Exported ${profile.name} as folder`,
    );
  } catch (error) {
    showErrorToast(
      error instanceof Error ? error.message : "Profile export failed",
    );
  }
}

async function exportSelectedProfileFromChoice() {
  const profile = readSelectedProfile();

  if (profile === undefined) {
    showErrorToast("No profile selected");
    return;
  }

  const choice = await openExportChoiceModal(profile.name);

  if (choice === null) {
    return;
  }

  await exportSelectedProfilePackage(choice);
}

function applyImportedProfileSelection(
  importedProfile: AnimationProfile,
  toastMessage: string,
) {
  profiles = upsertImportedProfile(profiles, importedProfile);
  selectedProfileId = importedProfile.id;
  selectedAnimationName =
    selectedAnimationName !== null &&
    importedProfile.animations[selectedAnimationName] !== undefined
      ? selectedAnimationName
      : (Object.keys(importedProfile.animations)[0] ?? null);
  selectedTreeItemId = createProfileTreeItemId(importedProfile.id);
  collapsedProfileIds.delete(importedProfile.id);
  selectedFrameIndex = 0;
  playbackPlaying = false;
  showInfoToast(toastMessage);
  renderStudio();
}

function renderImportChoiceModal() {
  if (importChoiceModalState === null) {
    profileImportModalRoot.innerHTML = "";
    profileImportModalRoot.hidden = true;
    return;
  }

  profileImportModalRoot.innerHTML = renderStudioTransferModal(
    importChoiceModalState,
  );
  profileImportModalRoot.hidden = false;

  const spriteSetButton = readScopedElement<HTMLButtonElement>(
    profileImportModalRoot,
    "[data-action='confirm-import-sprite-set']",
  );
  const profileButton = readScopedElement<HTMLButtonElement>(
    profileImportModalRoot,
    "[data-action='confirm-import-profile']",
  );
  const cancelButton = readScopedElement<HTMLButtonElement>(
    profileImportModalRoot,
    "[data-action='cancel-transfer-modal']",
  );

  spriteSetButton.addEventListener("click", () => {
    closeImportChoiceModal("sprite_set");
  });
  profileButton.addEventListener("click", () => {
    closeImportChoiceModal("profile");
  });
  cancelButton.addEventListener("click", () => {
    closeImportChoiceModal(null);
  });
}

function renderExportChoiceModal() {
  if (exportChoiceModalState === null) {
    profileExportModalRoot.innerHTML = "";
    profileExportModalRoot.hidden = true;
    return;
  }

  profileExportModalRoot.innerHTML = renderStudioTransferModal(
    exportChoiceModalState,
  );
  profileExportModalRoot.hidden = false;

  const directoryButton = readScopedElement<HTMLButtonElement>(
    profileExportModalRoot,
    "[data-action='confirm-export-directory']",
  );
  const zipButton = readScopedElement<HTMLButtonElement>(
    profileExportModalRoot,
    "[data-action='confirm-export-zip']",
  );
  const cancelButton = readScopedElement<HTMLButtonElement>(
    profileExportModalRoot,
    "[data-action='cancel-transfer-modal']",
  );

  directoryButton.addEventListener("click", () => {
    closeExportChoiceModal("directory");
  });
  zipButton.addEventListener("click", () => {
    closeExportChoiceModal("zip");
  });
  cancelButton.addEventListener("click", () => {
    closeExportChoiceModal(null);
  });
}

function openImportChoiceModal() {
  if (resolveImportChoice !== null) {
    return Promise.resolve<"sprite_set" | "profile" | null>(null);
  }

  importChoiceModalState = createStudioImportChoiceModalState();
  renderImportChoiceModal();

  return new Promise<"sprite_set" | "profile" | null>((resolve) => {
    resolveImportChoice = resolve;
  });
}

function openExportChoiceModal(profileName: string) {
  if (resolveExportChoice !== null) {
    return Promise.resolve<"directory" | "zip" | null>(null);
  }

  exportChoiceModalState = createStudioExportChoiceModalState(profileName);
  renderExportChoiceModal();

  return new Promise<"directory" | "zip" | null>((resolve) => {
    resolveExportChoice = resolve;
  });
}

function closeImportChoiceModal(result: "sprite_set" | "profile" | null) {
  const resolve = resolveImportChoice;
  resolveImportChoice = null;
  importChoiceModalState = null;
  renderImportChoiceModal();
  resolve?.(result);
}

function closeExportChoiceModal(result: "directory" | "zip" | null) {
  const resolve = resolveExportChoice;
  resolveExportChoice = null;
  exportChoiceModalState = null;
  renderExportChoiceModal();
  resolve?.(result);
}

async function setSelectedProfileAsDefault() {
  const profile = readSelectedProfile();

  if (profile === undefined) {
    showErrorToast("No profile selected");
    return;
  }

  try {
    await window.projectCDesktop.saveProfile(validateAnimationProfile(profile));
    await window.projectCDesktop.applyProfile(profile.id, null);
    defaultProfileId = profile.id;
    showInfoToast("Default profile set");
  } catch (error) {
    showErrorToast(
      error instanceof Error ? error.message : "Set default profile failed",
    );
  }
}

function cloneSelectedProfile() {
  const profile = readSelectedProfile();

  if (profile === undefined) {
    return;
  }

  const clone = cloneAnimationProfile(
    profile,
    profiles.map((candidate) => candidate.id),
  );
  profiles = [...profiles, clone];
  selectedProfileId = clone.id;
  selectedAnimationName = Object.keys(clone.animations)[0] ?? null;
  selectedTreeItemId = createProfileTreeItemId(clone.id);
  collapsedProfileIds.delete(clone.id);
  selectedFrameIndex = 0;
  playbackPlaying = false;
  showInfoToast("Unsaved profile clone");
  renderStudio();
}

function upsertImportedProfile(
  currentProfiles: AnimationProfile[],
  importedProfile: AnimationProfile,
) {
  const profileIndex = currentProfiles.findIndex(
    (candidate) => candidate.id === importedProfile.id,
  );

  if (profileIndex === -1) {
    return [...currentProfiles, importedProfile];
  }

  const nextProfiles = [...currentProfiles];
  nextProfiles[profileIndex] = importedProfile;
  return nextProfiles;
}

async function deleteSelectedProfile() {
  const profile = readSelectedProfile();

  if (profile === undefined) {
    return;
  }

  if (!window.confirm(`Delete profile ${profile.name}?`)) {
    return;
  }

  await window.projectCDesktop.deleteProfile(profile.id);
  profiles = profiles.filter((candidate) => candidate.id !== profile.id);
  selectedProfileId = profiles[0]?.id ?? null;
  selectedAnimationName =
    Object.keys(readSelectedProfile()?.animations ?? {})[0] ?? null;
  selectedTreeItemId =
    selectedProfileId === null
      ? null
      : createProfileTreeItemId(selectedProfileId);
  collapsedProfileIds.delete(profile.id);
  selectedFrameIndex = 0;
  playbackPlaying = false;
  showInfoToast("Deleted");
  renderStudio();
}

function readElement<T extends HTMLElement = HTMLElement>(selector: string) {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Animation Studio element ${selector} was not found.`);
  }

  return element;
}

function readScopedElement<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string,
) {
  const element = root.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Animation Studio element ${selector} was not found.`);
  }

  return element;
}

function createEmptyState(message: string) {
  const element = document.createElement("p");
  element.className = "empty-state";
  element.textContent = message;
  return element;
}

function createAnimationMetaControls(
  animationName: string,
  animation: ProfileAnimation,
) {
  const form = document.createElement("div");
  form.className = "studio-meta";
  const meta = buildStudioMetaBar({
    animationName,
    frameCount: animation.frames.length,
    playing: playbackPlaying,
  });
  const label = document.createElement("span");
  label.className = "studio-meta-label";
  const kicker = document.createElement("span");
  kicker.className = "studio-meta-label-kicker";
  kicker.textContent = "Editing";
  const line = document.createElement("span");
  line.className = "studio-meta-label-line";
  const count = document.createElement("span");
  count.className = "studio-meta-label-count";
  count.textContent = `${animation.frames.length} frames`;
  const note = document.createElement("span");
  note.className = "studio-meta-label-note";
  note.textContent = "(preview only)";
  line.append(count, note);
  label.append(kicker, line);

  const controls = document.createElement("div");
  controls.dataset.role = "controls";
  controls.append(
    createIconButton("previous", meta.previousLabel, () => {
      movePreviewFrame("previous");
    }),
    createIconButton(
      playbackPlaying ? "pause" : "play",
      meta.playPauseLabel,
      () => {
        applyPlaybackState(
          togglePreviewPlayback({
            selectedFrameIndex,
            playing: playbackPlaying,
          }),
        );
        renderStudio();
      },
    ),
    createIconButton("next", meta.nextLabel, () => {
      movePreviewFrame("next");
    }),
  );

  form.append(label, controls);

  return form;
}

function createTimelineControls(
  animationName: string,
  animation: ProfileAnimation,
) {
  const timeline = buildStudioTimeline(animation, selectedFrameIndex);
  const container = document.createElement("div");
  container.className = "studio-timeline";
  const header = document.createElement("div");
  header.className = "studio-timeline-head";
  const tabs = document.createElement("div");
  tabs.className = "studio-timeline-tabs";
  const timelineTab = document.createElement("span");
  timelineTab.className = "studio-timeline-tab";
  timelineTab.dataset.selected = "true";
  timelineTab.textContent = "Timeline";
  tabs.append(timelineTab);
  const actions = document.createElement("div");
  actions.className = "studio-timeline-actions";
  const importButton = createButton("+ Import", () => {
    void promptAndAppendFrameBatch();
  });
  const removeButton = createButton("Remove frame", () => {
    removeSelectedTimelineFrame(animationName, animation.frames.length);
  });
  removeButton.disabled = !canRemoveAnimationFrame(animation.frames.length);
  removeButton.title = removeButton.disabled
    ? "At least one frame must remain"
    : "Remove selected frame";
  actions.append(importButton, removeButton);
  header.append(tabs, actions);
  const total = timeline.totalDurationMs;
  const ruler = document.createElement("div");
  ruler.className = "studio-timeline-ruler";
  ruler.append(
    createRulerTick("0 ms"),
    createRulerTick(`${Math.round(total * 0.25)}`),
    createRulerTick(`${Math.round(total * 0.5)}`),
    createRulerTick(`${Math.round(total * 0.75)}`),
    createRulerTick(`${total} ms`),
  );
  const frameRow = document.createElement("div");
  frameRow.className = "studio-timeline-bar";
  const weightRow = document.createElement("div");
  weightRow.className = "studio-timeline-bar";
  weightRow.dataset.row = "weights";

  for (const frame of timeline.frames) {
    frameRow.append(createTimelineFrameCell(animationName, frame));
    weightRow.append(
      createTimelineWeightCell(
        animationName,
        frame.index,
        frame.weight,
        frame.widthPercent,
        frame.selected,
      ),
    );
  }

  container.append(header, ruler, frameRow, weightRow);
  return container;
}

function createTimelineFrameCell(
  animationName: string,
  frame: ReturnType<typeof buildStudioTimeline>["frames"][number],
) {
  const cell = document.createElement("div");
  cell.className = "studio-frame-cell";
  cell.dataset.selected = String(frame.selected);
  cell.dataset.frameIndex = String(frame.index);
  cell.draggable = true;
  cell.style.flex = `${frame.widthPercent} 1 0`;
  cell.addEventListener("click", () => {
    if (suppressNextFrameClick) {
      suppressNextFrameClick = false;
      return;
    }

    applyPlaybackState(
      selectPreviewFrame({
        frameCount: readCurrentPreviewAnimation()?.frames.length ?? 0,
        frameIndex: frame.index,
      }),
    );
    renderStudio();
  });
  cell.addEventListener("dragstart", (event) => {
    draggingFrameIndex = frame.index;
    cell.dataset.dragging = "true";
    event.dataTransfer?.setData("text/plain", String(frame.index));
    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = "move";
    }
  });
  cell.addEventListener("dragend", () => {
    draggingFrameIndex = null;
    delete cell.dataset.dragging;
    delete cell.dataset.dropTarget;
  });
  cell.addEventListener("dragenter", () => {
    if (draggingFrameIndex !== null && draggingFrameIndex !== frame.index) {
      cell.dataset.dropTarget = "true";
    }
  });
  cell.addEventListener("dragleave", () => {
    delete cell.dataset.dropTarget;
  });
  cell.addEventListener("dragover", (event) => {
    if (draggingFrameIndex === null) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "move";
    }
  });
  cell.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const fromIndex = readDraggedFrameIndex(event);
    delete cell.dataset.dropTarget;
    draggingFrameIndex = null;

    if (fromIndex === null) {
      return;
    }

    suppressNextFrameClick = true;
    reorderTimelineFrame(animationName, fromIndex, frame.index);
  });

  const index = document.createElement("span");
  index.className = "studio-frame-index";
  index.textContent = frame.indexLabel;
  const preview = document.createElement("img");
  preview.className = "studio-frame-thumb";
  preview.alt = frame.indexLabel;
  preview.src = resolveProfileFrameUrl(frame.path);
  const replace = document.createElement("button");
  replace.className = "studio-button studio-frame-replace";
  replace.type = "button";
  replace.textContent = "replace";
  replace.addEventListener("click", (event) => {
    event.stopPropagation();
    void promptAndReplaceFrame(frame.index);
  });
  cell.append(index, preview, replace);
  return cell;
}

function readDraggedFrameIndex(event: DragEvent) {
  const dataTransferValue = event.dataTransfer?.getData("text/plain");
  const parsedIndex =
    dataTransferValue === undefined || dataTransferValue === ""
      ? NaN
      : Number(dataTransferValue);

  if (Number.isInteger(parsedIndex)) {
    return parsedIndex;
  }

  return draggingFrameIndex;
}

function reorderTimelineFrame(
  animationName: string,
  fromIndex: number,
  toIndex: number,
) {
  const profile = readSelectedProfile();

  if (profile === undefined || fromIndex === toIndex) {
    return;
  }

  profiles = profiles.map((candidate) =>
    candidate.id === profile.id
      ? reorderAnimationFrame(candidate, animationName, fromIndex, toIndex)
      : candidate,
  );
  selectedFrameIndex = toIndex;
  playbackPlaying = false;
  showInfoToast(createFrameMoveToastMessage(fromIndex, toIndex));
  renderStudio();
}

function removeSelectedTimelineFrame(
  animationName: string,
  frameCountBeforeRemoval: number,
) {
  if (!canRemoveAnimationFrame(frameCountBeforeRemoval)) {
    return;
  }

  const frameIndexToRemove = selectedFrameIndex;
  selectedFrameIndex = getSelectedFrameIndexAfterRemoval({
    selectedFrameIndex: frameIndexToRemove,
    frameCountBeforeRemoval,
  });
  playbackPlaying = false;
  updateSelectedProfile((profile) =>
    removeAnimationFrame(profile, animationName, frameIndexToRemove),
  );
}

function createTimelineWeightCell(
  animationName: string,
  frameIndex: number,
  weight: number,
  widthPercent: number,
  active: boolean,
) {
  const wrapper = document.createElement("div");
  wrapper.className = "studio-weight-row";
  wrapper.style.flex = `${widthPercent} 1 0`;
  wrapper.dataset.active = String(active);
  const decrease = createButton("◀", () => {
    updateSelectedProfile((profile) =>
      setAnimationFrameWeight(
        profile,
        animationName,
        frameIndex,
        Math.max(1, weight - 1),
      ),
    );
  });
  const label = document.createElement("span");
  label.className = "studio-weight-label";
  label.textContent = `w=${weight}`;
  const increase = createButton("▶", () => {
    updateSelectedProfile((profile) =>
      setAnimationFrameWeight(profile, animationName, frameIndex, weight + 1),
    );
  });
  wrapper.append(decrease, label, increase);
  return wrapper;
}

async function promptAndReplaceFrame(frameIndex: number) {
  const [sourcePath] = await selectProfileAssetPaths(false);

  if (sourcePath === undefined) {
    return;
  }

  await replaceFrameFromSourcePath(frameIndex, sourcePath);
}

async function promptAndAppendFrameBatch() {
  const sourcePaths = await selectProfileAssetPaths(true);

  if (sourcePaths.length === 0) {
    return;
  }

  for (const sourcePath of sourcePaths) {
    await appendFrameFromSourcePath(sourcePath);
  }
}

async function selectProfileAssetPaths(multiple: boolean) {
  return window.projectCDesktop.selectProfileAssetPaths({ multiple });
}

async function replaceFrameFromSourcePath(
  frameIndex: number,
  sourcePath: string,
) {
  const profile = readSelectedProfile();
  const animationName = selectedAnimationName;

  if (profile === undefined || animationName === null) {
    return;
  }

  const importedPath = await window.projectCDesktop.importProfileAsset(
    profile.id,
    sourcePath,
  );
  updateSelectedProfile((currentProfile) =>
    replaceAnimationFrame(
      currentProfile,
      animationName,
      frameIndex,
      importedPath,
    ),
  );
  const message = `Imported ${formatSourcePath(sourcePath)} as ${formatProfileAssetPath(importedPath)}`;
  showInfoToast(message);
}

async function appendFrameFromSourcePath(sourcePath: string) {
  const profile = readSelectedProfile();
  const animationName = selectedAnimationName;

  if (profile === undefined || animationName === null) {
    return;
  }

  const importedPath = await window.projectCDesktop.importProfileAsset(
    profile.id,
    sourcePath,
  );
  updateSelectedProfile((currentProfile) =>
    addAnimationFrame(currentProfile, animationName, importedPath),
  );
  const message = `Imported ${formatSourcePath(sourcePath)} as ${formatProfileAssetPath(importedPath)}`;
  showInfoToast(message);
}

function movePreviewFrame(direction: "previous" | "next") {
  const animation = readCurrentPreviewAnimation();

  if (animation === undefined) {
    return;
  }

  applyPlaybackState(
    direction === "previous"
      ? moveToPreviousFrame({
          frameCount: animation.frames.length,
          selectedFrameIndex,
        })
      : moveToNextFrame({
          frameCount: animation.frames.length,
          selectedFrameIndex,
        }),
  );
  renderStudio();
}

function applyPlaybackState(state: StudioPlaybackState) {
  selectedFrameIndex = state.selectedFrameIndex;
  playbackPlaying = state.playing;
  playbackEpoch += 1;

  if (!playbackPlaying) {
    clearPlaybackTimer();
  }
}

function readCurrentPreviewAnimation() {
  const profile = readSelectedProfile();

  if (profile === undefined) {
    return undefined;
  }

  const animationName = readPreviewAnimationName();

  if (animationName === null) {
    return undefined;
  }

  return profile.animations[animationName];
}

function refreshPlaybackTimer(
  profile: AnimationProfile,
  animationName: string,
) {
  clearPlaybackTimer();

  if (!playbackPlaying) {
    return;
  }

  const animation = profile.animations[animationName];

  if (animation === undefined || animation.frames.length <= 1) {
    return;
  }

  const durations = deriveAnimationDurations(animation);
  const duration =
    durations[clampFrameIndex(selectedFrameIndex, durations.length)] ?? 1;
  const scheduledPlaybackEpoch = playbackEpoch;
  playbackTimer = setTimeout(() => {
    const nextPlaybackState = advanceScheduledPlayback({
      frameCount: animation.frames.length,
      selectedFrameIndex,
      playing: playbackPlaying,
      scheduledPlaybackEpoch,
      currentPlaybackEpoch: playbackEpoch,
    });

    if (nextPlaybackState === null) {
      return;
    }

    applyPlaybackState(nextPlaybackState);
    renderStudio();
  }, duration);
}

function createStateMappingControls(profile: AnimationProfile) {
  const form = document.createElement("div");
  form.className = "studio-form studio-section";
  form.dataset.tone = "accent";
  const stateName = readSelectedStateName(profile);
  const animationName = selectedAnimationName;
  const animation =
    animationName === null ? undefined : profile.animations[animationName];
  const heading = document.createElement("div");
  heading.className = "studio-section-title";
  heading.textContent = buildStatePolicySectionTitle(stateName);

  form.append(heading);

  if (animationName !== null && animation !== undefined) {
    form.append(
      createNumberField(
        "Duration (ms)",
        animation.totalDurationMs,
        (totalDurationMs) => {
          updateSelectedProfile((currentProfile) =>
            updateAnimationTiming(currentProfile, animationName, {
              totalDurationMs,
            }),
          );
        },
        { helpText: STATE_POLICY_FIELD_HELP.durationMs },
      ),
    );

    if (shouldShowStudioLoopControl(animationName, stateName)) {
      form.append(
        createCheckboxField(
          "Loop",
          animation.loop,
          (loop) => {
            updateSelectedProfile((currentProfile) =>
              setAnimationLoop(currentProfile, animationName, loop),
            );
          },
          { helpText: STATE_POLICY_FIELD_HELP.loop },
        ),
      );
    }
  }

  if (stateName === null) {
    const note = document.createElement("p");
    note.className = "studio-presentation-note";
    note.textContent =
      "Reserved transition animation. It is not mapped to a state policy.";
    form.append(note);
    return form;
  }

  const mapping = profile.states[stateName];

  form.append(
    createCheckboxField(
      "Interruptible",
      mapping?.interruptible ?? true,
      (interruptible) => {
        updateSelectedProfile((currentProfile) =>
          updateStatePolicy(currentProfile, stateName, {
            interruptible,
          }),
        );
      },
      { helpText: STATE_POLICY_FIELD_HELP.interruptible },
    ),
  );

  if (shouldShowStudioMinDwellControl(mapping?.interruptible ?? true)) {
    form.append(
      createNumberField(
        "Min Dwell (ms)",
        mapping?.minDwellMs ?? 0,
        (minDwellMs) => {
          updateSelectedProfile((currentProfile) =>
            updateStatePolicy(currentProfile, stateName, {
              minDwellMs,
            }),
          );
        },
        { helpText: STATE_POLICY_FIELD_HELP.minDwellMs },
      ),
    );
  }

  if (isInteractionPackState(stateName)) {
    form.append(
      createCheckboxField(
        "Allow During Hook Activity",
        mapping?.allowDuringHookActivity ?? false,
        (allowDuringHookActivity) => {
          updateSelectedProfile((currentProfile) =>
            updateStatePolicy(currentProfile, stateName, {
              allowDuringHookActivity,
            }),
          );
        },
        { helpText: STATE_POLICY_FIELD_HELP.allowDuringHookActivity },
      ),
    );
  }

  if (isTransientInteractionPackState(stateName)) {
    form.append(
      createCheckboxField(
        "Hold Last Frame",
        mapping?.holdLastFrame ?? false,
        (holdLastFrame) => {
          updateSelectedProfile((currentProfile) =>
            updateStatePolicy(currentProfile, stateName, {
              holdLastFrame,
            }),
          );
        },
        { helpText: STATE_POLICY_FIELD_HELP.holdLastFrame },
      ),
    );
  }

  return form;
}

function createProfileInfoSection(profile: AnimationProfile) {
  const section = document.createElement("section");
  section.className = "studio-section";
  const heading = document.createElement("div");
  heading.className = "studio-section-title";
  heading.textContent = "Profile info";
  section.append(
    heading,
    createEditableInfoRow("Name", profile.name, (name) => {
      updateSelectedProfile((currentProfile) =>
        renameAnimationProfile(currentProfile, name),
      );
    }),
    createInfoRow("ID", profile.id, true),
    createInfoRow("Sprite root", profile.spriteRoot),
  );
  return section;
}

function createEditableInfoRow(
  label: string,
  value: string,
  onChange: (value: string) => void,
) {
  const row = document.createElement("label");
  row.className = "studio-info-row studio-info-row-editable";
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const input = document.createElement("input");
  input.value = value;
  input.addEventListener("change", () => {
    const name = input.value.trim();

    if (name !== "") {
      onChange(name);
    } else {
      input.value = value;
    }
  });
  row.append(labelElement, input);
  return row;
}

function createInfoRow(label: string, value: string, mono = false) {
  const row = document.createElement("div");
  row.className = "studio-info-row";
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const valueElement = document.createElement("span");
  valueElement.textContent = value;
  valueElement.className = mono ? "studio-mono" : "";
  row.append(labelElement, valueElement);
  return row;
}

function createButton(label: string, onClick: () => void) {
  const button = document.createElement("button");
  button.className = "studio-button";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createIconButton(
  icon: "next" | "pause" | "play" | "previous",
  label: string,
  onClick: () => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  let pointerActivated = false;
  button.className = "studio-button studio-icon-button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.dataset.icon = icon;
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    pointerActivated = true;
    event.preventDefault();
    onClick();
  });
  button.addEventListener("click", (event) => {
    if (
      !shouldHandlePreviewControlClick({
        clickDetail: event.detail,
        pointerActivated,
      })
    ) {
      pointerActivated = false;
      return;
    }

    pointerActivated = false;
    onClick();
  });
  const glyph = document.createElement("span");
  glyph.className = "studio-icon";
  glyph.setAttribute("aria-hidden", "true");
  button.append(glyph);
  return button;
}

function createRulerTick(label: string) {
  const tick = document.createElement("span");
  tick.textContent = label;
  return tick;
}

function readSelectedStateName(
  profile: AnimationProfile,
): ProfileStateName | null {
  const foundEntry = Object.entries(profile.states).find(
    ([, mapping]) => mapping?.animation === selectedAnimationName,
  );

  return (foundEntry?.[0] as ProfileStateName | undefined) ?? null;
}

function createNumberField(
  label: string,
  value: number,
  onChange: (value: number) => void,
  options: { helpText?: string; suffix?: string } = {},
) {
  const field = document.createElement("label");
  field.className = "studio-field";
  const labelText = createFieldLabel(label, options.helpText);
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.value = String(value);
  input.addEventListener("change", () => {
    onChange(Number(input.value));
  });
  field.append(labelText);
  if (options.suffix !== undefined) {
    const row = document.createElement("span");
    row.className = "studio-field-inline";
    row.style.padding = "0";
    const suffix = document.createElement("span");
    suffix.className = "studio-field-suffix";
    suffix.textContent = options.suffix;
    row.append(input, suffix);
    field.append(row);
  } else {
    field.append(input);
  }
  return field;
}

function createCheckboxField(
  label: string,
  checked: boolean,
  onChange: (value: boolean) => void,
  options: { helpText?: string } = {},
) {
  const field = document.createElement("label");
  field.className = "studio-field studio-row-field";
  const labelText = createFieldLabel(label, options.helpText);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => {
    onChange(input.checked);
  });
  field.append(labelText, input);
  return field;
}

function createFieldLabel(label: string, helpText?: string) {
  const labelText = document.createElement("span");
  labelText.textContent = label;

  if (helpText !== undefined) {
    labelText.className = "studio-help";
    labelText.title = helpText;
    labelText.setAttribute("aria-label", `${label}: ${helpText}`);
  }

  return labelText;
}

function createToggle(checked: boolean, onChange: (value: boolean) => void) {
  const toggle = document.createElement("span");
  toggle.className = "studio-toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => {
    onChange(input.checked);
  });
  toggle.addEventListener("click", (event) => {
    if (event.target === input) {
      return;
    }
    input.click();
  });
  const track = document.createElement("span");
  track.className = "studio-toggle-track";
  const thumb = document.createElement("span");
  thumb.className = "studio-toggle-thumb";
  toggle.append(input, track, thumb);
  return toggle;
}

function clampSelectedFrameIndex(profile: AnimationProfile) {
  const animation = readSelectedAnimation(profile);

  if (animation === undefined) {
    return 0;
  }

  return clampFrameIndex(selectedFrameIndex, animation.frames.length);
}

function resolveProfileFrameUrl(framePath: string): string {
  return resolveGpchanBundledFrameUrl(framePath) ?? framePath;
}

function formatSourcePath(sourcePath: string) {
  return (
    sourcePath.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ??
    sourcePath
  );
}
