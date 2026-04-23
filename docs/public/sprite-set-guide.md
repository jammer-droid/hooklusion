# Sprite Set Guide

Hooklusion ships with bundled profiles, but you can also add your own character sprite sets.

This guide explains:

- how to apply a sprite set manually
- how to use an LLM to prepare a sprite set for import
- what the importer expects

## Built-In Profiles

The default bundled profiles currently include:

- `gpchan-default`
- `office-assistant-default`

You can keep using them as-is, replace one of them, or create a new profile from your own sprite set.

If you want to move a complete profile with its policy and metadata, use profile import/export in Animation Studio instead of sprite-set import.

## Two Ways To Bring In A New Sprite Set

### 1. Manual

Use this when you already have PNG frames and want to prepare the folder structure yourself.

### 2. With An LLM

Use this when you want Claude, Codex, or another model to help reorganize exported frames into the layout that Hooklusion expects.

The LLM should prepare the files. The actual import and apply step still happens through Hooklusion.

## Before You Start

Prepare one folder that contains only the frames you want to import.

If you are starting from a raw sheet or still need background removal, first use [Sprite Processing Workflow](./sprite-processing-workflow.md).

Hooklusion expects a sprite-set directory using these top-level folders:

```text
my-sprite-set/
  basic/
  extension/
  interact/
  transition_in/
  transition_out/
```

You do not need every folder, but every folder name must be one Hooklusion already understands.

## Common State Folders

### `basic`

Use this for the states most users will see all the time:

- `idle`
- `session_start`
- `prompt_received`
- `thinking`
- `tool_active`
- `done`

For a new profile, `basic/idle` is the minimum you should always provide.

### `extension`

Use this when you want more specific tool poses:

- `tool_read`
- `tool_search`
- `tool_explore`
- `tool_web`
- `tool_vcs_read`
- `tool_vcs_write`
- `tool_test`
- `tool_build`

### `interact`

Use this for direct user interaction with the character window:

- `hover_in`
- `hover_out`
- `click`
- `drag`
- `drag_up`
- `drag_down`
- `drag_left`
- `drag_right`

### `transition_in` and `transition_out`

Use these if you want profile-switch transitions instead of an immediate swap.

## Frame Naming

Inside each state folder, Hooklusion imports PNG files in filename order.

Using names like this is recommended:

```text
frame_000.png
frame_001.png
frame_002.png
```

Rules:

- use `.png`
- do not add nested folders inside a state folder
- keep filenames sortable in the order you want to import them

You do not have to use `frame_000.png` specifically, but a zero-padded sequence is the safest option.

## Manual Import Flow

1. Open Hooklusion.
2. Open `Animation Studio`.
3. Choose `Import`.
4. Choose `Import Sprite-Set`.
5. Import the prepared sprite-set directory.
6. Check the preview inside Animation Studio.
7. Save the profile.
8. Apply it as the default profile or to the session you want to use.

## When To Create A New Profile

Create a new profile when:

- you want to keep the bundled default profiles unchanged
- you are testing a new character
- you are not sure the imported set is complete yet

## When To Replace An Existing Profile

Replace an existing profile when:

- you are intentionally upgrading a profile you already use
- you want to keep the same profile identity but change its frames

## Using An LLM To Prepare A Sprite Set

An LLM is most useful for file preparation, not for the final app import step.

Give the model these inputs:

- the absolute path to the source folder
- whether you want a new profile or a replacement
- which states you want to include
- whether you are preparing only a partial replacement or a full set

Ask it to do these things:

1. reorganize the frames into Hooklusion's folder structure
2. rename files into a clean sortable order such as `frame_000.png`, `frame_001.png`, and so on
3. keep only supported state names
4. leave you with one importable directory

## Good LLM Request Pattern

Use prompts shaped like this:

```text
Organize these PNG frames into a Hooklusion sprite-set directory.

Source path:
/absolute/path/to/my-frames

Target:
- create a new profile
- include basic idle, thinking, tool_active, done
- include interact click and drag
- rename files to frame_000.png style
- return one clean directory I can import in Animation Studio
```

## Check Before Importing

Before you import, make sure:

- the folder names are correct
- `basic/idle` exists for a new profile
- all frames are PNG files
- frame numbering is continuous
- there are no extra top-level folders

## If A State Is Missing

That is usually okay.

Hooklusion can fall back:

- specific tool states can fall back to `tool_active`
- `tool_active` can fall back to `thinking`
- some interaction states can fall back to simpler interaction behavior

Still, the closer your set is to the full expected vocabulary, the better it will feel in real use.

## Related Guides

- [Sprite Processing Workflow](./sprite-processing-workflow.md)
- [Animation Mapping](./animation-mapping.md)
- [Animation Studio](./animation-studio.md)
- [Glossary](./glossary.md)
