# Countdown Timer Overlay

Transparent countdown / timer / clock overlay for an external display. The output
window is fullscreen, transparent, always-on-top, and click-through, so it floats
over a presentation app (e.g. EasyWorship) on the secondary monitor. A separate
control window drives what shows, where, and how big.

## Features (MVP)

- **Two windows** — control (primary display) + transparent output (secondary display, auto-selected)
- **Countdown** from a set duration (min/sec) with Start / Pause / Reset
- **Movable + resizable** timer text — horizontal/vertical position (%) and font size
- **Click-through** overlay — mouse/keyboard pass to the app underneath
- **Auto-hide** when the countdown reaches `0:00`

Architected but not yet wired: count-up, live clock, countdown-to-clock-time,
monitor picker, color/font/outline controls, custom at-zero message.

## Develop

```bash
npm install
npm start
```

## Build a Windows .exe

```bash
npm run dist    # NSIS installer + portable exe -> dist/
npm run pack    # unpacked app dir only
```

Artifacts land in `dist/`:

- `CountdownOverlay Setup <version>.exe` — installer
- `CountdownOverlay-portable-<version>.exe` — portable, no install

> Build note: electron-builder's `winCodeSign` cache contains macOS symlinks that
> need Windows Developer Mode (or admin) to extract. If a build fails on that,
> enable Developer Mode, or pre-extract the cache archive excluding its `darwin/`
> folder.

## Icon

App icon is built from a [Tabler](https://tabler.io/icons) hourglass
(`assets/icon.svg` → `assets/icon.ico`).

## License

[MIT](LICENSE) © TahuDocx
