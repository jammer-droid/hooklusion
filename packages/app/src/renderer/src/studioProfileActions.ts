export type StudioProfileActionId = "default" | "delete" | "export" | "save";

export const PROFILE_ACTION_LAYOUT: Readonly<{
  start: readonly StudioProfileActionId[];
  end: readonly StudioProfileActionId[];
}> = {
  start: ["default", "export"],
  end: ["save", "delete"],
};
