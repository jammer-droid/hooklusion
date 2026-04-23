# Repo Migration

This guide is for the case where you want to take the current Hooklusion working tree and start a fresh Git repository without bringing the old Git history with it.

Use this when:

- you want to publish or archive the current project state as a new repository
- you want to copy code, docs, assets, and scripts, but not the existing `.git` history
- you want to leave local runtime state behind

## What Should Move To The New Repo

You usually want to keep:

- source code
- public docs
- scripts
- checked-in assets
- build configuration

## What Should Stay Local

You usually do **not** want to copy:

- `.git/`
- `node_modules/`
- `.hooklusion/`
- `packages/app/dist/`
- generated analytics reports such as `hooklusion-analytics-report-*.html`
- machine-local caches such as `.DS_Store`

Why:

- `.hooklusion/` contains runtime-only local state such as config, profiles, hook logs, and analytics data
- generated analytics HTML files are local debugging output, not source
- build output should be regenerated from source

## Recommended Copy Flow

From your current repo:

```bash
SRC=/path/to/current-hooklusion-worktree
DST=/path/to/new-hooklusion-repo

mkdir -p "$DST"

rsync -av \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.DS_Store' \
  --exclude '.hooklusion' \
  --exclude 'packages/app/dist' \
  --exclude 'hooklusion-analytics-report-*.html' \
  "$SRC"/ "$DST"/
```

Then initialize a fresh repository:

```bash
cd "$DST"
git init
git add .
git commit -m "Initial import"
```

## Before You Publish

Check these points:

- the new repo contains `README.md`, `docs/`, `packages/`, `scripts/`, and `assets/`
- the new repo does **not** contain `.git/` from the old project
- the new repo does **not** contain `.hooklusion/` local runtime state
- the new repo does **not** contain generated analytics reports
- the new repo can run its documented install flow from source

## Related Guides

- [Quick Start](./quickstart.md)
- [Run After Build](./run-after-build.md)
