# Hooklusion

Hooklusion is a desktop pet for Claude Code and Codex CLI. It listens to local hook activity and turns that activity into a floating animated character on your desktop.

You keep using your normal CLI workflow. Hooklusion stays beside it and makes the current state easier to read at a glance.

## What You Can Do

- watch prompt, thinking, tool, and done states as character animation
- connect specific projects with local hooks
- use bundled character profiles immediately
- import your own sprite sets
- edit profiles in Animation Studio

## Quick Start

If you are just trying Hooklusion for the first time:

1. run a built app
2. open `Setup Hooks...` from the tray menu
3. add the project where you use Claude or Codex
4. install local hooks
5. send a prompt from that project
6. watch the character react

Detailed guide: [Quick Start](./docs/public/quickstart.md)

## Run From A Built App

If you downloaded a packaged build:

1. open the app or mounted `.dmg`
2. move the app into `Applications` if you want
3. launch Hooklusion
4. if macOS warns that the app is unsigned, allow it through the normal first-run flow
5. open `Setup Hooks...` from the tray icon and connect your project

Detailed guide: [Run After Build](./docs/public/run-after-build.md)

## Build And Run From Source

If you want to run directly from this repo:

```bash
pnpm install
pnpm dev
```

That starts the desktop app and local server together from the workspace root.

If you want to make a packaged macOS build from source:

```bash
pnpm install
pnpm dist:mac
```

The packaged output is written under `packages/app/dist/`.

## Technical Requirements

For normal use:

- macOS
- Claude Code and/or Codex CLI
- a project folder where you run that CLI

For source development from this repo:

- `pnpm`
- a Node.js version compatible with the workspace tooling

For local analytics report generation:

- a Node.js version with built-in `node:sqlite` support
- practical recommendation: Node `22.13+`

Why that analytics note exists:

- Hooklusion stores analytics in a local SQLite database at `~/.hooklusion/analytics.sqlite`
- `pnpm analytics:generate` uses Node's built-in `node:sqlite`
- according to the official Node.js SQLite docs, `node:sqlite` was added in `v22.5.0` and stopped requiring `--experimental-sqlite` in `v22.13.0`

## Built-In Profiles

Hooklusion currently includes these bundled profiles:

- `gpchan-default`
- `office-assistant-default`

They are the easiest way to start before importing your own art.

The repository also includes source materials for these default assets:

- `gpchan-default`: source sprite archive [`split_frames_src.zip`](./sources/gpchan/split_frames_src.zip)
- `office-assistant-default`: source reference [Rocky - Microsoft Office XP - The Spriters Resource](https://www.spriters-resource.com/pc_computer/microsoftofficexp/asset/104491/)

## Preview Gallery

The bundled `gpchan-default` profile now ships with repo-hosted GIF previews so release docs can show the actual motion instead of only listing state names.

| `session_start` | `thinking` | `tool_active` | `done` |
| --- | --- | --- | --- |
| <img src="./docs/public/media/gpchan-gif/basic/session_start/session_start.gif" alt="session_start animation preview" width="112" /> | <img src="./docs/public/media/gpchan-gif/basic/thinking/thinking.gif" alt="thinking animation preview" width="112" /> | <img src="./docs/public/media/gpchan-gif/basic/tool_active/tool_active.gif" alt="tool_active animation preview" width="112" /> | <img src="./docs/public/media/gpchan-gif/basic/done/done.gif" alt="done animation preview" width="112" /> |

For the full state-by-state preview table, including tool, interaction, and transition animations, see [Animation Mapping](./docs/public/animation-mapping.md).

## Change Character / Sprite Set

You can bring in a new sprite set in two common ways:

- prepare the folder manually and import it in Animation Studio
- use an LLM to organize frames into Hooklusion's expected structure, then import that directory

Guide: [Sprite Set Guide](./docs/public/sprite-set-guide.md)

If your art still needs frame extraction, background removal, or GIF-based QA before import, use [Sprite Processing Workflow](./docs/public/sprite-processing-workflow.md).

The repository also includes the batch background-removal script used during `gpchan-default` preparation:

- [`scripts/remove_bg_rmbg2.py`](./scripts/remove_bg_rmbg2.py)

## Image Processing License Note

The `gpchan-default` image-processing workflow documented in this repo uses BRIA `RMBG-2.0` for background removal.

- model page: [briaai/RMBG-2.0 on Hugging Face](https://huggingface.co/briaai/RMBG-2.0)
- current model card license: `CC BY-NC 4.0` for non-commercial use
- commercial use of the self-hosted weights requires a separate agreement with BRIA

If you are preparing assets for distribution or commercial work, review the current BRIA terms before reusing that workflow.

## Animation Mapping

Hooklusion converts raw hook activity into a smaller set of character states so one profile can work across providers.

Examples:

- `session_start`
- `prompt_received`
- `thinking`
- `tool_active`
- `done`

Profiles can also include more detailed tool states such as `tool_read`, `tool_search`, and `tool_build`.

Guide: [Animation Mapping](./docs/public/animation-mapping.md)

## Analytics Report

Hooklusion can record local hook and presentation analytics while the app is running, then generate a static HTML debugging report on demand.

Generate a report from the repo root:

```bash
pnpm analytics:generate -- --output /tmp/hooklusion-report.html
pnpm analytics:generate -- --range 7d --provider codex
```

Current MVP behavior:

- analytics rows are stored locally in `~/.hooklusion/analytics.sqlite`
- the app can keep logging events from multiple sessions
- generated reports default to the character window's current displayed session and include that session's cumulative stored data
- the generated report is a local static HTML file for debugging and product tuning
- for reproducible output location, prefer passing `--output` explicitly

How to read the current MVP report:

- `Total events`: raw hook events recorded for the resolved report session
- `Classification coverage`: how many of those raw events were mapped into Hooklusion behavior buckets
- `Animation accuracy`: among matched-vs-mismatched resolutions for that session, how often the shown state matched the expected behavior
- `True mismatch rate`: cases where the expected behavior did not resolve to the shown state
- `Unexpected idle rate`: cases where a behavior was expected but the presentation still fell to `idle`
- `Fallback usage rate`: cases where a fallback state was used instead of the more specific expected behavior
- `Latency p50 / p95`: behavior-to-presentation latency percentiles; negative or out-of-order rows are excluded from this metric
- `Unexpected idle dwell p50`: median duration of open or completed `idle` spans used for unexpected-idle analysis

## Animation Studio

Animation Studio is the built-in editor for profiles and sprite sets.

You can use it to:

- preview animations
- import a new sprite set
- replace or reorder frames
- adjust timing and looping
- edit which state uses which animation
- save and apply a profile

Guide: [Animation Studio](./docs/public/animation-studio.md)

## Glossary

If you are unsure about words like `profile`, `state`, `apply`, or `frame weight`, start here:

[Glossary](./docs/public/glossary.md)

## Current Notes

- Hooklusion is currently a tray-style macOS utility.
- Current macOS builds are unsigned, so first-run approval is expected.
- During local source builds, stale app copies can still show older labels until you rebuild and replace them.
