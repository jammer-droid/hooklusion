import type { CharacterSetupProjectStatus } from "../../shared/characterDesktop.js";

export interface SetupSmokeModalState {
  open: boolean;
  projectRoot: string | null;
  status: "ok" | "failed" | null;
}

export function buildSetupHtml() {
  return `
    <style>
      :root {
        --setup-bg: #f5f1e8;
        --setup-panel: #fffdfa;
        --setup-line: #d6cec1;
        --setup-text: #1d1a17;
        --setup-muted: #6a6258;
        --setup-accent: #b45a2e;
      }

      html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
      }

      body {
        background: linear-gradient(180deg, #f8f5ee 0%, var(--setup-bg) 100%);
        color: var(--setup-text);
        font-family: Inter, system-ui, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      main {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
        gap: 0;
      }

      .setup-pane {
        border: 0;
        background: var(--setup-panel);
      }

      .setup-sidebar {
        border-right: 1px solid var(--setup-line);
        padding: 24px 20px;
      }

      .setup-content {
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 0;
      }

      .setup-region {
        padding: 20px 24px;
        border-bottom: 1px solid var(--setup-line);
      }

      h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }

      h2 {
        margin: 0 0 10px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--setup-muted);
      }

      .setup-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .setup-project-actions {
        margin-top: 18px;
      }

      button {
        border: 1px solid var(--setup-line);
        background: #fff;
        color: var(--setup-text);
        border-radius: 999px;
        padding: 10px 14px;
        font: inherit;
        cursor: pointer;
        transition:
          background-color 140ms ease,
          border-color 140ms ease,
          color 140ms ease,
          box-shadow 140ms ease;
      }

      button:hover:not(:disabled) {
        border-color: var(--setup-accent);
        box-shadow: 0 0 0 2px color-mix(in oklab, var(--setup-accent) 14%, transparent);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .setup-primary {
        border-color: var(--setup-accent);
        background: var(--setup-accent);
        color: #fff;
      }

      .setup-project-list {
        display: grid;
        gap: 12px;
      }

      .setup-project-row {
        width: 100%;
        display: grid;
        gap: 10px;
        padding: 14px 16px;
        text-align: left;
        border-radius: 24px;
      }

      .setup-project-row:hover {
        background: #fff7f2;
      }

      .setup-project-row[data-selected="true"] {
        background: #fdf1e8;
        border-color: #e1b293;
        box-shadow: inset 0 0 0 1px #e9c6af;
      }

      .setup-project-path {
        font-weight: 600;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .setup-project-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .setup-project-badge {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 4px 10px;
        border-radius: 999px;
        background: #f4ede5;
        color: var(--setup-muted);
        font-size: 12px;
      }

      .setup-actions-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      pre[data-role="setup-manual-prompt"] {
        margin: 18px 0 0;
        max-width: 100%;
        overflow-x: hidden;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .setup-modal-root[hidden] {
        display: none;
      }

      .setup-modal-root {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background: color-mix(in oklab, #2e2219 35%, transparent);
      }

      .setup-modal-card {
        width: min(460px, 100%);
        padding: 22px 24px;
        border-radius: 24px;
        background: var(--setup-panel);
        border: 1px solid var(--setup-line);
        box-shadow: 0 24px 80px rgba(17, 11, 6, 0.18);
      }

      .setup-modal-card h3 {
        margin: 0 0 10px;
        font-size: 22px;
      }

      .setup-modal-card p {
        margin: 0;
        line-height: 1.5;
      }

      .setup-modal-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 18px;
      }

      .setup-modal-result {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 6px 12px;
        border-radius: 999px;
        background: #f2eee7;
        font-weight: 700;
        text-transform: lowercase;
      }
    </style>
    <main>
      <section class="setup-pane setup-sidebar" data-region="setup-projects">
        <h1>Setup Hooks</h1>
        <p>Connect projects, install local hooks, and verify that Hooklusion can see fresh activity.</p>
        <h2>Managed Projects</h2>
        <div class="setup-project-list" data-role="setup-project-list"></div>
        <div class="setup-actions setup-project-actions">
          <button class="setup-primary" data-action="add-project" type="button">Add Project...</button>
          <button data-action="remove-project" type="button">Remove</button>
        </div>
      </section>
      <section class="setup-pane setup-content">
        <section class="setup-region" data-region="setup-status">
          <h2>Status</h2>
          <div data-role="setup-status-body"></div>
        </section>
        <section class="setup-region" data-region="setup-actions">
          <h2>Actions</h2>
          <div data-role="setup-actions-body"></div>
        </section>
        <section class="setup-region" data-region="setup-manual">
          <h2>Manual with LLM</h2>
          <p>Use local setup by default, or choose a global install only when you explicitly want broader capture.</p>
          <div class="setup-actions">
            <button data-action="copy-manual-prompt" type="button">Copy LLM Prompt</button>
          </div>
          <pre data-role="setup-manual-prompt"></pre>
        </section>
      </section>
    </main>
    <div class="setup-modal-root" data-role="setup-smoke-modal" hidden></div>
  `;
}

export function readProviderToggleLabel(
  providerName: "Claude" | "Codex",
  installed: boolean,
) {
  return `${installed ? "Remove" : "Install"} ${providerName} Hooks`;
}

export function renderSetupActions(
  project: CharacterSetupProjectStatus | null,
) {
  const claudeInstalled = project?.claudeInstalled ?? false;
  const codexInstalled = project?.codexInstalled ?? false;

  return `
    <div class="setup-actions-grid">
      <button class="${claudeInstalled ? "" : "setup-primary"}" data-action="toggle-claude" type="button">${readProviderToggleLabel("Claude", claudeInstalled)}</button>
      <button class="${codexInstalled ? "" : "setup-primary"}" data-action="toggle-codex" type="button">${readProviderToggleLabel("Codex", codexInstalled)}</button>
      <button data-action="run-smoke-test" type="button">Run Smoke Test</button>
    </div>
  `;
}

export function renderSetupProjects(
  projects: CharacterSetupProjectStatus[],
  selectedProjectRoot: string | null,
) {
  if (projects.length === 0) {
    return `<p>No managed projects yet.</p>`;
  }

  return projects
    .map((project) => {
      const badges = [
        project.claudeInstalled ? "Claude" : null,
        project.codexInstalled ? "Codex" : null,
      ]
        .filter((value): value is string => value !== null)
        .map(
          (badge) =>
            `<span class="setup-project-badge">${escapeHtml(badge)}</span>`,
        )
        .join("");

      return `<button class="setup-project-row" data-project-root="${escapeHtml(
        project.projectRoot,
      )}" data-selected="${String(
        project.projectRoot === selectedProjectRoot,
      )}" type="button"><span class="setup-project-path">${escapeHtml(
        project.projectRoot,
      )}</span><span class="setup-project-badges">${
        badges.length > 0
          ? badges
          : '<span class="setup-project-badge">No hooks installed</span>'
      }</span></button>`;
    })
    .join("");
}

export function renderSetupStatus(project: CharacterSetupProjectStatus | null) {
  if (project === null) {
    return `<p>Select a project to inspect setup status.</p>`;
  }

  return [
    `<p><strong>Project:</strong> ${escapeHtml(project.projectRoot)}</p>`,
    `<p><strong>Claude hooks:</strong> ${project.claudeInstalled ? "Installed" : "Not installed"}</p>`,
    `<p><strong>Codex hooks:</strong> ${project.codexInstalled ? "Installed" : "Not installed"}</p>`,
    `<p><strong>Last setup:</strong> ${escapeHtml(project.lastSetupAt ?? "Never")}</p>`,
    `<p><strong>Smoke test:</strong> ${escapeHtml(project.lastSmokeTestStatus ?? "Not run")}</p>`,
    `<p><strong>Last smoke test at:</strong> ${escapeHtml(project.lastSmokeTestAt ?? "Never")}</p>`,
  ].join("");
}

export function renderSetupManualPrompt(prompt: string) {
  return escapeHtml(prompt);
}

export function renderSetupSmokeModal({
  open,
  projectRoot,
  status,
}: SetupSmokeModalState) {
  if (!open) {
    return "";
  }

  return `
    <div class="setup-modal-card" role="dialog" aria-modal="true" aria-labelledby="setup-smoke-title">
      <h3 id="setup-smoke-title">Smoke Test</h3>
      <p>Trigger one hook event from ${
        projectRoot === null ? "the selected project" : escapeHtml(projectRoot)
      }. You can close this dialog at any time.</p>
      ${
        status === "failed"
          ? '<p style="margin-top: 12px;">No hook event was detected before timeout.</p>'
          : ""
      }
      <div class="setup-modal-actions">
        ${status === "ok" ? '<span class="setup-modal-result">ok</span>' : "<span></span>"}
        <button data-action="close-smoke-modal" type="button">Close</button>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
