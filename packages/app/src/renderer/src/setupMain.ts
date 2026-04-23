import type {
  CharacterDesktopApi,
  CharacterSetupProjectStatus,
} from "../../shared/characterDesktop.js";
import {
  buildSetupHtml,
  renderSetupActions,
  renderSetupManualPrompt,
  renderSetupProjects,
  renderSetupSmokeModal,
  renderSetupStatus,
  type SetupSmokeModalState,
} from "./setupShell.js";

declare global {
  interface Window {
    projectCDesktop: CharacterDesktopApi;
  }
}

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("Setup renderer root element was not found.");
}

app.innerHTML = buildSetupHtml();

const projectList = readElement("[data-role='setup-project-list']");
const statusBody = readElement("[data-role='setup-status-body']");
const actionsBody = readElement("[data-role='setup-actions-body']");
const manualPrompt = readElement<HTMLPreElement>(
  "[data-role='setup-manual-prompt']",
);
const smokeModalRoot = readElement<HTMLDivElement>(
  "[data-role='setup-smoke-modal']",
);

let projects: CharacterSetupProjectStatus[] = [];
let selectedProjectRoot: string | null = null;
let pendingActionLabel: string | null = null;
let smokeModalState: SetupSmokeModalState = {
  open: false,
  projectRoot: null,
  status: null,
};

void refresh();
bindActions();

async function refresh() {
  projects = await window.projectCDesktop.listManagedProjects();
  if (
    selectedProjectRoot === null ||
    !projects.some((project) => project.projectRoot === selectedProjectRoot)
  ) {
    selectedProjectRoot = projects[0]?.projectRoot ?? null;
  }

  await renderSetup();
}

async function renderSetup() {
  projectList.innerHTML = renderSetupProjects(projects, selectedProjectRoot);
  statusBody.innerHTML = renderSetupStatus(readSelectedProject());
  actionsBody.innerHTML = renderSetupActions(readSelectedProject());
  manualPrompt.innerHTML = renderSetupManualPrompt(
    selectedProjectRoot === null
      ? "Select a project to generate a manual setup prompt."
      : await window.projectCDesktop.getSetupManualPrompt(selectedProjectRoot),
  );
  smokeModalRoot.innerHTML = renderSetupSmokeModal(smokeModalState);
  smokeModalRoot.hidden = !smokeModalState.open;

  for (const button of projectList.querySelectorAll<HTMLButtonElement>(
    "[data-project-root]",
  )) {
    button.addEventListener("click", () => {
      selectedProjectRoot = button.dataset.projectRoot ?? null;
      void renderSetup();
    });
  }

  bindDynamicAction("toggle-claude", async () => {
    const project = readSelectedProject();

    if (project?.claudeInstalled) {
      await runProjectAction((projectRoot) =>
        window.projectCDesktop.removeClaudeHooks(projectRoot),
      );
      return;
    }

    await runProjectAction((projectRoot) =>
      window.projectCDesktop.installClaudeHooks(projectRoot),
    );
  });

  bindDynamicAction("toggle-codex", async () => {
    const project = readSelectedProject();

    if (project?.codexInstalled) {
      await runProjectAction((projectRoot) =>
        window.projectCDesktop.removeCodexHooks(projectRoot),
      );
      return;
    }

    await runProjectAction((projectRoot) =>
      window.projectCDesktop.installCodexHooks(projectRoot),
    );
  });

  bindDynamicAction("run-smoke-test", async () => {
    const projectRoot = readSelectedProjectRoot();
    smokeModalState = {
      open: true,
      projectRoot,
      status: null,
    };
    await renderSetup();

    void window.projectCDesktop
      .runSetupSmokeTest(projectRoot)
      .then(async (updated) => {
        if (updated !== null) {
          projects = mergeUpdatedProject(projects, updated);
        }

        if (
          smokeModalState.projectRoot === projectRoot &&
          smokeModalState.open
        ) {
          smokeModalState = {
            open: true,
            projectRoot,
            status: updated?.lastSmokeTestStatus ?? "failed",
          };
        }

        await refresh();
      })
      .catch(async () => {
        if (
          smokeModalState.projectRoot === projectRoot &&
          smokeModalState.open
        ) {
          smokeModalState = {
            open: true,
            projectRoot,
            status: "failed",
          };
        }

        await renderSetup();
      });
  });

  bindDynamicAction("close-smoke-modal", async () => {
    smokeModalState = {
      open: false,
      projectRoot: smokeModalState.projectRoot,
      status: smokeModalState.status,
    };
    await renderSetup();
  });

  for (const button of document.querySelectorAll<HTMLButtonElement>("button")) {
    const action = button.dataset.action;

    if (action === undefined) {
      continue;
    }

    const isBusy =
      pendingActionLabel !== null &&
      action !== "copy-manual-prompt" &&
      action !== "add-project" &&
      action !== "close-smoke-modal";
    button.disabled =
      isBusy || (selectedProjectRoot === null && action !== "add-project");
  }
}

function bindActions() {
  bindAction("add-project", async () => {
    const projectRoot = await window.projectCDesktop.pickManagedProjectPath();
    if (projectRoot === null) {
      return;
    }

    projects = await window.projectCDesktop.addManagedProject(projectRoot);
    selectedProjectRoot = projectRoot;
    await renderSetup();
  });

  bindAction("remove-project", async () => {
    const projectRoot = readSelectedProjectRoot();
    projects = await window.projectCDesktop.removeManagedProject(projectRoot);
    selectedProjectRoot = projects[0]?.projectRoot ?? null;
    await renderSetup();
  });

  bindAction("copy-manual-prompt", async () => {
    if (selectedProjectRoot === null) {
      return;
    }

    const prompt =
      await window.projectCDesktop.getSetupManualPrompt(selectedProjectRoot);
    await navigator.clipboard.writeText(prompt);
  });
}

function bindAction(action: string, handler: () => Promise<void>) {
  const button = document.querySelector<HTMLButtonElement>(
    `button[data-action="${action}"]`,
  );

  if (button === null) {
    throw new Error(`Missing setup action button: ${action}`);
  }

  button.addEventListener("click", () => {
    void handler();
  });
}

async function runProjectAction(
  action: (projectRoot: string) => Promise<CharacterSetupProjectStatus | null>,
) {
  const projectRoot = readSelectedProjectRoot();
  pendingActionLabel = projectRoot;
  await renderSetup();

  try {
    const updated = await action(projectRoot);
    if (updated !== null) {
      projects = mergeUpdatedProject(projects, updated);
    }
  } finally {
    pendingActionLabel = null;
    await refresh();
  }
}

function bindDynamicAction(action: string, handler: () => Promise<void>) {
  const button = document.querySelector<HTMLButtonElement>(
    `button[data-action="${action}"]`,
  );

  if (button === null) {
    return;
  }

  button.addEventListener("click", () => {
    void handler();
  });
}

function mergeUpdatedProject(
  currentProjects: CharacterSetupProjectStatus[],
  updated: CharacterSetupProjectStatus,
) {
  return currentProjects
    .filter((project) => project.projectRoot !== updated.projectRoot)
    .concat(updated)
    .sort((left, right) => left.projectRoot.localeCompare(right.projectRoot));
}

function readSelectedProject() {
  return (
    projects.find((project) => project.projectRoot === selectedProjectRoot) ??
    null
  );
}

function readSelectedProjectRoot() {
  if (selectedProjectRoot === null) {
    throw new Error("No managed project is selected.");
  }

  return selectedProjectRoot;
}

function readElement<T extends Element = HTMLElement>(selector: string) {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Setup element not found: ${selector}`);
  }

  return element;
}
