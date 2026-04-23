import {
  type AnimationProfile,
  PROFILE_TRANSITION_ANIMATION_NAMES,
} from "../../shared/animationProfile.js";
import {
  CANONICAL_PACK_STATES,
  type DirectionalDragInteractionPackStateName,
  EXTENDED_TOOL_PACK_STATES,
  INTERACTION_PACK_STATES,
  type InteractionPackStateName,
  type PackStateName,
} from "../../shared/packState.js";

export type StudioProfileTreeItem =
  | StudioProfileTreeProfileItem
  | StudioProfileTreeSubheaderItem
  | StudioProfileTreeDividerItem
  | StudioProfileTreeAnimationItem;

export interface BuildStudioProfileTreeOptions {
  profiles: AnimationProfile[];
  selectedProfileId: string | null;
  selectedAnimationName: string | null;
  activeProfileId: string | null;
  selectedTreeItemId?: string | null;
  collapsedProfileIds?: string[];
}

export interface StudioProfileTreeProfileItem {
  kind: "profile";
  id: string;
  profileId: string;
  label: string;
  selected: boolean;
  active: boolean;
  expanded: boolean;
}

export interface StudioProfileTreeSubheaderItem {
  kind: "subheader";
  id: string;
  profileId: string;
  label:
    | "Basic behavior"
    | "Interaction"
    | "Drag directions"
    | "Transitions"
    | "Ext animations";
  depth: 1 | 2;
}

export interface StudioProfileTreeDividerItem {
  kind: "divider";
  id: string;
  profileId: string;
}

export interface StudioProfileTreeAnimationItem {
  kind: "animation";
  id: string;
  profileId: string;
  animationName: string;
  label: string;
  frameCountLabel: string;
  selected: boolean;
  depth: 2 | 3;
}

const PRIMARY_INTERACTION_PACK_STATES: InteractionPackStateName[] = [
  "hover_in",
  "hover_out",
  "click",
  "drag",
];

const DIRECTIONAL_DRAG_PACK_STATES: DirectionalDragInteractionPackStateName[] =
  ["drag_up", "drag_down", "drag_left", "drag_right"];

export function buildStudioProfileTree({
  profiles,
  selectedProfileId,
  selectedAnimationName,
  activeProfileId,
  selectedTreeItemId,
  collapsedProfileIds = [],
}: BuildStudioProfileTreeOptions): StudioProfileTreeItem[] {
  const items: StudioProfileTreeItem[] = [];
  const collapsedProfiles = new Set(collapsedProfileIds);

  for (const profile of profiles) {
    const profileItemId = `profile:${profile.id}`;
    const expanded = !collapsedProfiles.has(profile.id);
    items.push({
      kind: "profile",
      id: profileItemId,
      profileId: profile.id,
      label: profile.name,
      selected:
        selectedTreeItemId === undefined
          ? profile.id === selectedProfileId && selectedAnimationName === null
          : selectedTreeItemId === profileItemId,
      active: profile.id === activeProfileId,
      expanded,
    });

    if (!expanded) {
      continue;
    }

    items.push({
      kind: "subheader",
      id: `profile:${profile.id}:basic`,
      profileId: profile.id,
      label: "Basic behavior",
      depth: 1,
    });

    for (const animationName of readBasicAnimationNames(profile)) {
      items.push(
        createAnimationItem({
          profile,
          animationName,
          selectedAnimationName,
          selectedProfileId,
          selectedTreeItemId,
          depth: 2,
        }),
      );
    }

    const primaryInteractionAnimationNames = readAnimationNamesForStates(
      profile,
      PRIMARY_INTERACTION_PACK_STATES,
    );
    const directionalDragAnimationNames = readAnimationNamesForStates(
      profile,
      DIRECTIONAL_DRAG_PACK_STATES,
    );
    const transitionAnimationNames = readTransitionAnimationNames(profile);
    const extensionAnimationNames = readExtensionAnimationNames(profile);

    if (
      primaryInteractionAnimationNames.length > 0 ||
      directionalDragAnimationNames.length > 0
    ) {
      items.push({
        kind: "divider",
        id: `profile:${profile.id}:divider`,
        profileId: profile.id,
      });

      items.push({
        kind: "subheader",
        id: `profile:${profile.id}:interaction`,
        profileId: profile.id,
        label: "Interaction",
        depth: 1,
      });

      for (const animationName of primaryInteractionAnimationNames) {
        items.push(
          createAnimationItem({
            profile,
            animationName,
            selectedAnimationName,
            selectedProfileId,
            selectedTreeItemId,
            depth: 2,
          }),
        );
      }

      if (directionalDragAnimationNames.length > 0) {
        items.push({
          kind: "subheader",
          id: `profile:${profile.id}:interaction:drag-directions`,
          profileId: profile.id,
          label: "Drag directions",
          depth: 2,
        });

        for (const animationName of directionalDragAnimationNames) {
          items.push(
            createAnimationItem({
              profile,
              animationName,
              selectedAnimationName,
              selectedProfileId,
              selectedTreeItemId,
              depth: 3,
            }),
          );
        }
      }
    }

    if (transitionAnimationNames.length > 0) {
      items.push({
        kind: "divider",
        id:
          primaryInteractionAnimationNames.length > 0 ||
          directionalDragAnimationNames.length > 0
            ? `profile:${profile.id}:divider:transitions`
            : `profile:${profile.id}:divider`,
        profileId: profile.id,
      });

      items.push({
        kind: "subheader",
        id: `profile:${profile.id}:transitions`,
        profileId: profile.id,
        label: "Transitions",
        depth: 1,
      });

      for (const animationName of transitionAnimationNames) {
        items.push(
          createAnimationItem({
            profile,
            animationName,
            selectedAnimationName,
            selectedProfileId,
            selectedTreeItemId,
            depth: 2,
          }),
        );
      }
    }

    if (extensionAnimationNames.length > 0) {
      items.push({
        kind: "divider",
        id:
          primaryInteractionAnimationNames.length > 0 ||
          directionalDragAnimationNames.length > 0 ||
          transitionAnimationNames.length > 0
            ? `profile:${profile.id}:divider:ext`
            : `profile:${profile.id}:divider`,
        profileId: profile.id,
      });

      items.push({
        kind: "subheader",
        id: `profile:${profile.id}:ext`,
        profileId: profile.id,
        label: "Ext animations",
        depth: 1,
      });

      for (const animationName of extensionAnimationNames) {
        items.push(
          createAnimationItem({
            profile,
            animationName,
            selectedAnimationName,
            selectedProfileId,
            selectedTreeItemId,
            depth: 2,
          }),
        );
      }
    }
  }

  return items;
}

function readBasicAnimationNames(profile: AnimationProfile) {
  return readAnimationNamesForStates(profile, CANONICAL_PACK_STATES);
}

function readInteractionAnimationNames(profile: AnimationProfile) {
  return readAnimationNamesForStates(profile, INTERACTION_PACK_STATES);
}
function readExtensionAnimationNames(profile: AnimationProfile) {
  const hiddenAnimationNames = new Set(["tool_bash"]);
  const basicAnimationNames = readBasicAnimationNames(profile);
  const interactionAnimationNames = readInteractionAnimationNames(profile);
  const transitionAnimationNames = readTransitionAnimationNames(profile);
  const mappedExtensionAnimationNames = readAnimationNamesForStates(
    profile,
    EXTENDED_TOOL_PACK_STATES,
  ).filter(
    (animationName, index, items) =>
      !hiddenAnimationNames.has(animationName) &&
      !basicAnimationNames.includes(animationName) &&
      !interactionAnimationNames.includes(animationName) &&
      items.indexOf(animationName) === index,
  );
  const mappedAnimationNames = new Set([
    ...basicAnimationNames,
    ...interactionAnimationNames,
    ...transitionAnimationNames,
    ...mappedExtensionAnimationNames,
  ]);

  const remainingAnimationNames = Object.keys(profile.animations).filter(
    (animationName) =>
      !hiddenAnimationNames.has(animationName) &&
      !mappedAnimationNames.has(animationName),
  );

  return [...mappedExtensionAnimationNames, ...remainingAnimationNames];
}

function readTransitionAnimationNames(profile: AnimationProfile) {
  return PROFILE_TRANSITION_ANIMATION_NAMES.filter(
    (animationName) => profile.animations[animationName] !== undefined,
  );
}

function readAnimationNamesForStates(
  profile: AnimationProfile,
  stateNames: readonly PackStateName[],
) {
  const animationNames: string[] = [];
  const seenAnimationNames = new Set<string>();

  for (const stateName of stateNames) {
    const animationName = profile.states[stateName]?.animation;
    if (animationName === undefined || seenAnimationNames.has(animationName)) {
      continue;
    }
    if (profile.animations[animationName] === undefined) {
      continue;
    }

    seenAnimationNames.add(animationName);
    animationNames.push(animationName);
  }

  return animationNames;
}

function createAnimationItem({
  profile,
  animationName,
  selectedAnimationName,
  selectedProfileId,
  selectedTreeItemId,
  depth,
}: {
  profile: AnimationProfile;
  animationName: string;
  selectedAnimationName: string | null;
  selectedProfileId: string | null;
  selectedTreeItemId?: string | null;
  depth: 2 | 3;
}): StudioProfileTreeAnimationItem {
  const animation = profile.animations[animationName];

  if (animation === undefined) {
    throw new Error(`Animation ${animationName} was not found.`);
  }

  const animationItemId = `profile:${profile.id}:animation:${animationName}`;
  return {
    kind: "animation",
    id: animationItemId,
    profileId: profile.id,
    animationName,
    label: animationName,
    frameCountLabel: `${animation.frames.length}f`,
    depth,
    selected:
      selectedTreeItemId === undefined
        ? profile.id === selectedProfileId &&
          animationName === selectedAnimationName
        : selectedTreeItemId === animationItemId,
  };
}
