import type {
  DirectionalDragInteractionPackStateName,
  DragInteractionPackStateName,
  PackStateName,
} from "../../shared/packState.js";

export type DragDirection = "up" | "down" | "left" | "right";

export interface ResolveDirectionalDragStateOptions {
  deltaX: number;
  deltaY: number;
  lastDirection: DragDirection | null;
  availableStates: readonly PackStateName[];
  thresholdPx?: number;
}

export interface ResolvedDirectionalDragState {
  direction: DragDirection | null;
  interactionState: DragInteractionPackStateName;
}

const DEFAULT_DRAG_DIRECTION_THRESHOLD_PX = 8;

const DRAG_DIRECTION_TO_STATE: Record<
  DragDirection,
  DirectionalDragInteractionPackStateName
> = {
  up: "drag_up",
  down: "drag_down",
  left: "drag_left",
  right: "drag_right",
};

export function resolveDirectionalDragState({
  deltaX,
  deltaY,
  lastDirection,
  availableStates,
  thresholdPx = DEFAULT_DRAG_DIRECTION_THRESHOLD_PX,
}: ResolveDirectionalDragStateOptions): ResolvedDirectionalDragState {
  const nextDirection =
    readDragDirection(deltaX, deltaY, thresholdPx) ?? lastDirection;

  if (nextDirection === null) {
    return {
      direction: null,
      interactionState: "drag",
    };
  }

  const directionalState = DRAG_DIRECTION_TO_STATE[nextDirection];

  return {
    direction: nextDirection,
    interactionState: availableStates.includes(directionalState)
      ? directionalState
      : "drag",
  };
}

function readDragDirection(
  deltaX: number,
  deltaY: number,
  thresholdPx: number,
): DragDirection | null {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < thresholdPx) {
    return null;
  }

  if (Math.abs(deltaY) >= Math.abs(deltaX)) {
    return deltaY < 0 ? "up" : "down";
  }

  return deltaX < 0 ? "left" : "right";
}
