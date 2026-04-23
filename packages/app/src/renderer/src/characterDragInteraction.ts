export interface FinishCharacterDragInteractionOptions {
  isDragging: boolean;
  didDragMove: boolean;
  triggerClickWhenStationary?: boolean;
}

export interface FinishCharacterDragInteractionResult {
  isDragging: boolean;
  didDragMove: boolean;
  endedWithMovement: boolean;
  shouldClearInteraction: boolean;
  shouldTriggerClick: boolean;
}

export function finishCharacterDragInteraction({
  isDragging,
  didDragMove,
  triggerClickWhenStationary = true,
}: FinishCharacterDragInteractionOptions): FinishCharacterDragInteractionResult {
  if (!isDragging) {
    return {
      isDragging,
      didDragMove,
      endedWithMovement: false,
      shouldClearInteraction: false,
      shouldTriggerClick: false,
    };
  }

  return {
    isDragging: false,
    didDragMove: false,
    endedWithMovement: didDragMove,
    shouldClearInteraction: didDragMove,
    shouldTriggerClick: !didDragMove && triggerClickWhenStationary,
  };
}
