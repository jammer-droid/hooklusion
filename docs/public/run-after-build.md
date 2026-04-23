# Run After Build

This guide covers two common cases:

- you downloaded a built app and want to run it
- you cloned the repo and want to build and run it yourself

## Run From A Release App

If you already have a packaged app build:

1. Open the `.dmg` or extracted app bundle.
2. Move the app into `Applications` if that is how you usually manage macOS apps.
3. Launch the app.
4. If macOS warns that the app is unsigned, use the normal macOS "Open anyway" flow and relaunch it.
5. Once the app is running, use the tray menu to open `Setup Hooks...`.
6. Add your project and install local hooks.

## Important Note About Current macOS Builds

The current macOS distribution is unsigned. That means:

- it can still be shared and run
- macOS may show a Gatekeeper warning on first launch
- first-run approval is expected for now

## Verify The App Is Running

After launch, confirm these points:

- a tray icon appears in the menu bar
- the setup window opens from the tray menu
- the app can watch a managed project
- the character reacts after you send a real prompt from Claude or Codex

## Build And Run From Source

If you want to run from the repo instead of from a release app:

```bash
pnpm install
pnpm dev
```

That starts the desktop app and local server together from the workspace root.

## Build A macOS App From Source

If you want a packaged macOS build from source:

```bash
pnpm install
pnpm dist:mac
```

The packaged output is written under `packages/app/dist/`.

Depending on the age of your local build artifacts, you may still see older app labels in a few cached outputs. If that happens, treat them as the same app during the transition and rebuild if you want the latest branding everywhere.

## Which Path Should You Use?

- Use the release app if you just want to run Hooklusion.
- Use the source build if you are developing, testing, or changing the app.
- Use the packaged source build if you want to verify exactly what will be distributed.

## After The App Starts

Once the app is open, continue with:

- [Quick Start](./quickstart.md)
- [Sprite Set Guide](./sprite-set-guide.md)
- [Animation Studio](./animation-studio.md)
- [Repo Migration](./repo-migration.md)

## Optional: Generate A Local Analytics Report

If you are running Hooklusion from source and want a local debugging report:

```bash
pnpm analytics:generate -- --output /tmp/hooklusion-report.html
```

Notes:

- this is a local debugging feature, not a required setup step
- the report is generated from locally stored analytics data
- the analytics script depends on Node's built-in `node:sqlite`, so a modern Node version is required when you run it from source
