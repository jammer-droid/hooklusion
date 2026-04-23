export interface BuildStudioMetaBarOptions {
  animationName: string;
  frameCount: number;
  playing: boolean;
}

export interface StudioMetaBar {
  editingLabel: string;
  playPauseLabel: "Play" | "Pause";
  previousLabel: "Prev frame";
  nextLabel: "Next";
}

export function buildStudioMetaBar({
  animationName,
  frameCount,
  playing,
}: BuildStudioMetaBarOptions): StudioMetaBar {
  return {
    editingLabel: `Editing · ${animationName} · ${frameCount} frames`,
    playPauseLabel: playing ? "Pause" : "Play",
    previousLabel: "Prev frame",
    nextLabel: "Next",
  };
}
