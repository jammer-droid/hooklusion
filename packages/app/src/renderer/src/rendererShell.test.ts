import { describe, expect, it } from "vitest";

import { buildCharacterRendererHtml } from "./rendererShell.js";

describe("buildCharacterRendererHtml", () => {
  it("removes browser scrollbars from the transparent character window", () => {
    const html = buildCharacterRendererHtml();

    expect(html).toContain("html, body, #app");
    expect(html).toContain("margin: 0");
    expect(html).toContain("overflow: hidden");
    expect(html).toContain("height: 100vh");
    expect(html).not.toContain("min-height: 100vh");
  });

  it("keeps the renderer background transparent", () => {
    const html = buildCharacterRendererHtml();

    expect(html).toContain("background: transparent");
    expect(html).not.toContain("linear-gradient");
  });

  it("removes the development text chrome from the character window", () => {
    const html = buildCharacterRendererHtml();

    expect(html).not.toContain("hooklusion");
    expect(html).not.toContain("Click to toggle move mode");
    expect(html).not.toContain('id="character-state"');
  });

  it("does not rely on webkit app-region drag now that dragging is manual", () => {
    const html = buildCharacterRendererHtml();

    expect(html).not.toContain("-webkit-app-region");
    expect(html).not.toContain("data-move-mode");
  });

  it("shows a hover outline when the pointer is over the character window", () => {
    const html = buildCharacterRendererHtml();

    expect(html).toContain('data-role="character-hover-outline"');
    expect(html).toContain('body[data-hovering="true"]');
  });

  it("shows a focused outline without inner edge shading or a filled backdrop card", () => {
    const html = buildCharacterRendererHtml();

    expect(html).toContain('data-role="character-focus-backdrop"');
    expect(html).toContain('body[data-focused="true"]');
    expect(html).not.toContain("background: rgba(255, 245, 236, 0.78)");
    expect(html).toContain("box-shadow: 0 0 0 2px rgba(255, 188, 124, 0.42)");
    expect(html).not.toContain("0 16px 38px");
    expect(html).not.toContain("border: 2px solid rgba(255, 188, 124, 0.42)");
  });

  it("strengthens the focused backdrop while a drag is in progress", () => {
    const html = buildCharacterRendererHtml();

    expect(html).toContain('body[data-dragging="true"]');
  });

  it("exposes four corner resize handles with appropriate resize cursors", () => {
    const html = buildCharacterRendererHtml();

    expect(html).toContain('data-role="character-resize-handle"');
    expect(html).toContain("background: transparent");
    expect(html).toContain('data-corner="nw"');
    expect(html).toContain('data-corner="ne"');
    expect(html).toContain('data-corner="sw"');
    expect(html).toContain('data-corner="se"');
    expect(html).toContain("nwse-resize");
    expect(html).toContain("nesw-resize");
  });

  it("marks the character frame as a grab-cursor drag target", () => {
    const html = buildCharacterRendererHtml();

    expect(html).toContain('data-role="character-frame"');
    expect(html).toContain("cursor: grab");
  });
});
