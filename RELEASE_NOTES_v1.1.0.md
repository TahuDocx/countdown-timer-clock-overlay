# Release Notes: Countdown Timer Overlay — v1.1.0

**Tag:** `v1.1.0`

A feature release focused on making the control window friendlier and the
overlay more resilient. Settings now persist between sessions, a live preview
shows exactly what the overlay will look like, and the overlay recovers on its
own from crashes and display changes.

## ✨ New Features

* **Settings persistence**
  * Every control — mode, times, appearance, position — is saved automatically
    and restored on the next launch.
* **Live preview**
  * A new preview panel in the control window mirrors the overlay (scaled down,
    with a transparency checkerboard), so placement and styling can be checked
    without glancing at the output display.
* **Position presets with edge clamping**
  * A 3×3 grid jumps the timer to any corner, edge, or center. Text is clamped
    to stay fully on screen regardless of font size.
* **Optional slide animation for presets**
  * A "Slide to preset" toggle glides the overlay to the chosen position over
    0.5s instead of jumping. Slider drags stay instant and live.
* **Custom at-zero message with auto-hide**
  * Show a custom message when the countdown ends (e.g. "Time's up!"), with an
    optional delay before the overlay hides itself.
* **Keyboard shortcuts**
  * `Space` start/pause · `R` reset · `H` show/hide overlay.
* **Appearance controls**
  * Font family, size, color, outline, and a configurable enlarge ratio for the
    warning-threshold emphasis.
* **Overlay fade**
  * The overlay now fades in and out instead of appearing and vanishing
    instantly.

## 🎨 Control Window Improvements

* Reorganized into grouped sections with a clear visual hierarchy — Start and
  the overlay toggle are the standout actions.
* Plain-language labels and per-mode explanations; status feedback sits next to
  the buttons that trigger it and is announced to screen readers.
* Options that don't currently apply are shown disabled instead of hidden
  (auto-hide delay, enlarge ratio), so features stay discoverable.
* A paused countdown keeps its remaining time when the duration is edited; the
  new value applies on reset.
* Animations respect the system reduced-motion setting.

## 🐛 Bug Fixes

* **Overlay recovery**
  * If the overlay window crashes or is closed unexpectedly, it is recreated
    automatically and restored to its last state.
  * When displays are plugged in or removed mid-session, the overlay moves to
    the best available display instead of getting stranded.

## 🛠️ Technical Notes

* The main process caches the last frame and visibility to replay after an
  overlay reload; `render-process-gone` is handled explicitly.
* Control-window colors are now CSS custom properties.
* Settings format is backward compatible — upgrading from 1.0.x is a drop-in
  replacement; existing `settings.json` files load unchanged.

## 📦 Downloads

* `CountdownOverlay Setup 1.1.0.exe` — installer (choose location, desktop shortcut)
* `CountdownOverlay-portable-1.1.0.exe` — portable, no installation required

> Binaries are unsigned — Windows SmartScreen will warn on first run. Choose
> **More info → Run anyway** to launch.
