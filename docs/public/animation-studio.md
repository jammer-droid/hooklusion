# Animation Studio

Animation Studio is the built-in editor for checking, importing, editing, and applying character profiles.

If you want to change how a character looks or behaves, this is the main place to do it.

## What You Can Do In Animation Studio

- browse available profiles
- preview an animation without touching a live session
- import a new sprite set
- replace or reorder frames
- adjust timing and looping
- edit which state uses which animation
- import or export a full profile package
- save a profile
- set a profile as the default

## Main Layout

Animation Studio is organized into three columns.

### Left Panel

This is where you manage profiles.

You will typically find:

- the profile list
- the animation tree
- profile-level actions such as save, delete, export, and default selection
- profile presentation settings such as floating motion

### Center Panel

This is where you preview and edit the currently selected animation.

It usually contains:

- playback controls
- the preview area
- the frame timeline

### Right Panel

This is where you inspect state policy and validation status.

It usually contains:

- information about the current profile and animation
- which state is using the selected animation
- state-level policy such as fallback, interruption, minimum dwell, and last-frame hold
- preview-only scenario tools

## Typical Workflow

For most users, this is the safest editing flow:

1. Open Animation Studio.
2. Duplicate or import a profile instead of overwriting your main one immediately.
3. Select the animation you want to edit.
4. Preview it in the center panel.
5. Replace or reorder frames if needed.
6. Adjust duration, loop, hold behavior, or state mapping.
7. Save the profile.
8. Apply it as the default profile or test it with a live session.

## Preview vs Apply

This distinction matters a lot.

### Preview

Preview is local to Animation Studio.

- it lets you inspect timing and frames
- it does not change the live character by itself
- it is safe to experiment here

### Apply

Apply changes which profile Hooklusion will actually use.

- if you apply a profile, the live app will use it on the next relevant transition
- applying is how you move from "editing" to "real use"

## Save vs Default

These are also different.

### Save Profile

Save writes your current in-memory edits into the profile data on disk.

Use this when you want to keep your changes.

### Set Default

Set Default makes that profile the main profile Hooklusion uses unless a more specific override takes priority.

Use this when you want the app to prefer that profile in normal use.

## Importing

Hooklusion has two import paths:

- `Import Sprite-Set` for a loose frame directory
- `Import Profile` for a full profile package that already includes assets and state policy

Use sprite-set import when you are building or replacing art. Use profile import when you want to restore or share a complete profile.

## Importing A Sprite Set

To import a new sprite set:

1. open Animation Studio
2. choose `Import`
3. choose `Import Sprite-Set`
4. select the prepared sprite-set directory
5. preview the result
6. save and apply if it looks right

## Importing A Full Profile

To import a saved profile package:

1. open Animation Studio
2. choose `Import`
3. choose `Import Profile`
4. select the exported profile folder or zip
5. preview the imported result
6. save and apply if needed

## Exporting A Full Profile

To share or back up a profile:

1. open Animation Studio
2. select the profile
3. choose `Export`
4. choose `Folder` or `Zip`
5. pick the destination

This exports profile metadata, state policy, and image assets together.

For preparation details, see [Sprite Set Guide](./sprite-set-guide.md).

## Editing Frames

Common frame-level actions include:

- adding a frame
- replacing a frame image
- reordering frames
- removing a frame
- changing frame weight

Frame weight affects how long each frame stays visible inside the total animation duration.

## State Policy Notes

The most important policy controls are:

- `Interruptible`
- `Min Dwell`
- `Fallback state`
- `Hold Last Frame` for transient interaction states

Current behavior to remember:

- `Min Dwell` only matters when `Interruptible` is off
- `hover_in`, `hover_out`, and `click` are treated as transient interactions, so their loop behavior is not exposed in Studio
- `done` can automatically return to its fallback state after its dwell time if its animation does not loop

## Editing State Mapping

A profile has animations, and states point at those animations.

That means:

- one animation can be reused by multiple states
- changing a state mapping changes when an animation is shown
- changing animation timing changes how it plays once selected

This is why the left tree, center preview, and right inspector all matter together.

## Scenario Sandbox

Animation Studio includes preview-only scenarios so you can simulate common flows like:

- prompt to done
- prompt to tool to done
- rapid tool changes

These are meant for checking how a profile feels before you rely on it during a real session.

## Best Practices

- start from a copy when making large changes
- save often once you like the preview
- test with a real prompt after applying a new profile
- add `tool_active` early if your sprite set is still incomplete
- treat transitions as polish, not as a requirement

## Related Guides

- [Sprite Set Guide](./sprite-set-guide.md)
- [Animation Mapping](./animation-mapping.md)
- [Glossary](./glossary.md)
