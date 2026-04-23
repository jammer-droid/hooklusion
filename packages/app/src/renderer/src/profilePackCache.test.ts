import { describe, expect, it } from "vitest";

import type { AnimationProfile } from "../../shared/animationProfile.js";
import type { createAnimationPackFromProfile } from "./profileAnimationPack.js";
import {
  getCachedBySession,
  getOrCreatePackForSession,
} from "./profilePackCache.js";

describe("getCachedBySession", () => {
  it("prefers a session-specific cached value", () => {
    const cache = new Map<string | null, string>([
      [null, "default"],
      ["session-b", "profile-b"],
    ]);

    expect(getCachedBySession(cache, "session-b")).toBe("profile-b");
  });

  it("falls back to the default cached value when a session-specific one is missing", () => {
    const cache = new Map<string | null, string>([[null, "default"]]);

    expect(getCachedBySession(cache, "session-b")).toBe("default");
  });

  it("returns undefined when no cached value exists for the session or default", () => {
    const cache = new Map<string | null, string>();

    expect(getCachedBySession(cache, "session-b")).toBeUndefined();
  });
});

describe("getOrCreatePackForSession", () => {
  it("reuses the same pack for the same profile payload and session", () => {
    const cache = new Map<
      string | null,
      {
        signature: string;
        pack: ReturnType<typeof createAnimationPackFromProfile>;
      }
    >();
    const packCache = new Map<
      string,
      ReturnType<typeof createAnimationPackFromProfile>
    >();
    const profile = createProfile({
      name: "Profile A",
      id: "profile-a",
    });

    const firstPack = getOrCreatePackForSession(
      cache,
      packCache,
      profile,
      "session-a",
    );
    const secondPack = getOrCreatePackForSession(
      cache,
      packCache,
      createProfile({
        name: "Profile A",
        id: "profile-a",
      }),
      "session-a",
    );

    expect(secondPack).toBe(firstPack);
  });

  it("returns a new pack when the profile payload changes for the same id", () => {
    const cache = new Map<
      string | null,
      {
        signature: string;
        pack: ReturnType<typeof createAnimationPackFromProfile>;
      }
    >();
    const packCache = new Map<
      string,
      ReturnType<typeof createAnimationPackFromProfile>
    >();

    const firstPack = getOrCreatePackForSession(
      cache,
      packCache,
      createProfile({
        name: "Profile A",
        id: "profile-a",
      }),
      "session-a",
    );
    const secondPack = getOrCreatePackForSession(
      cache,
      packCache,
      createProfile({
        name: "Profile A v2",
        id: "profile-a",
      }),
      "session-a",
    );

    expect(secondPack).not.toBe(firstPack);
  });

  it("reuses the same pack across sessions for identical profile payloads", () => {
    const sessionCache = new Map<
      string | null,
      {
        signature: string;
        pack: ReturnType<typeof createAnimationPackFromProfile>;
      }
    >();
    const packCache = new Map<
      string,
      ReturnType<typeof createAnimationPackFromProfile>
    >();
    const profile = createProfile({
      name: "Profile A",
      id: "profile-a",
    });

    const defaultPack = getOrCreatePackForSession(
      sessionCache,
      packCache,
      profile,
      null,
    );
    const sessionPack = getOrCreatePackForSession(
      sessionCache,
      packCache,
      createProfile({
        name: "Profile A",
        id: "profile-a",
      }),
      "session-a",
    );

    expect(sessionPack).toBe(defaultPack);
  });

  it("creates a new pack when the same profile id changes content in another session", () => {
    const sessionCache = new Map<
      string | null,
      {
        signature: string;
        pack: ReturnType<typeof createAnimationPackFromProfile>;
      }
    >();
    const packCache = new Map<
      string,
      ReturnType<typeof createAnimationPackFromProfile>
    >();

    const defaultPack = getOrCreatePackForSession(
      sessionCache,
      packCache,
      createProfile({
        name: "Profile A",
        id: "profile-a",
      }),
      null,
    );
    const updatedPack = getOrCreatePackForSession(
      sessionCache,
      packCache,
      createProfile({
        name: "Profile A v2",
        id: "profile-a",
      }),
      "session-a",
    );

    expect(updatedPack).not.toBe(defaultPack);
  });
});

function createProfile(overrides: Partial<AnimationProfile>): AnimationProfile {
  return {
    schemaVersion: 1,
    id: "profile-a",
    name: "Profile A",
    spriteRoot: "sprites",
    animations: {
      idle: {
        frames: ["idle_a.png"],
        totalDurationMs: 1000,
        frameWeights: [1],
        loop: true,
        transitionMs: 120,
      },
    },
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
    ...overrides,
  };
}
