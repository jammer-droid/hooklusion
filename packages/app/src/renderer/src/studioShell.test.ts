import { describe, expect, it } from "vitest";

import { buildAnimationStudioHtml } from "./studioShell.js";

describe("buildAnimationStudioHtml", () => {
  it("uses the B-direction studio regions", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain('data-region="left"');
    expect(html).toContain('data-region="center-meta"');
    expect(html).toContain('data-region="center-preview"');
    expect(html).toContain('data-region="center-timeline"');
    expect(html).toContain('data-region="right"');
    expect(html).not.toContain('data-region="right-sandbox"');
  });

  it("uses the specified desktop grid columns", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain("grid-template-columns: 260px minmax(0, 1fr) 300px");
  });

  it("uses the B-reference flat studio palette", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain("--studio-bg: #fbfaf7");
    expect(html).toContain("--studio-panel: #ffffff");
    expect(html).toContain("--studio-panel-alt: #f4f2ed");
    expect(html).toContain("--studio-line: #d9d5cb");
    expect(html).toContain("--studio-accent: oklch(0.62 0.14 30)");
  });

  it("keeps panes dense and flat instead of card-like", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain("border-radius: 3px");
    expect(html).toContain("gap: 0");
    expect(html).toContain("padding: 0");
  });

  it("allows overflowing studio content to scroll", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain("overflow: auto");
    expect(html).toContain("min-height: 100vh");
  });

  it("includes tooltip styling for studio field help", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain(".studio-help");
  });

  it("keeps the inspector width fixed and wraps long derived lines", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain("grid-template-columns: 260px minmax(0, 1fr) 300px");
    expect(html).toContain(".studio-derived-line");
    expect(html).toContain("overflow-wrap: anywhere");
  });

  it("lets compact toggles pass clicks to their hidden checkbox", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain(".studio-toggle-track,");
    expect(html).toContain("pointer-events: none");
  });

  it("uses an icon class for active profiles instead of text badges", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain(".studio-active-icon");
  });

  it("labels the profile header action as duplicate instead of new", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain('aria-label="Duplicate profile"');
    expect(html).toContain('title="Duplicate"');
    expect(html).not.toContain('aria-label="Add profile"');
  });

  it("adds import to the profile header before duplicate", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain('data-role="import-profile"');
    expect(html).toContain('aria-label="Import profile"');
    expect(
      html.indexOf('data-role="import-profile"') <
        html.indexOf('data-role="add-profile"'),
    ).toBeTruthy();
  });

  it("centers the profile header icon inside its button", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain(".studio-button.studio-head-button svg");
    expect(html).toContain("display: block");
  });

  it("defines left and right profile action groups inside the action row", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain(".studio-profile-actions-group");
    expect(html).toContain('[data-align="start"]');
    expect(html).toContain('[data-align="end"]');
  });

  it("includes dedicated import and export modal roots", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain('data-role="profile-import-modal"');
    expect(html).toContain('data-role="profile-export-modal"');
    expect(html).toContain(".studio-modal-root");
    expect(html).toContain(".studio-modal-card");
  });

  it("styles modal action buttons as thin inline controls", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain(
      '.studio-modal-actions .studio-button[data-tone="thin"]',
    );
    expect(html).toContain("min-height: 24px");
    expect(html).toContain("width: auto");
  });

  it("animates toasts in from the right and out downward with fade", () => {
    const html = buildAnimationStudioHtml();

    expect(html).toContain("@keyframes studio-toast-enter");
    expect(html).toContain("translateX(24px)");
    expect(html).toContain("@keyframes studio-toast-exit");
    expect(html).toContain("translateY(16px)");
    expect(html).toContain("opacity: 0");
    expect(html).toContain('.studio-toast[data-leaving="true"]');
  });
});
