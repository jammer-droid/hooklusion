export function buildCharacterRendererHtml() {
  return `
    <style>
      html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
      }

      * {
        box-sizing: border-box;
      }

      main {
        position: relative;
      }

      [data-role="character-hover-outline"],
      [data-role="character-focus-backdrop"] {
        position: absolute;
        inset: 8px;
        border-radius: 30px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 140ms ease, border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
      }

      [data-role="character-hover-outline"] {
        border: 2px solid transparent;
      }

      [data-role="character-focus-backdrop"] {
        background: transparent;
        box-shadow: 0 0 0 2px rgba(255, 188, 124, 0.42);
      }

      body[data-hovering="true"]:not([data-focused="true"]) [data-role="character-hover-outline"] {
        opacity: 1;
        border-color: rgba(255, 188, 124, 0.55);
      }

      body[data-focused="true"] [data-role="character-focus-backdrop"] {
        opacity: 1;
      }

      body[data-dragging="true"] [data-role="character-focus-backdrop"] {
        box-shadow: 0 0 0 2px rgba(255, 188, 124, 0.85);
      }

      [data-role="character-resize-handle"] {
        position: absolute;
        width: 20px;
        height: 20px;
        background: transparent;
        pointer-events: auto;
        z-index: 10;
      }

      [data-role="character-resize-handle"][data-corner="nw"] {
        top: 0;
        left: 0;
        cursor: nwse-resize;
      }

      [data-role="character-resize-handle"][data-corner="ne"] {
        top: 0;
        right: 0;
        cursor: nesw-resize;
      }

      [data-role="character-resize-handle"][data-corner="sw"] {
        bottom: 0;
        left: 0;
        cursor: nesw-resize;
      }

      [data-role="character-resize-handle"][data-corner="se"] {
        bottom: 0;
        right: 0;
        cursor: nwse-resize;
      }
    </style>
    <main style="width: 100vw; height: 100vh; display: grid; place-items: center; margin: 0; overflow: hidden; background: transparent; user-select: none;">
      <section data-role="character-frame" style="position: relative; width: 100%; height: 100%; display: grid; place-items: center; padding: 10px; cursor: grab;">
        <div data-role="character-focus-backdrop"></div>
        <div data-role="character-hover-outline"></div>
        <div style="position: relative; width: 100%; height: 100%; max-width: calc((100vh - 28px) * 0.7778); max-height: calc(100vw / 0.7778); aspect-ratio: 7 / 9; overflow: visible;">
          <div id="character-stage" style="position: absolute; inset: 0; transform-origin: 50% 86%; will-change: transform;">
            <img id="character-previous" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition-property: opacity; object-fit: contain; pointer-events: none;" />
            <img id="character-current" alt="character" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 1; transition-property: opacity; object-fit: contain; pointer-events: none;" />
          </div>
        </div>
      </section>
      <div data-role="character-resize-handle" data-corner="nw"></div>
      <div data-role="character-resize-handle" data-corner="ne"></div>
      <div data-role="character-resize-handle" data-corner="sw"></div>
      <div data-role="character-resize-handle" data-corner="se"></div>
    </main>
  `;
}
