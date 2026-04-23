import type { CharacterEvent } from "../../../server/src/characterEvent.js";

export interface SetupSmokeTestResult {
  projectRoot: string;
  status: "ok" | "failed";
  completedAt: string;
}

export interface SetupSmokeTestRun {
  projectRoot: string;
  completed: Promise<SetupSmokeTestResult>;
}

export interface SetupSmokeTestMonitorOptions {
  timeoutMs?: number;
  now?: () => string;
  isProjectEvent: (event: CharacterEvent, projectRoot: string) => boolean;
  onResult: (
    projectRoot: string,
    status: "ok" | "failed",
    completedAt: string,
  ) => void;
}

export function createSetupSmokeTestMonitor({
  timeoutMs = 15_000,
  now = () => new Date().toISOString(),
  isProjectEvent,
  onResult,
}: SetupSmokeTestMonitorOptions) {
  let activeRun: {
    projectRoot: string;
    timer: ReturnType<typeof setTimeout>;
    resolve: (result: SetupSmokeTestResult) => void;
  } | null = null;

  function start(projectRoot: string): SetupSmokeTestRun {
    if (activeRun !== null) {
      clearTimeout(activeRun.timer);
      complete(activeRun.projectRoot, "failed", activeRun.resolve);
    }

    let resolveRun!: (result: SetupSmokeTestResult) => void;
    const completed = new Promise<SetupSmokeTestResult>((resolve) => {
      resolveRun = resolve;
    });
    const timer = setTimeout(() => {
      if (activeRun?.projectRoot !== projectRoot) {
        return;
      }

      const current = activeRun;
      activeRun = null;
      complete(projectRoot, "failed", current.resolve);
    }, timeoutMs);

    activeRun = {
      projectRoot,
      timer,
      resolve: resolveRun,
    };

    return {
      projectRoot,
      completed,
    };
  }

  function observeEvent(event: CharacterEvent) {
    if (activeRun === null) {
      return;
    }

    if (!isProjectEvent(event, activeRun.projectRoot)) {
      return;
    }

    clearTimeout(activeRun.timer);
    const current = activeRun;
    activeRun = null;
    complete(current.projectRoot, "ok", current.resolve);
  }

  function complete(
    projectRoot: string,
    status: "ok" | "failed",
    resolveRun: (result: SetupSmokeTestResult) => void,
  ) {
    const completedAt = now();
    onResult(projectRoot, status, completedAt);
    resolveRun({
      projectRoot,
      status,
      completedAt,
    });
  }

  return {
    start,
    observeEvent,
  };
}
