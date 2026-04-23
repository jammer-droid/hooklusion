import { describe, expect, it } from "vitest";

import {
  createFrameMoveToastMessage,
  dismissStudioToast,
  enqueueStudioToast,
  pushStudioToast,
} from "./studioToast.js";

describe("studio toast helpers", () => {
  it("adds newest toasts first so they appear at the top of the stack", () => {
    const first = pushStudioToast([], "Imported frame");
    const second = pushStudioToast(first, "Moved frame");

    expect(first).toEqual([
      { id: "toast-1", kind: "info", message: "Imported frame" },
    ]);
    expect(second).toEqual([
      { id: "toast-2", kind: "info", message: "Moved frame" },
      { id: "toast-1", kind: "info", message: "Imported frame" },
    ]);
    expect(dismissStudioToast(second, "toast-1")).toEqual([
      { id: "toast-2", kind: "info", message: "Moved frame" },
    ]);
  });

  it("marks error toasts so they can require manual dismissal", () => {
    const toasts = pushStudioToast([], "Import failed", { kind: "error" });

    expect(toasts).toEqual([
      { id: "toast-1", kind: "error", message: "Import failed" },
    ]);
  });

  it("returns the newly inserted toast so callers can schedule the right lifecycle", () => {
    const existing = pushStudioToast([], "Imported frame");
    const next = enqueueStudioToast(existing, "Saved");

    expect(next.toast).toEqual({
      id: "toast-2",
      kind: "info",
      message: "Saved",
    });
    expect(next.toasts[0]).toEqual(next.toast);
  });

  it("formats frame move toast messages with one-based indexes", () => {
    expect(createFrameMoveToastMessage(1, 3)).toBe("Moved frame 02 to 04");
  });
});
