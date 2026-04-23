import { describe, expect, it } from "vitest";

import {
  buildSetupHtml,
  readProviderToggleLabel,
  renderSetupActions,
  renderSetupManualPrompt,
  renderSetupProjects,
  renderSetupSmokeModal,
  renderSetupStatus,
} from "./setupShell.js";

describe("buildSetupHtml", () => {
  it("renders the setup status, project list, actions, and manual sections", () => {
    const html = buildSetupHtml();

    expect(html).toContain('data-region="setup-status"');
    expect(html).toContain('data-region="setup-projects"');
    expect(html).toContain('data-region="setup-actions"');
    expect(html).toContain('data-region="setup-manual"');
    expect(html).toContain('data-role="setup-smoke-modal"');
  });

  it("uses pointer cursor, selected row styling, and roomy project spacing", () => {
    const html = buildSetupHtml();

    expect(html).toContain("cursor: pointer");
    expect(html).toContain('.setup-project-row[data-selected="true"]');
    expect(html).toContain("overflow-wrap: anywhere");
    expect(html).toContain("margin-top: 18px");
  });

  it("wraps manual prompt text instead of creating horizontal overflow", () => {
    const html = buildSetupHtml();

    expect(html).toContain("white-space: pre-wrap");
    expect(html).toContain("word-break: break-word");
    expect(html).toContain("overflow-x: hidden");
  });

  it("renders project rows with selected state and hook badges", () => {
    const html = renderSetupProjects(
      [
        {
          projectRoot: "/tmp/project-a",
          claudeInstalled: true,
          codexInstalled: false,
          lastSetupAt: null,
          lastSmokeTestAt: null,
          lastSmokeTestStatus: null,
        },
      ],
      "/tmp/project-a",
    );

    expect(html).toContain("/tmp/project-a");
    expect(html).toContain('data-selected="true"');
    expect(html).toContain("setup-project-badge");
    expect(html).toContain("Claude");
  });

  it("renders status details for the selected project", () => {
    const html = renderSetupStatus({
      projectRoot: "/tmp/project-a",
      claudeInstalled: true,
      codexInstalled: true,
      lastSetupAt: "2026-04-22T12:00:00.000Z",
      lastSmokeTestAt: "2026-04-22T12:05:00.000Z",
      lastSmokeTestStatus: "ok",
    });

    expect(html).toContain("<strong>Claude hooks:</strong> Installed");
    expect(html).toContain("<strong>Codex hooks:</strong> Installed");
    expect(html).toContain("<strong>Smoke test:</strong> ok");
  });

  it("renders the manual prompt block safely", () => {
    const html = renderSetupManualPrompt('Line 1\nLine "2"');

    expect(html).toContain("Line 1");
    expect(html).toContain("Line");
    expect(html).toContain("&quot;");
  });

  it("uses toggle labels for provider hook buttons", () => {
    expect(readProviderToggleLabel("Claude", false)).toBe(
      "Install Claude Hooks",
    );
    expect(readProviderToggleLabel("Claude", true)).toBe("Remove Claude Hooks");
    expect(readProviderToggleLabel("Codex", false)).toBe("Install Codex Hooks");
    expect(readProviderToggleLabel("Codex", true)).toBe("Remove Codex Hooks");
  });

  it("renders toggle actions instead of separate install and remove rows", () => {
    const html = renderSetupActions({
      projectRoot: "/tmp/project-a",
      claudeInstalled: true,
      codexInstalled: false,
      lastSetupAt: null,
      lastSmokeTestAt: null,
      lastSmokeTestStatus: null,
    });

    expect(html).toContain("Remove Claude Hooks");
    expect(html).toContain("Install Codex Hooks");
    expect(html).not.toContain("Install / Update Claude Hooks");
    expect(html).not.toContain('data-action="remove-claude"');
    expect(html).not.toContain('data-action="remove-codex"');
  });

  it("renders a smoke test modal that keeps the guidance text and adds an ok badge on success", () => {
    const idle = renderSetupSmokeModal({
      open: true,
      projectRoot: "/tmp/project-a",
      status: null,
    });
    const success = renderSetupSmokeModal({
      open: true,
      projectRoot: "/tmp/project-a",
      status: "ok",
    });

    expect(idle).toContain("Close");
    expect(idle).toContain("/tmp/project-a");
    expect(idle).not.toContain(">ok<");
    expect(success).toContain("/tmp/project-a");
    expect(success).toContain("You can close this dialog at any time.");
    expect(success).toContain('class="setup-modal-actions"');
    expect(success).toContain('class="setup-modal-result"');
    expect(success).toContain(">ok<");
    expect(success).not.toContain(
      '<p style="margin-top: 12px;"><span class="setup-modal-result">ok</span></p>',
    );
  });
});
