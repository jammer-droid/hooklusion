# Sprite Processing Workflow

This guide is for profile creators who want to prepare their own character art before importing it into Hooklusion.

It is based on the workflow used to prepare the bundled `gpchan-default` profile assets.

## What This Covers

This workflow focuses on four practical stages:

1. split a sprite sheet into per-frame PNGs
2. remove the background on each frame
3. generate GIF previews for quick motion checks
4. import the cleaned frames into Hooklusion as a sprite set

If you already have clean per-frame PNGs, you can skip straight to the import-facing guide: [Sprite Set Guide](./sprite-set-guide.md).

## Core Principles

- the final source of truth is a set of per-frame PNG files
- background removal should happen per frame, not on a full sheet
- GIFs are for review only, not for final import
- if GIF frames do not share the same canvas size, preview playback can break

## Recommended Working Layout

```text
input/
  movement_sheet.png

work/
  split_frames/
    up/
      up_01.png
      up_02.png
    down/
      down_01.png
      down_02.png
    left/
      left_01.png
      left_02.png
    right/
      right_01.png
      right_02.png

output/
  split_frames_rmbg2/
    up/
    down/
    left/
    right/
```

## 1. Split The Sheet Into Frames

Start by splitting your source sheet into smaller directional strips such as `up`, `down`, `left`, and `right`. Then split each strip into individual frame PNGs.

This is usually safer than trying to cut one large sheet directly into every frame at once.

### Practical Tips

- leave a little padding around the character instead of cropping too tightly
- a small margin such as `6-12px` is often enough to avoid cutting hair, hands, or accessories
- if the sheet layout is clean, manual or semi-manual splitting is usually more reliable than full automation

### Review Before Moving On

Before background removal, quickly inspect the extracted PNGs and confirm:

- the frame order is correct
- nothing important is cropped off
- the character position is reasonably consistent from frame to frame

## 2. Remove Background Per Frame

Hooklusion imports PNGs, so the usual target is a cleaned RGBA PNG sequence.

The project workflow used [`scripts/remove_bg_rmbg2.py`](../../scripts/remove_bg_rmbg2.py), which applies BRIA `RMBG-2.0` frame by frame and mirrors the input directory structure into the output directory.

### Why RMBG-2.0

For sticker-like characters and outlined sprites, soft alpha matters. `RMBG-2.0` tends to preserve edges more naturally than simpler binary-mask approaches.

Important: BRIA `RMBG-2.0` is a gated Hugging Face model and has licensing terms you should review before commercial use.

### Script Included In This Repo

The exact batch helper used for this workflow is included here:

- [`scripts/remove_bg_rmbg2.py`](../../scripts/remove_bg_rmbg2.py)

It mirrors the input directory tree, writes RGBA PNG outputs, and skips frames that were already processed.

### License Note

As of April 23, 2026, the BRIA `RMBG-2.0` Hugging Face model card lists the model under `CC BY-NC 4.0` for non-commercial use, with commercial self-hosted use requiring a separate agreement with BRIA.

Source:

- https://huggingface.co/briaai/RMBG-2.0

### Environment Setup

```bash
uv venv /tmp/rmbg2_env
uv pip install --python /tmp/rmbg2_env/bin/python \
  torch torchvision transformers pillow numpy kornia timm einops
```

You must also accept access to `briaai/RMBG-2.0` on Hugging Face and provide a read token.

### Run The Batch Script

```bash
/tmp/rmbg2_env/bin/python scripts/remove_bg_rmbg2.py \
  --src /absolute/path/to/split_frames \
  --dst /absolute/path/to/split_frames_rmbg2
```

What the script does:

- recursively finds PNG files under `--src`
- writes RGBA PNG outputs under `--dst`
- keeps the input folder structure
- skips outputs that already exist so reruns are easy

### What To Check After Background Removal

- outlines and small details still look intact
- bright edge highlights were not removed as background
- neighboring frames still feel stable when you step through them

## 3. Generate GIF Previews For QA

This step is optional, but it is very useful when you want to confirm timing, order, and motion quickly before importing a sprite set.

GIFs should be treated as preview artifacts, not as the assets Hooklusion imports.

### Important Constraint

If your per-frame PNGs have different canvas sizes, some GIF export flows can produce broken previews or even a one-frame GIF.

The safe approach is:

1. determine one shared canvas size for the sequence
2. pad each frame onto that canvas
3. export the GIF from the padded sequence

### Example Preview Command

```bash
ffmpeg -framerate 6 -i frame_%03d.png \
  -vf "scale=iw*2:ih*2:flags=neighbor,split[a][b];[a]palettegen[p];[b][p]paletteuse" \
  preview.gif
```

If frame sizes differ, pad them to a common size first instead of exporting directly from mixed-size PNGs.

## 4. Turn Clean Frames Into A Hooklusion Sprite Set

Once your PNG frames look correct:

1. organize them into Hooklusion's `basic`, `extension`, `interact`, `transition_in`, and `transition_out` folders
2. rename the files into a stable sortable sequence such as `frame_000.png`
3. import the directory in Animation Studio

The import-facing rules are documented here:

- [Sprite Set Guide](./sprite-set-guide.md)
- [Animation Studio](./animation-studio.md)
- [Animation Mapping](./animation-mapping.md)

## Recommended End-To-End Flow

1. split the source sheet into directional strips
2. extract per-frame PNGs with a little safety padding
3. inspect the PNG sequence once before cleanup
4. run background removal per frame
5. generate GIF previews if you want a fast motion check
6. organize the final PNGs into a Hooklusion sprite-set directory
7. import and preview the result in Animation Studio

## Checklist

- frame order is correct
- no body parts or accessories are cropped
- background removal preserved the outline cleanly
- preview GIFs play with more than one frame
- final import folder uses supported Hooklusion state names
- frame filenames sort in the intended order

## Related Guides

- [Sprite Set Guide](./sprite-set-guide.md)
- [Animation Studio](./animation-studio.md)
- [Animation Mapping](./animation-mapping.md)
