export interface StudioToast {
  id: string;
  kind: "info" | "error";
  message: string;
}

export const STUDIO_TOAST_TIMEOUT_MS = 3000;

export function enqueueStudioToast(
  toasts: StudioToast[],
  message: string,
  options: { kind?: StudioToast["kind"] } = {},
) {
  const toast = {
    id: `toast-${readNextToastIndex(toasts)}`,
    kind: options.kind ?? "info",
    message,
  } satisfies StudioToast;

  return {
    toast,
    toasts: [toast, ...toasts],
  };
}

export function pushStudioToast(
  toasts: StudioToast[],
  message: string,
  options: { kind?: StudioToast["kind"] } = {},
): StudioToast[] {
  return enqueueStudioToast(toasts, message, options).toasts;
}

export function dismissStudioToast(
  toasts: StudioToast[],
  toastId: string,
): StudioToast[] {
  return toasts.filter((toast) => toast.id !== toastId);
}

export function createFrameMoveToastMessage(
  fromIndex: number,
  toIndex: number,
) {
  return `Moved frame ${formatFrameIndex(fromIndex)} to ${formatFrameIndex(toIndex)}`;
}

function readNextToastIndex(toasts: StudioToast[]) {
  const firstToast = toasts[0];

  if (firstToast === undefined) {
    return 1;
  }

  const lastIndex = Number(firstToast.id.replace(/^toast-/, ""));
  return Number.isInteger(lastIndex) ? lastIndex + 1 : toasts.length + 1;
}

function formatFrameIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}
