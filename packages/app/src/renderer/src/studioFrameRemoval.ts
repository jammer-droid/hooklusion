export function canRemoveAnimationFrame(frameCount: number) {
  return frameCount > 1;
}

export function getSelectedFrameIndexAfterRemoval({
  selectedFrameIndex,
  frameCountBeforeRemoval,
}: {
  selectedFrameIndex: number;
  frameCountBeforeRemoval: number;
}) {
  const frameCountAfterRemoval = Math.max(0, frameCountBeforeRemoval - 1);

  if (frameCountAfterRemoval === 0) {
    return 0;
  }

  return Math.min(selectedFrameIndex, frameCountAfterRemoval - 1);
}
