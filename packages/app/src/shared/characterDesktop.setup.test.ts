import { describe, expect, it } from "vitest";

import {
  CHARACTER_SETUP_ADD_PROJECT_CHANNEL,
  CHARACTER_SETUP_GET_MANUAL_PROMPT_CHANNEL,
  CHARACTER_SETUP_INSTALL_CLAUDE_CHANNEL,
  CHARACTER_SETUP_INSTALL_CODEX_CHANNEL,
  CHARACTER_SETUP_LIST_PROJECTS_CHANNEL,
  CHARACTER_SETUP_PICK_PROJECT_CHANNEL,
  CHARACTER_SETUP_REMOVE_CLAUDE_CHANNEL,
  CHARACTER_SETUP_REMOVE_CODEX_CHANNEL,
  CHARACTER_SETUP_REMOVE_PROJECT_CHANNEL,
  CHARACTER_SETUP_RUN_SMOKE_TEST_CHANNEL,
} from "./characterDesktop.js";

describe("desktop setup IPC contracts", () => {
  it("exposes setup channels for project management and hook actions", () => {
    expect(CHARACTER_SETUP_LIST_PROJECTS_CHANNEL).toBe("character:setup:list");
    expect(CHARACTER_SETUP_ADD_PROJECT_CHANNEL).toBe("character:setup:add");
    expect(CHARACTER_SETUP_PICK_PROJECT_CHANNEL).toBe("character:setup:pick");
    expect(CHARACTER_SETUP_REMOVE_PROJECT_CHANNEL).toBe(
      "character:setup:remove",
    );
    expect(CHARACTER_SETUP_INSTALL_CLAUDE_CHANNEL).toBe(
      "character:setup:install-claude",
    );
    expect(CHARACTER_SETUP_REMOVE_CLAUDE_CHANNEL).toBe(
      "character:setup:remove-claude",
    );
    expect(CHARACTER_SETUP_INSTALL_CODEX_CHANNEL).toBe(
      "character:setup:install-codex",
    );
    expect(CHARACTER_SETUP_REMOVE_CODEX_CHANNEL).toBe(
      "character:setup:remove-codex",
    );
    expect(CHARACTER_SETUP_GET_MANUAL_PROMPT_CHANNEL).toBe(
      "character:setup:manual-prompt",
    );
    expect(CHARACTER_SETUP_RUN_SMOKE_TEST_CHANNEL).toBe(
      "character:setup:run-smoke-test",
    );
  });
});
