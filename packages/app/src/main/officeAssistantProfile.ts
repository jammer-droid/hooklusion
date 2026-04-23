import type { AnimationProfile } from "../shared/animationProfile.js";
import { createProfileAssetUrl } from "../shared/profileAssetUrl.js";

export const OFFICE_ASSISTANT_PROFILE_ID = "office-assistant-default";

export function createOfficeAssistantAnimationProfile(
  _projectRoot: string,
): AnimationProfile {
  const dragAnimation = createAnimation(120, [
    "office-assistant/animations/tool_active/desk_work/frame_004.png",
    "assets/office-assistant/animations/tool_active/desk_work/frame_005.png",
    "assets/office-assistant/animations/tool_active/desk_work/frame_006.png",
    "assets/office-assistant/animations/tool_active/desk_work/frame_007.png",
    "assets/office-assistant/animations/tool_active/desk_work/frame_008.png",
    "assets/office-assistant/animations/tool_active/desk_work/frame_009.png",
  ]);

  return {
    schemaVersion: 1,
    assetSchemaVersion: 2,
    id: OFFICE_ASSISTANT_PROFILE_ID,
    name: "Office Assistant",
    spriteRoot: "assets",
    presentation: {
      floatingMotion: true,
    },
    animations: {
      idle: createAnimation(220, [
        "office-assistant/animations/idle/seated_idle/frame_000.png",
        "assets/office-assistant/animations/idle/seated_idle/frame_001.png",
        "assets/office-assistant/animations/idle/seated_idle/frame_002.png",
        "assets/office-assistant/animations/idle/seated_idle/frame_003.png",
        "assets/office-assistant/animations/idle/seated_idle/frame_004.png",
        "assets/office-assistant/animations/idle/seated_idle/frame_005.png",
        "assets/office-assistant/animations/idle/seated_idle/frame_006.png",
        "office-assistant/animations/idle/seated_idle/frame_007.png",
      ]),
      session_start: createAnimation(160, [
        "office-assistant/animations/session_start/greeting/frame_000.png",
        "assets/office-assistant/animations/session_start/greeting/frame_001.png",
        "assets/office-assistant/animations/session_start/greeting/frame_002.png",
        "assets/office-assistant/animations/session_start/greeting/frame_003.png",
        "assets/office-assistant/animations/session_start/greeting/frame_004.png",
        "assets/office-assistant/animations/session_start/greeting/frame_005.png",
        "office-assistant/animations/session_start/greeting/frame_006.png",
      ]),
      prompt_received: createAnimation(180, [
        "office-assistant/animations/prompt_received/attentive_talk/frame_000.png",
        "assets/office-assistant/animations/prompt_received/attentive_talk/frame_001.png",
        "assets/office-assistant/animations/prompt_received/attentive_talk/frame_002.png",
        "assets/office-assistant/animations/prompt_received/attentive_talk/frame_003.png",
        "assets/office-assistant/animations/prompt_received/attentive_talk/frame_004.png",
        "assets/office-assistant/animations/prompt_received/attentive_talk/frame_005.png",
        "assets/office-assistant/animations/prompt_received/attentive_talk/frame_006.png",
        "office-assistant/animations/prompt_received/attentive_talk/frame_007.png",
      ]),
      thinking: createAnimation(190, [
        "office-assistant/animations/thinking/paper_think/frame_000.png",
        "assets/office-assistant/animations/thinking/paper_think/frame_001.png",
        "assets/office-assistant/animations/thinking/paper_think/frame_002.png",
        "assets/office-assistant/animations/thinking/paper_think/frame_003.png",
        "assets/office-assistant/animations/thinking/paper_think/frame_004.png",
        "office-assistant/animations/thinking/paper_think/frame_005.png",
      ]),
      tool_active: createAnimation(120, [
        "office-assistant/animations/tool_active/desk_work/frame_000.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_001.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_002.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_003.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_004.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_005.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_006.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_007.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_008.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_009.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_010.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_011.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_012.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_013.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_014.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_015.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_016.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_017.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_018.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_019.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_020.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_021.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_022.png",
        "assets/office-assistant/animations/tool_active/desk_work/frame_023.png",
        "office-assistant/animations/tool_active/desk_work/frame_024.png",
      ]),
      hover_in: createAnimation(
        150,
        [
          "office-assistant/animations/prompt_received/attentive_talk/frame_000.png",
          "assets/office-assistant/animations/prompt_received/attentive_talk/frame_001.png",
          "assets/office-assistant/animations/prompt_received/attentive_talk/frame_002.png",
          "assets/office-assistant/animations/prompt_received/attentive_talk/frame_003.png",
        ],
        false,
      ),
      hover_out: createAnimation(
        180,
        [
          "office-assistant/animations/idle/seated_idle/frame_003.png",
          "assets/office-assistant/animations/idle/seated_idle/frame_004.png",
          "assets/office-assistant/animations/idle/seated_idle/frame_005.png",
          "assets/office-assistant/animations/idle/seated_idle/frame_006.png",
        ],
        false,
      ),
      drag: cloneAnimation(dragAnimation),
      drag_up: cloneAnimation(dragAnimation),
      drag_down: cloneAnimation(dragAnimation),
      drag_left: cloneAnimation(dragAnimation),
      drag_right: cloneAnimation(dragAnimation),
      click: createAnimation(
        140,
        [
          "office-assistant/animations/session_start/greeting/frame_000.png",
          "assets/office-assistant/animations/session_start/greeting/frame_001.png",
          "assets/office-assistant/animations/session_start/greeting/frame_002.png",
          "assets/office-assistant/animations/session_start/greeting/frame_003.png",
        ],
        false,
      ),
      done: createAnimation(160, [
        "office-assistant/animations/done/happy_status/frame_000.png",
        "assets/office-assistant/animations/done/happy_status/frame_001.png",
        "assets/office-assistant/animations/done/happy_status/frame_002.png",
        "office-assistant/animations/done/happy_status/frame_003.png",
      ]),
      tool_read: createAnimation(150, [
        "office-assistant/animations/tool_read/clipboard_read/frame_000.png",
        "assets/office-assistant/animations/tool_read/clipboard_read/frame_001.png",
        "assets/office-assistant/animations/tool_read/clipboard_read/frame_002.png",
        "assets/office-assistant/animations/tool_read/clipboard_read/frame_003.png",
        "assets/office-assistant/animations/tool_read/clipboard_read/frame_004.png",
        "assets/office-assistant/animations/tool_read/clipboard_read/frame_005.png",
        "assets/office-assistant/animations/tool_read/clipboard_read/frame_006.png",
        "assets/office-assistant/animations/tool_read/clipboard_read/frame_007.png",
        "assets/office-assistant/animations/tool_read/clipboard_read/frame_008.png",
        "office-assistant/animations/tool_read/clipboard_read/frame_009.png",
      ]),
      tool_search: createAnimation(150, [
        "office-assistant/animations/tool_search/sniff_search/frame_000.png",
        "assets/office-assistant/animations/tool_search/sniff_search/frame_001.png",
        "assets/office-assistant/animations/tool_search/sniff_search/frame_002.png",
        "assets/office-assistant/animations/tool_search/sniff_search/frame_003.png",
        "assets/office-assistant/animations/tool_search/sniff_search/frame_004.png",
        "office-assistant/animations/tool_search/sniff_search/frame_005.png",
      ]),
      tool_explore: createAnimation(140, [
        "office-assistant/animations/tool_explore/crawl_explore/frame_000.png",
        "assets/office-assistant/animations/tool_explore/crawl_explore/frame_001.png",
        "assets/office-assistant/animations/tool_explore/crawl_explore/frame_002.png",
        "assets/office-assistant/animations/tool_explore/crawl_explore/frame_003.png",
        "assets/office-assistant/animations/tool_explore/crawl_explore/frame_004.png",
        "assets/office-assistant/animations/tool_explore/crawl_explore/frame_005.png",
        "assets/office-assistant/animations/tool_explore/crawl_explore/frame_006.png",
        "assets/office-assistant/animations/tool_explore/crawl_explore/frame_007.png",
        "assets/office-assistant/animations/tool_explore/crawl_explore/frame_008.png",
        "office-assistant/animations/tool_explore/crawl_explore/frame_009.png",
      ]),
      tool_web: createAnimation(140, [
        "office-assistant/animations/tool_web/computer_action/frame_000.png",
        "assets/office-assistant/animations/tool_web/computer_action/frame_001.png",
        "assets/office-assistant/animations/tool_web/computer_action/frame_002.png",
        "assets/office-assistant/animations/tool_web/computer_action/frame_003.png",
        "assets/office-assistant/animations/tool_web/computer_action/frame_004.png",
        "office-assistant/animations/tool_web/computer_action/frame_005.png",
      ]),
      tool_vcs_read: createAnimation(170, [
        "office-assistant/animations/tool_vcs_read/presentation_review/frame_000.png",
        "assets/office-assistant/animations/tool_vcs_read/presentation_review/frame_001.png",
        "assets/office-assistant/animations/tool_vcs_read/presentation_review/frame_002.png",
        "assets/office-assistant/animations/tool_vcs_read/presentation_review/frame_003.png",
        "assets/office-assistant/animations/tool_vcs_read/presentation_review/frame_004.png",
        "assets/office-assistant/animations/tool_vcs_read/presentation_review/frame_005.png",
        "office-assistant/animations/tool_vcs_read/presentation_review/frame_006.png",
      ]),
      tool_vcs_write: createAnimation(120, [
        "office-assistant/animations/tool_vcs_write/desk_typing/frame_000.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_001.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_002.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_003.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_004.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_005.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_006.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_007.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_008.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_009.png",
        "assets/office-assistant/animations/tool_vcs_write/desk_typing/frame_010.png",
        "office-assistant/animations/tool_vcs_write/desk_typing/frame_011.png",
      ]),
      tool_test: createAnimation(160, [
        "office-assistant/animations/tool_test/inspect_react/frame_000.png",
        "assets/office-assistant/animations/tool_test/inspect_react/frame_001.png",
        "assets/office-assistant/animations/tool_test/inspect_react/frame_002.png",
        "assets/office-assistant/animations/tool_test/inspect_react/frame_003.png",
        "assets/office-assistant/animations/tool_test/inspect_react/frame_004.png",
        "assets/office-assistant/animations/tool_test/inspect_react/frame_005.png",
        "office-assistant/animations/tool_test/inspect_react/frame_006.png",
      ]),
      tool_build: createAnimation(150, [
        "office-assistant/animations/tool_build/tool_prop/frame_000.png",
        "assets/office-assistant/animations/tool_build/tool_prop/frame_001.png",
        "assets/office-assistant/animations/tool_build/tool_prop/frame_002.png",
        "office-assistant/animations/tool_build/tool_prop/frame_003.png",
      ]),
    },
    states: {
      idle: { animation: "idle" },
      session_start: { animation: "session_start" },
      prompt_received: { animation: "prompt_received" },
      thinking: { animation: "thinking" },
      tool_active: { animation: "tool_active" },
      hover_in: {
        animation: "hover_in",
        allowDuringHookActivity: false,
      },
      hover_out: {
        animation: "hover_out",
        allowDuringHookActivity: false,
      },
      drag: {
        animation: "drag",
        allowDuringHookActivity: false,
      },
      drag_up: {
        animation: "drag_up",
        allowDuringHookActivity: false,
      },
      drag_down: {
        animation: "drag_down",
        allowDuringHookActivity: false,
      },
      drag_left: {
        animation: "drag_left",
        allowDuringHookActivity: false,
      },
      drag_right: {
        animation: "drag_right",
        allowDuringHookActivity: false,
      },
      click: {
        animation: "click",
        allowDuringHookActivity: false,
      },
      done: { animation: "done" },
      tool_read: { animation: "tool_read" },
      tool_search: { animation: "tool_search" },
      tool_explore: { animation: "tool_explore" },
      tool_web: { animation: "tool_web" },
      tool_vcs_read: {
        animation: "tool_vcs_read",
      },
      tool_vcs_write: {
        animation: "tool_vcs_write",
      },
      tool_test: { animation: "tool_test" },
      tool_build: { animation: "tool_build" },
    },
  };
}

function createAnimation(
  frameDurationMs: number,
  frames: string[],
  loop = true,
) {
  return {
    frames: frames.map((frame) =>
      createProfileAssetUrl(
        OFFICE_ASSISTANT_PROFILE_ID,
        `assets/${normalizeBundledFramePath(frame)}`,
      ),
    ),
    totalDurationMs: frameDurationMs * frames.length,
    frameWeights: frames.map(() => 1),
    loop,
    transitionMs: 120,
  };
}

function cloneAnimation<T extends ReturnType<typeof createAnimation>>(
  animation: T,
): T {
  return {
    ...animation,
    frames: [...animation.frames],
    frameWeights: [...animation.frameWeights],
  };
}

function normalizeBundledFramePath(frame: string) {
  return frame.startsWith("assets/") ? frame.slice("assets/".length) : frame;
}
