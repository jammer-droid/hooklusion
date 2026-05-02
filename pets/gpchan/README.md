# GP Chan Pet Animations

GP Chan animation assets resized to the Codex pet frame size (`192 x 208`) while preserving GP Chan animation names, frame counts, frame order, and timing.

## Preview

| Animation | Preview |
| --- | --- |
| `idle` | <img src="./gifs/idle.gif" alt="idle animation preview" width="144" /> |
| `session_start` | <img src="./gifs/session_start.gif" alt="session_start animation preview" width="144" /> |
| `prompt_received` | <img src="./gifs/prompt_received.gif" alt="prompt_received animation preview" width="144" /> |
| `thinking` | <img src="./gifs/thinking.gif" alt="thinking animation preview" width="144" /> |
| `tool_active` | <img src="./gifs/tool_active.gif" alt="tool_active animation preview" width="144" /> |
| `tool_read` | <img src="./gifs/tool_read.gif" alt="tool_read animation preview" width="144" /> |
| `tool_search` | <img src="./gifs/tool_search.gif" alt="tool_search animation preview" width="144" /> |
| `tool_explore` | <img src="./gifs/tool_explore.gif" alt="tool_explore animation preview" width="144" /> |
| `tool_web` | <img src="./gifs/tool_web.gif" alt="tool_web animation preview" width="144" /> |
| `tool_vcs_read` | <img src="./gifs/tool_vcs_read.gif" alt="tool_vcs_read animation preview" width="144" /> |
| `tool_vcs_write` | <img src="./gifs/tool_vcs_write.gif" alt="tool_vcs_write animation preview" width="144" /> |
| `tool_test` | <img src="./gifs/tool_test.gif" alt="tool_test animation preview" width="144" /> |
| `tool_build` | <img src="./gifs/tool_build.gif" alt="tool_build animation preview" width="144" /> |
| `tool_bash` | <img src="./gifs/tool_bash.gif" alt="tool_bash animation preview" width="144" /> |
| `hover_in` | <img src="./gifs/hover_in.gif" alt="hover_in animation preview" width="144" /> |
| `hover_out` | <img src="./gifs/hover_out.gif" alt="hover_out animation preview" width="144" /> |
| `drag` | <img src="./gifs/drag.gif" alt="drag animation preview" width="144" /> |
| `drag_up` | <img src="./gifs/drag_up.gif" alt="drag_up animation preview" width="144" /> |
| `drag_down` | <img src="./gifs/drag_down.gif" alt="drag_down animation preview" width="144" /> |
| `drag_left` | <img src="./gifs/drag_left.gif" alt="drag_left animation preview" width="144" /> |
| `drag_right` | <img src="./gifs/drag_right.gif" alt="drag_right animation preview" width="144" /> |
| `click` | <img src="./gifs/click.gif" alt="click animation preview" width="144" /> |
| `done` | <img src="./gifs/done.gif" alt="done animation preview" width="144" /> |
| `transition_in` | <img src="./gifs/transition_in.gif" alt="transition_in animation preview" width="144" /> |
| `transition_out` | <img src="./gifs/transition_out.gif" alt="transition_out animation preview" width="144" /> |

## Files

- `animations/`: PNG frames grouped by animation name.
- `gifs/`: GitHub-friendly GIF previews for each animation.

## Applying These Frames As A Codex Pet

Codex pets currently use a single spritesheet, not this folder structure directly. To turn these animations into a custom Codex pet, ask an agent to pack selected animations from `pets/gpchan/animations/` into Codex's fixed pet spritesheet format:

- output folder: `~/.codex/pets/<pet-id>/`
- required files: `pet.json` and `spritesheet.webp`
- spritesheet size: `1536 x 1872`
- grid: `8 columns x 9 rows`
- frame size: `192 x 208`

Codex row order:

| Row | Codex state |
| --- | --- |
| 0 | `idle` |
| 1 | `running-right` |
| 2 | `running-left` |
| 3 | `waving` |
| 4 | `jumping` |
| 5 | `failed` |
| 6 | `waiting` |
| 7 | `running` |
| 8 | `review` |

Example request:

```text
Using this repo's pets/gpchan/animations folder, create a Codex custom pet named GP Chan.

Pack a 1536x1872 spritesheet.webp with 8 columns x 9 rows, 192x208 per frame.
Use this row mapping:
- row 0 idle: idle
- row 1 running-right: drag_right
- row 2 running-left: drag_left
- row 3 waving: session_start
- row 4 jumping: hover_in
- row 5 failed: transition_out
- row 6 waiting: thinking
- row 7 running: tool_active
- row 8 review: done

If an animation has fewer than 8 frames, repeat its frames only as needed to fill that row.
Create ~/.codex/pets/gpchan/pet.json and spritesheet.webp.
Then tell me to refresh Codex from Personalization > Pets.
```

After the files are created, open Codex and use `Personalization > Pets > Refresh`. If the pet does not appear, restart Codex and refresh again.
