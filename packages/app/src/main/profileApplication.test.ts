import { describe, expect, it, vi } from "vitest";

import {
  applyProfileSelection,
  broadcastResolvedProfileSafely,
  createProfileSelectionState,
  DEFAULT_PROFILE_ID,
} from "./profileApplication.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe("applyProfileSelection", () => {
  it("keeps gpchan-default as the startup default profile id", () => {
    const state = createProfileSelectionState(DEFAULT_PROFILE_ID);

    expect(DEFAULT_PROFILE_ID).toBe("gpchan-default");
    expect(state.defaultProfileId).toBe("gpchan-default");
  });

  it("leaves selection state unchanged when profile resolution fails", async () => {
    const readProfile = vi.fn().mockRejectedValue(new Error("missing profile"));
    const sessionProfileOverrides = new Map<string, string>();
    const state = {
      defaultProfileId: "gpchan-default",
      sessionProfileOverrides,
    };

    await expect(
      applyProfileSelection(
        {
          readProfile,
        },
        state,
        "custom-profile",
        "session-1",
      ),
    ).rejects.toThrow("missing profile");

    expect(state.defaultProfileId).toBe("gpchan-default");
    expect(sessionProfileOverrides.size).toBe(0);
    expect(readProfile).toHaveBeenCalledWith("custom-profile");
  });

  it("rolls back selection state when broadcasting fails", async () => {
    const profile = createMinimalProfile("custom-profile", "Custom");
    const readProfile = vi.fn().mockResolvedValue(profile);
    const sessionProfileOverrides = new Map<string, string>([
      ["session-1", "previous-profile"],
    ]);
    const state = {
      defaultProfileId: "gpchan-default",
      sessionProfileOverrides,
    };
    const broadcast = vi.fn().mockRejectedValue(new Error("send failed"));

    await expect(
      applyProfileSelection(
        {
          readProfile,
        },
        state,
        "custom-profile",
        "session-1",
        broadcast,
      ),
    ).rejects.toThrow("send failed");

    expect(state.defaultProfileId).toBe("gpchan-default");
    expect(sessionProfileOverrides.get("session-1")).toBe("previous-profile");
    expect(readProfile).toHaveBeenCalledWith("custom-profile");
    expect(broadcast).toHaveBeenCalledWith(profile, "session-1");
  });

  it("updates the default profile selection when no session is resolved", async () => {
    const profile = createMinimalProfile("custom-profile", "Custom");
    const readProfile = vi.fn().mockResolvedValue(profile);
    const state = createProfileSelectionState("gpchan-default");
    const broadcast = vi.fn().mockResolvedValue(undefined);

    await expect(
      applyProfileSelection(
        {
          readProfile,
        },
        state,
        "custom-profile",
        null,
        broadcast,
      ),
    ).resolves.toBe(profile);

    expect(state.defaultProfileId).toBe("custom-profile");
    expect(broadcast).toHaveBeenCalledWith(profile, null);
  });

  it("ignores a stale default apply that finishes after a newer success", async () => {
    const olderProfile = createMinimalProfile("older-profile", "Older");
    const newerProfile = createMinimalProfile("newer-profile", "Newer");
    const olderRead = createDeferred<typeof olderProfile>();
    const newerRead = createDeferred<typeof newerProfile>();
    const readProfile = vi
      .fn()
      .mockImplementationOnce(() => olderRead.promise)
      .mockImplementationOnce(() => newerRead.promise);
    const broadcast = vi.fn().mockResolvedValue(undefined);
    const state = createProfileSelectionState("gpchan-default");

    const olderApply = applyProfileSelection(
      {
        readProfile,
      },
      state,
      "older-profile",
      null,
      broadcast,
    );
    const newerApply = applyProfileSelection(
      {
        readProfile,
      },
      state,
      "newer-profile",
      null,
      broadcast,
    );

    newerRead.resolve(newerProfile);
    await expect(newerApply).resolves.toBe(newerProfile);
    expect(state.defaultProfileId).toBe("newer-profile");
    expect(broadcast).toHaveBeenCalledTimes(1);

    olderRead.resolve(olderProfile);
    await expect(olderApply).resolves.toBe(olderProfile);
    expect(state.defaultProfileId).toBe("newer-profile");
    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  it("ignores a stale session override apply that finishes after a newer success", async () => {
    const olderProfile = createMinimalProfile("older-profile", "Older");
    const newerProfile = createMinimalProfile("newer-profile", "Newer");
    const olderRead = createDeferred<typeof olderProfile>();
    const newerRead = createDeferred<typeof newerProfile>();
    const readProfile = vi
      .fn()
      .mockImplementationOnce(() => olderRead.promise)
      .mockImplementationOnce(() => newerRead.promise);
    const broadcast = vi.fn().mockResolvedValue(undefined);
    const state = createProfileSelectionState("gpchan-default");

    const olderApply = applyProfileSelection(
      {
        readProfile,
      },
      state,
      "older-profile",
      "session-1",
      broadcast,
    );
    const newerApply = applyProfileSelection(
      {
        readProfile,
      },
      state,
      "newer-profile",
      "session-1",
      broadcast,
    );

    newerRead.resolve(newerProfile);
    await expect(newerApply).resolves.toBe(newerProfile);
    expect(state.sessionProfileOverrides.get("session-1")).toBe(
      "newer-profile",
    );
    expect(broadcast).toHaveBeenCalledTimes(1);

    olderRead.resolve(olderProfile);
    await expect(olderApply).resolves.toBe(olderProfile);
    expect(state.sessionProfileOverrides.get("session-1")).toBe(
      "newer-profile",
    );
    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  it("keeps a newer default apply when an older committed broadcast fails later", async () => {
    const olderProfile = createMinimalProfile("older-profile", "Older");
    const newerProfile = createMinimalProfile("newer-profile", "Newer");
    const olderRead = createDeferred<typeof olderProfile>();
    const newerRead = createDeferred<typeof newerProfile>();
    const olderBroadcast = createDeferred<void>();
    const newerBroadcast = createDeferred<void>();
    const readProfile = vi
      .fn()
      .mockImplementationOnce(() => olderRead.promise)
      .mockImplementationOnce(() => newerRead.promise);
    const broadcast = vi.fn((profile: { id: string }) => {
      return profile.id === "older-profile"
        ? olderBroadcast.promise
        : newerBroadcast.promise;
    });
    const state = createProfileSelectionState("gpchan-default");

    const olderApply = applyProfileSelection(
      {
        readProfile,
      },
      state,
      "older-profile",
      null,
      broadcast,
    );

    olderRead.resolve(olderProfile);
    await vi.waitFor(() => {
      expect(broadcast).toHaveBeenCalledTimes(1);
    });
    const newerApply = applyProfileSelection(
      {
        readProfile,
      },
      state,
      "newer-profile",
      null,
      broadcast,
    );
    newerRead.resolve(newerProfile);
    await vi.waitFor(() => {
      expect(broadcast).toHaveBeenCalledTimes(2);
    });
    newerBroadcast.resolve();
    await expect(newerApply).resolves.toBe(newerProfile);
    expect(state.defaultProfileId).toBe("newer-profile");

    olderBroadcast.reject(new Error("older broadcast failed"));

    await expect(olderApply).rejects.toThrow("older broadcast failed");
    expect(state.defaultProfileId).toBe("newer-profile");
  });

  it("keeps a newer session override when an older committed broadcast fails later", async () => {
    const olderProfile = createMinimalProfile("older-profile", "Older");
    const newerProfile = createMinimalProfile("newer-profile", "Newer");
    const olderRead = createDeferred<typeof olderProfile>();
    const newerRead = createDeferred<typeof newerProfile>();
    const olderBroadcast = createDeferred<void>();
    const newerBroadcast = createDeferred<void>();
    const readProfile = vi
      .fn()
      .mockImplementationOnce(() => olderRead.promise)
      .mockImplementationOnce(() => newerRead.promise);
    const broadcast = vi.fn((profile: { id: string }) => {
      return profile.id === "older-profile"
        ? olderBroadcast.promise
        : newerBroadcast.promise;
    });
    const state = createProfileSelectionState("gpchan-default");

    const olderApply = applyProfileSelection(
      {
        readProfile,
      },
      state,
      "older-profile",
      "session-1",
      broadcast,
    );

    olderRead.resolve(olderProfile);
    await vi.waitFor(() => {
      expect(broadcast).toHaveBeenCalledTimes(1);
    });
    const newerApply = applyProfileSelection(
      {
        readProfile,
      },
      state,
      "newer-profile",
      "session-1",
      broadcast,
    );
    newerRead.resolve(newerProfile);
    await vi.waitFor(() => {
      expect(broadcast).toHaveBeenCalledTimes(2);
    });
    newerBroadcast.resolve();
    await expect(newerApply).resolves.toBe(newerProfile);
    expect(state.sessionProfileOverrides.get("session-1")).toBe(
      "newer-profile",
    );

    olderBroadcast.reject(new Error("older broadcast failed"));

    await expect(olderApply).rejects.toThrow("older broadcast failed");
    expect(state.sessionProfileOverrides.get("session-1")).toBe(
      "newer-profile",
    );
  });
});

describe("broadcastResolvedProfileSafely", () => {
  it("logs broadcast failures without rejecting", async () => {
    const error = new Error("broadcast failed");
    const logger = vi.fn();
    const broadcast = vi.fn().mockRejectedValue(error);

    broadcastResolvedProfileSafely(broadcast, logger);

    await vi.waitFor(() => {
      expect(logger).toHaveBeenCalledWith(error);
    });
    expect(broadcast).toHaveBeenCalledTimes(1);
  });
});

function createMinimalProfile(id: string, name: string) {
  return {
    schemaVersion: 1 as const,
    id,
    name,
    spriteRoot: `sprites/${id}`,
    animations: {},
    states: {
      idle: {
        animation: "idle",
      },
      session_start: {
        animation: "idle",
      },
      prompt_received: {
        animation: "idle",
      },
      thinking: {
        animation: "idle",
      },
      tool_active: {
        animation: "idle",
      },
      done: {
        animation: "idle",
      },
    },
  };
}
