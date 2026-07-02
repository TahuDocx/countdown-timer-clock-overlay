# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install     # deps (Electron + electron-builder only)
npm start       # run the app (electron .)
npm run dist    # build NSIS installer + portable .exe -> dist/
npm run pack    # unpacked app dir only (faster; no installer)
```

No tests, no linter, no build/transpile step — source runs as-is in Electron.

Build note: electron-builder's `winCodeSign` cache has macOS symlinks that need
Windows Developer Mode (or admin) to extract. If a build fails there, enable
Developer Mode or pre-extract the cache excluding its `darwin/` folder.

## Architecture

Two-window Electron app. Plain JS + HTML/CSS, no framework, no bundler.

- **Control window** (`control.html` / `control.js`) — on the primary display.
  Holds the **timer engine** and all UI state. This is where the clock actually
  ticks (`setInterval(tick, 200)` in [control.js](control.js)).
- **Output window** (`output.html` / `output.js`) — fullscreen, transparent,
  always-on-top, click-through overlay on the secondary display (auto-picked by
  `pickOutputDisplay()`). Pure renderer: it only draws frames it's told to draw,
  no timing logic of its own.
- **Main process** (`main.js`) — creates both windows, relays messages between
  them, persists settings, and recovers a dead overlay.

### Data flow (one direction)

`control.js` computes a **frame** each tick (`buildFrame()` → `{text, emphasis,
fontSize, fontFamily, color, outline, x, y, ...}`) and sends it via
`window.overlay.update(frame)`. The frame travels:

```
control.js → preload-control.js → ipcMain 'overlay:update' (main.js)
           → outputWin.webContents 'overlay:update' → output.js render()
```

`output.js` is a dumb mirror of that frame. `control.js` also renders the same
frame into its own scaled-down **preview** (`renderPreview()`) — the preview is a
re-render, NOT a screen capture of the overlay. Any change to how a frame looks
must be applied in **both** `output.js` (real overlay) and `control.js`'s preview
path, or the two drift apart. The text-clamping logic is deliberately duplicated:
`clamp()` in output.js and `clampPreview()` in control.js.

### IPC surface

Preloads (`contextIsolation: true`, no nodeIntegration) expose a single
`window.overlay` bridge:

- **control** (`preload-control.js`): `update`, `setVisible`, `loadSettings`, `saveSettings`
- **output** (`preload-output.js`): `onUpdate`, `onVisible`

Channels: `overlay:update`, `overlay:visible`, `settings:load` (invoke),
`settings:save`.

### Timer modes

Four modes in `control.js`, switched by `applyMode()`:
`countdown` (duration), `countto` (wall-clock target, derived from `Date.now()`,
no accumulator), `countup` (stopwatch, can overrun), `clock` (live time).
`isFinished()` / `emphasisFor()` branch on mode — touch every mode when editing them.

### Overlay resilience (main.js)

Main caches `lastFrame` / `lastVisible`. If the overlay window is gone (crash →
`render-process-gone`, or unexpected close), the next relay calls
`ensureOutputWindow()` to recreate it, then `did-finish-load` replays the cached
state. `display-added`/`display-removed` reposition the overlay mid-session.
Background throttling is disabled (command-line switches + `backgroundThrottling:
false`) so the timer keeps ticking when covered by a presentation app.

### Settings persistence

Saved to `app.getPath('userData')/settings.json` (main.js). `settings:save` is
debounced 300ms (slider drags fire fast). Every control field auto-saves via
`SETTINGS_FIELDS`; `collectSettings()`/`applySettings()` are a manual pair — add a
new persisted field to `collectSettings`, `applySettings`, AND `SETTINGS_FIELDS`.

## Commit style

Conventional Commits: `type: summary` (imperative, lowercase). Types in use:
`feat`, `fix`, `docs`, `chore`. Examples from history:

```text
feat: respect prefers-reduced-motion for timer animations
fix: recreate and restore overlay window after crash or display changes
docs: add PRODUCT.md
chore: ignore .impeccable critique output
```

## Product intent

See [PRODUCT.md](PRODUCT.md): general-public tool, target WCAG AA, "legible in one
glance," friendly not a wall-of-knobs. Keep first-run clarity and keyboard
operability (Space = start/pause, R = reset, H = hide/show).
