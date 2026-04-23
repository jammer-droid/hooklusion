# Quick Start

This guide is the shortest path from "I downloaded Hooklusion" to "my desktop character reacts to Claude or Codex activity."

## What You Need

- macOS
- A Hooklusion app build
- At least one supported CLI tool:
  - Claude Code
  - Codex CLI
- A project folder where you normally run that CLI

## Fastest Path

1. Open Hooklusion.
2. Look for the tray icon in the macOS menu bar.
3. Open the tray menu and choose `Setup Hooks...`.
4. Click `Add Project...` and pick the folder where you run Claude or Codex.
5. Install local hooks for the provider you use.
6. Run Claude or Codex from that same project folder.
7. Submit a prompt and watch the character react.

## What "Working" Looks Like

When the setup is working, you should see a simple flow like this:

- session starts
- prompt received
- thinking
- tool activity
- done

If your CLI spends time reading files, running shell commands, searching, testing, or building, Hooklusion can also switch into more specific tool animations when those frames exist in the active profile.

Some provider progress text is only visible inside the CLI itself. Hooklusion reacts to supported hook and tool events, not to every status line the CLI prints.

## Recommended Setup Order

If you are new to the app, this order is the least confusing:

1. Start with the release app build.
2. Connect only one project first.
3. Test with one provider first, then add the second one later if you want both Claude and Codex.
4. Use the bundled profiles before importing your own sprite set.

## Local Hooks vs Global Hooks

Hooklusion is designed to work best with project-local setup first.

- Local setup means only the selected project sends hook events to Hooklusion.
- Global setup is broader and may capture activity from places you did not intend.

For most users, local project setup is the right default.

## After Quick Start

Use these guides next if you want more:

- [Run After Build](./run-after-build.md)
- [Repo Migration](./repo-migration.md)
- [Sprite Set Guide](./sprite-set-guide.md)
- [Animation Mapping](./animation-mapping.md)
- [Animation Studio](./animation-studio.md)
- [Glossary](./glossary.md)
