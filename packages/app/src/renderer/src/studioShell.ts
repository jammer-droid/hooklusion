export function buildAnimationStudioHtml() {
  return `
    <style>
      :root {
        --studio-bg: #fbfaf7;
        --studio-panel: #ffffff;
        --studio-panel-alt: #f4f2ed;
        --studio-line: #d9d5cb;
        --studio-line-soft: #e8e4da;
        --studio-text: #201f26;
        --studio-muted: #6f6a60;
        --studio-faint: #8b8478;
        --studio-accent: oklch(0.62 0.14 30);
        --studio-accent-soft: oklch(0.95 0.03 30);
      }

      html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
      }

      body {
        overflow: auto;
        background: var(--studio-bg);
        color: var(--studio-text);
        font-family: Inter, system-ui, sans-serif;
        font-size: 13px;
      }

      * {
        box-sizing: border-box;
      }

      main {
        width: 100vw;
        height: 100vh;
        min-height: 100vh;
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr) 300px;
        grid-template-rows: 100vh;
        align-items: stretch;
        gap: 0;
        padding: 0;
      }

      .studio-pane {
        min-width: 0;
        min-height: 0;
        border: 0;
        background: var(--studio-panel);
        overflow: hidden;
      }

      [data-region="left"] {
        display: grid;
        grid-template-rows: auto 1fr;
        border-right: 1px solid var(--studio-line);
      }

      .studio-center {
        min-width: 0;
        min-height: 0;
        display: grid;
        grid-template-rows: auto minmax(160px, 1fr) fit-content(260px);
        gap: 0;
        background: var(--studio-bg);
        overflow: hidden;
      }

      [data-region="center-meta"],
      [data-region="center-preview"],
      [data-region="center-timeline"] {
        display: grid;
        grid-template-rows: auto 1fr;
      }

      [data-region="right"] {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        border-left: 1px solid var(--studio-line);
      }

      .region-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 34px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--studio-line-soft);
        color: var(--studio-muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .region-body {
        padding: 12px;
        min-height: 0;
        overflow: auto;
      }

      [data-region="center-meta"] {
        border-bottom: 1px solid var(--studio-line);
        background: var(--studio-panel);
      }

      [data-region="center-meta"] .region-head,
      [data-region="center-preview"] .region-head,
      [data-region="center-timeline"] .region-head {
        display: none;
      }

      [data-region="center-meta"] .region-body {
        padding: 10px 16px;
      }

      [data-region="center-preview"] {
        border-bottom: 1px solid var(--studio-line);
      }

      [data-region="center-preview"] .region-body {
        position: relative;
        display: grid;
        place-items: center;
        padding: 14px;
        background:
          linear-gradient(var(--studio-line-soft) 1px, transparent 1px),
          linear-gradient(90deg, var(--studio-line-soft) 1px, transparent 1px),
          var(--studio-panel);
        background-size: 28px 28px;
      }

      [data-region="center-timeline"] .region-body {
        padding: 10px 16px 14px;
      }

      .studio-list {
        display: grid;
        gap: 10px;
      }

      .studio-profile-layout {
        min-height: 100%;
        display: grid;
        grid-template-rows: auto 1fr auto auto;
        gap: 8px;
      }

      .studio-profile-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding-top: 8px;
        border-top: 1px solid var(--studio-line-soft);
      }

      .studio-profile-actions-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .studio-profile-actions-group[data-align="start"] {
        justify-content: flex-start;
      }

      .studio-profile-actions-group[data-align="end"] {
        margin-left: auto;
      }

      .studio-profile-footer {
        padding-top: 10px;
        border-top: 1px solid var(--studio-line-soft);
      }

      .studio-profile-footer .studio-info-row {
        font-size: 11px;
        line-height: 1.3;
      }

      .studio-tree-anim-row {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 4px 8px 4px 20px;
        border-radius: 3px;
        cursor: pointer;
        color: var(--studio-text);
        background: transparent;
        border: 0;
        width: 100%;
        text-align: left;
        font: inherit;
      }

      .studio-tree-anim-row:hover {
        background: var(--studio-panel-alt);
      }

      .studio-tree-anim-row[data-selected="true"] {
        background: var(--studio-accent-soft);
        box-shadow: inset 2px 0 0 var(--studio-accent);
      }

      .studio-tree-floating {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 3px 8px 6px 20px;
        border-bottom: 1px dashed var(--studio-line-soft);
        margin-bottom: 2px;
      }

      .studio-tree-floating-label {
        flex: 1;
        color: var(--studio-muted);
        font-size: 11px;
      }

      .studio-button.studio-head-button {
        width: 24px;
        min-width: 24px;
        height: 24px;
        min-height: 24px;
        padding: 0;
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        text-align: center;
      }

      .studio-button.studio-head-button svg {
        display: block;
        width: 14px;
        height: 14px;
      }

      .region-head-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
      }

      .studio-button.studio-icon-action {
        width: 28px;
        min-width: 28px;
        height: 28px;
        min-height: 28px;
        padding: 0;
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        text-align: center;
      }

      .studio-button.studio-icon-action svg {
        width: 14px;
        height: 14px;
      }

      .studio-meta {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }

      .studio-meta-label {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        flex: 0 0 auto;
        min-width: 0;
      }

      .studio-meta-label-kicker {
        color: var(--studio-muted);
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .studio-meta-label-line {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
        max-width: 100%;
        overflow: hidden;
      }

      .studio-meta-label-name {
        color: var(--studio-text);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .studio-meta-label-count {
        color: var(--studio-muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10px;
        white-space: nowrap;
      }

      .studio-meta-label-note {
        color: var(--studio-accent);
        font-size: 10px;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .studio-meta-label-note::before {
        width: 5px;
        height: 5px;
        border-radius: 999px;
        background: var(--studio-accent);
        content: "";
      }

      .studio-meta-divider {
        width: 1px;
        height: 22px;
        background: var(--studio-line);
      }

      .studio-field-inline {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        flex: 0 0 auto;
      }

      .studio-field-inline > span {
        font-size: 10px;
        color: var(--studio-muted);
        text-transform: none;
      }

      .studio-field-inline input[type="number"] {
        padding: 4px 6px;
        width: 72px;
      }

      .studio-meta [data-role="controls"] {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 0 0 auto;
      }

      .studio-field-suffix {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10px;
        color: var(--studio-muted);
      }

      .studio-toggle {
        position: relative;
        display: inline-block;
        width: 28px;
        height: 16px;
        flex: 0 0 auto;
      }

      .studio-toggle input {
        position: absolute;
        inset: 0;
        opacity: 0;
        margin: 0;
        cursor: pointer;
      }

      .studio-toggle-track {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: var(--studio-line);
        transition: background 120ms ease;
      }

      .studio-toggle-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: var(--studio-panel);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
        transition: left 120ms ease;
      }

      .studio-toggle input:checked ~ .studio-toggle-track {
        background: var(--studio-accent);
      }

      .studio-toggle input:checked ~ .studio-toggle-thumb {
        left: 14px;
      }

      .studio-toggle-track,
      .studio-toggle-thumb {
        pointer-events: none;
      }

      .studio-presentation-note {
        color: var(--studio-faint);
        font-size: 10px;
        line-height: 1.4;
        margin: -2px 0 0;
      }

      .studio-section[data-tone="valid"] {
        border: 0;
        border-left: 3px solid #79a86c;
        border-radius: 2px;
        background: #f6faf4;
        padding: 8px 10px;
      }

      .studio-section[data-tone="valid"] .studio-section-title {
        display: none;
      }

      .studio-section[data-tone="valid"] .empty-state {
        color: #3f6b33;
      }

      .studio-button[data-tone="danger"] {
        border-color: color-mix(in srgb, #c44848 55%, var(--studio-line));
        color: #a63a3a;
      }

      .studio-button[data-tone="danger"]:hover {
        background: #fbeded;
      }

      .studio-inspector-row {
        display: grid;
        grid-template-columns: 60px minmax(0, 1fr);
        gap: 8px;
        font-size: 11px;
        line-height: 1.7;
      }

      .studio-inspector-row > span:first-child {
        color: var(--studio-muted);
      }

      .studio-inspector-path {
        margin-top: 8px;
        padding: 6px 8px;
        background: var(--studio-panel-alt);
        border-radius: 3px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10px;
        color: var(--studio-faint);
        word-break: break-all;
      }

      .studio-used-by-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        color: var(--studio-muted);
      }

      .studio-used-by-row[data-editing="true"] {
        color: var(--studio-text);
      }

      .studio-derived-line {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10px;
        color: var(--studio-faint);
        line-height: 1.6;
        margin: 0;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .studio-meta-spacer {
        flex: 1;
      }

      .studio-meta .studio-field {
        min-width: 72px;
      }

      .studio-meta .studio-field input {
        min-width: 0;
        padding: 5px 6px;
      }

      .studio-meta .studio-button,
      .studio-timeline-actions .studio-button {
        width: auto;
        white-space: nowrap;
      }

      .studio-icon-button {
        width: 30px;
        min-width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        padding: 0;
      }

      .studio-icon {
        position: relative;
        width: 12px;
        height: 12px;
        display: block;
      }

      .studio-icon-button[data-icon="play"] .studio-icon {
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-left: 9px solid currentColor;
        margin-left: 2px;
      }

      .studio-icon-button[data-icon="pause"] .studio-icon::before,
      .studio-icon-button[data-icon="pause"] .studio-icon::after {
        position: absolute;
        top: 1px;
        width: 3px;
        height: 10px;
        background: currentColor;
        content: "";
      }

      .studio-icon-button[data-icon="pause"] .studio-icon::before {
        left: 2px;
      }

      .studio-icon-button[data-icon="pause"] .studio-icon::after {
        right: 2px;
      }

      .studio-icon-button[data-icon="previous"] .studio-icon::before,
      .studio-icon-button[data-icon="next"] .studio-icon::before {
        position: absolute;
        top: 2px;
        width: 8px;
        height: 8px;
        border-top: 2px solid currentColor;
        border-left: 2px solid currentColor;
        content: "";
      }

      .studio-icon-button[data-icon="previous"] .studio-icon::before {
        left: 3px;
        transform: rotate(-45deg);
      }

      .studio-icon-button[data-icon="next"] .studio-icon::before {
        right: 3px;
        transform: rotate(135deg);
      }

      .studio-timeline-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .studio-timeline {
        display: grid;
        gap: 6px;
      }

      .studio-timeline-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .studio-timeline-ruler {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        height: 16px;
        padding-bottom: 2px;
        border-bottom: 1px dashed var(--studio-line-soft);
        color: var(--studio-muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 9px;
      }

      .studio-timeline-ruler span:last-child {
        text-align: right;
      }

      .studio-timeline-bar {
        display: flex;
        align-items: stretch;
        gap: 3px;
        height: 92px;
        flex-shrink: 0;
      }

      .studio-timeline-bar[data-row="weights"] {
        height: auto;
      }

      .studio-frame-cell {
        position: relative;
        min-width: 72px;
        border: 1px solid var(--studio-line);
        border-radius: 3px;
        background: var(--studio-panel-alt);
        color: var(--studio-text);
        cursor: pointer;
        font: inherit;
        text-align: left;
        overflow: hidden;
      }

      .studio-frame-cell[data-selected="true"] {
        border-color: var(--studio-accent);
        box-shadow: inset 0 0 0 2px var(--studio-accent);
      }

      .studio-frame-cell[data-dragging="true"] {
        opacity: 0.55;
      }

      .studio-frame-cell[data-drop-target="true"] {
        border-color: var(--studio-accent);
        box-shadow:
          inset 0 0 0 1px var(--studio-accent),
          inset 3px 0 0 var(--studio-accent);
      }

      .studio-frame-index,
      .studio-frame-weight {
        color: var(--studio-muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10px;
      }

      .studio-frame-index {
        position: absolute;
        top: 4px;
        left: 6px;
        z-index: 1;
        pointer-events: none;
      }

      .studio-frame-thumb {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        mix-blend-mode: multiply;
      }

      .studio-frame-replace {
        position: absolute;
        right: 4px;
        bottom: 4px;
        min-height: 0;
        width: auto;
        padding: 2px 6px;
        border-radius: 2px;
        background: color-mix(in srgb, var(--studio-panel) 92%, transparent);
        color: var(--studio-muted);
        font-size: 10px;
        opacity: 0;
        transition: opacity 120ms ease;
      }

      .studio-frame-cell:hover .studio-frame-replace,
      .studio-frame-replace:focus-visible {
        opacity: 1;
      }

      .studio-weight-row {
        min-width: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid var(--studio-line-soft);
        border-radius: 2px;
        background: var(--studio-panel-alt);
        padding: 2px 4px;
      }

      .studio-weight-row[data-active="true"] {
        border-color: var(--studio-accent);
        background: var(--studio-accent-soft);
        color: var(--studio-accent);
      }

      .studio-weight-row .studio-button {
        width: 20px;
        min-height: 20px;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: center;
        font-size: 10px;
        opacity: 0.7;
      }

      .studio-weight-row .studio-button:hover {
        opacity: 1;
        background: transparent;
      }

      .studio-weight-label {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10px;
      }

      .studio-timeline-bar[data-row="weights"] {
        height: auto;
        min-height: 24px;
        margin-top: 4px;
      }

      .studio-timeline-tabs {
        display: flex;
        gap: 12px;
      }

      .studio-timeline-tab {
        color: var(--studio-faint);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .studio-timeline-tab[data-selected="true"] {
        color: var(--studio-text);
        font-weight: 600;
      }

      .studio-section {
        display: grid;
        gap: 7px;
        border-top: 1px solid var(--studio-line-soft);
        padding-top: 11px;
      }

      .studio-section:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .studio-section-title {
        color: var(--studio-muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .studio-info-row {
        display: grid;
        grid-template-columns: minmax(74px, auto) minmax(0, 1fr);
        gap: 8px;
        color: var(--studio-muted);
        font-size: 12px;
        line-height: 1.5;
      }

      .studio-info-row span:last-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--studio-text);
      }

      .studio-info-row-editable input {
        min-width: 0;
        width: 100%;
        border: 1px solid var(--studio-line);
        border-radius: 3px;
        background: var(--studio-panel);
        color: var(--studio-text);
        font: inherit;
        padding: 3px 5px;
      }

      .studio-section[data-tone="accent"] {
        border: 1px solid var(--studio-line-soft);
        border-left: 2px solid var(--studio-accent);
        border-radius: 3px;
        background: var(--studio-accent-soft);
        padding: 10px;
      }

      .studio-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }

      .studio-tree {
        display: grid;
        gap: 2px;
      }

      .studio-tree .studio-profile-select {
        min-height: 24px;
        padding: 3px 8px;
      }

      .studio-tree-anim-row,
      .studio-tree-floating {
        min-height: 22px;
      }

      .studio-profile-select {
        min-width: 0;
      }

      .studio-tree-chevron {
        width: 12px;
        font-size: 10px;
        color: var(--studio-muted);
        flex: 0 0 auto;
      }

      .studio-tree-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .studio-tree-row-label {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .studio-tree-subheader {
        margin: 9px 0 2px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding-left: 20px;
        color: var(--studio-faint);
        font-size: 11px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .studio-tree-subheader::after {
        content: "";
        height: 1px;
        flex: 1;
        background: var(--studio-line-soft);
      }

      .studio-tree-divider {
        height: 1px;
        margin: 8px 0 2px 20px;
        background: var(--studio-line-soft);
      }

      .studio-tree-subheader[data-depth="1"],
      .studio-tree-floating[data-depth="1"] {
        margin-left: 12px;
      }

      .studio-tree-anim-row[data-depth="2"] {
        padding-left: 40px;
      }

      .studio-tree-subheader[data-depth="2"] {
        margin-left: 32px;
      }

      .studio-tree-anim-row[data-depth="3"] {
        padding-left: 56px;
      }

      .studio-tree-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--studio-faint);
        flex: 0 0 auto;
      }

      .studio-tree-count {
        color: var(--studio-muted);
        font-size: 11px;
        flex: 0 0 auto;
      }

      .studio-active-icon {
        width: 8px;
        height: 8px;
        border: 1px solid var(--studio-line);
        border-radius: 999px;
        background: var(--studio-accent);
        box-shadow: 0 0 0 2px var(--studio-accent-soft);
        flex: 0 0 auto;
      }

      .studio-button {
        width: 100%;
        min-height: 28px;
        border: 1px solid var(--studio-line);
        border-radius: 3px;
        background: var(--studio-panel);
        color: var(--studio-text);
        cursor: pointer;
        font: inherit;
        padding: 6px 8px;
        text-align: left;
      }

      .studio-button:hover {
        background: var(--studio-panel-alt);
      }

      .studio-button:disabled {
        opacity: 0.45;
        cursor: default;
      }

      .studio-button:disabled:hover {
        background: var(--studio-panel);
      }

      .studio-button[data-selected="true"] {
        border-color: var(--studio-line);
        background: var(--studio-accent-soft);
        box-shadow: inset 2px 0 0 var(--studio-accent);
      }

      .studio-form {
        display: grid;
        gap: 9px;
      }

      .studio-field {
        display: grid;
        gap: 5px;
        color: var(--studio-muted);
        font-size: 12px;
      }

      .studio-row-field {
        grid-template-columns: minmax(86px, auto) minmax(0, 1fr);
        align-items: center;
      }

      .studio-help {
        border-bottom: 1px dotted var(--studio-muted);
        cursor: help;
      }

      .studio-field input,
      .studio-field select {
        width: 100%;
        border: 1px solid var(--studio-line);
        border-radius: 3px;
        background: var(--studio-panel);
        color: var(--studio-text);
        font: inherit;
        padding: 6px 8px;
      }

      .studio-field input[type="checkbox"] {
        width: auto;
        justify-self: end;
      }

      .preview-frame {
        max-width: min(520px, 88%);
        max-height: min(620px, 74vh);
        object-fit: contain;
        image-rendering: auto;
        mix-blend-mode: multiply;
      }

      .studio-preview-stage {
        position: relative;
        display: grid;
        place-items: center;
        width: min(620px, 88%);
        min-height: min(560px, 68vh);
        background: transparent;
      }

      .studio-preview-overlay {
        position: absolute;
        top: 12px;
        left: 14px;
        color: var(--studio-muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10px;
        letter-spacing: 0.02em;
      }

      .studio-preview-overlay[data-align="right"] {
        top: 12px;
        right: 14px;
        left: auto;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .studio-preview-overlay[data-align="right"]::before {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: var(--studio-accent);
        content: "";
      }

      .empty-state {
        margin: 0;
        color: var(--studio-muted);
        font-size: 12px;
        line-height: 1.4;
      }

      .studio-toast-region {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 20;
        display: grid;
        gap: 8px;
        max-width: min(360px, calc(100vw - 36px));
        pointer-events: none;
      }

      .studio-toast {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        animation: studio-toast-enter 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        border: 1px solid var(--studio-line);
        border-left: 3px solid var(--studio-accent);
        border-radius: 4px;
        background: var(--studio-panel);
        box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
        color: var(--studio-text);
        font: inherit;
        line-height: 1.35;
        padding: 9px 11px;
        pointer-events: auto;
        text-align: left;
      }

      .studio-toast[data-leaving="true"] {
        animation: studio-toast-exit 180ms ease forwards;
      }

      .studio-toast[data-kind="error"] {
        border-left-color: #b24b4b;
      }

      .studio-toast-message {
        flex: 1;
      }

      .studio-toast-close {
        width: auto;
        min-width: 20px;
        min-height: 20px;
        border: 0;
        background: transparent;
        color: var(--studio-muted);
        cursor: pointer;
        font: inherit;
        line-height: 1;
        padding: 0;
        text-align: center;
      }

      @keyframes studio-toast-enter {
        from {
          opacity: 0;
          transform: translateX(24px);
        }

        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes studio-toast-exit {
        from {
          opacity: 1;
          transform: translateY(0);
        }

        to {
          opacity: 0;
          transform: translateY(16px);
        }
      }

      .studio-modal-root[hidden] {
        display: none;
      }

      .studio-modal-root {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: grid;
        place-items: center;
        padding: 24px;
        background: color-mix(in oklab, #20160f 32%, transparent);
      }

      .studio-modal-card {
        width: min(440px, 100%);
        padding: 20px;
        border: 1px solid var(--studio-line);
        border-radius: 6px;
        background: var(--studio-panel);
        box-shadow: 0 16px 48px rgb(0 0 0 / 18%);
      }

      .studio-modal-card h3 {
        margin: 0 0 10px;
        font-size: 18px;
      }

      .studio-modal-copy {
        margin: 0 0 14px;
        color: var(--studio-muted);
        line-height: 1.45;
      }

      .studio-modal-form {
        display: grid;
        gap: 10px;
      }

      .studio-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 6px;
      }

      .studio-modal-actions .studio-button[data-tone="thin"] {
        width: auto;
        min-height: 24px;
        padding: 4px 10px;
      }

      @media (max-width: 920px) {
        main {
          grid-template-columns: 1fr;
        }

        [data-region="left"],
        [data-region="right"] {
          border: 0;
          border-bottom: 1px solid var(--studio-line);
        }
      }
    </style>
    <main>
      <section class="studio-pane" data-region="left">
        <div class="region-head">
          <span>Profiles</span>
          <div class="region-head-actions">
            <button class="studio-button studio-head-button" type="button" data-role="import-profile" aria-label="Import profile" title="Import">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M8 2v8" />
                <path d="M5 7.5 8 10.5l3-3" />
                <path d="M3 12.5h10" />
              </svg>
            </button>
            <button class="studio-button studio-head-button" type="button" data-role="add-profile" aria-label="Duplicate profile" title="Duplicate">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="5" y="4" width="7" height="8" rx="1" />
                <path d="M4 10H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1" />
              </svg>
            </button>
          </div>
        </div>
        <div class="region-body" data-role="profiles-body"></div>
      </section>
      <section class="studio-center">
        <section class="studio-pane" data-region="center-meta">
          <div class="region-head">Editing</div>
          <div class="region-body" data-role="meta-body"></div>
        </section>
        <section class="studio-pane" data-region="center-preview">
          <div class="region-head">Preview</div>
          <div class="region-body" data-role="preview-body"></div>
        </section>
        <section class="studio-pane" data-region="center-timeline">
          <div class="region-head">Timeline</div>
          <div class="region-body" data-role="timeline-body"></div>
        </section>
      </section>
      <aside class="studio-pane" data-region="right">
        <div class="region-head">Inspector</div>
        <div class="region-body" data-role="inspector-body"></div>
      </aside>
    </main>
    <div class="studio-toast-region" data-role="toast-body" aria-live="polite" aria-atomic="false"></div>
    <div class="studio-modal-root" data-role="profile-import-modal" hidden></div>
    <div class="studio-modal-root" data-role="profile-export-modal" hidden></div>
  `;
}
