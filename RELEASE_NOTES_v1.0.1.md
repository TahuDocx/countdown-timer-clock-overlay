# Release Notes: Countdown Timer Overlay — v1.0.1

**Tag:** `v1.0.1`

A minor patch release. No new features — this fixes a timer freeze that could
occur while the app was running in the background.

## 🐛 Bug Fixes

* **Timer freezing in the background**
  * The countdown could stall or freeze when the control window was minimized or
    when the overlay was fully covered by another app (e.g. EasyWorship in
    fullscreen).
  * Cause: Chromium throttles or suspends background timers and occluded
    renderers by default.
  * Fix: background throttling is now disabled for both windows, and the
    relevant Chromium backgrounding behaviors are turned off, so the timer keeps
    ticking reliably even when the app is not in the foreground.

## 🛠️ Technical Notes

* Set `backgroundThrottling: false` on the control and output windows.
* Added Chromium command-line switches: `disable-background-timer-throttling`,
  `disable-renderer-backgrounding`, and `disable-backgrounding-occluded-windows`.
* No changes to features, controls, or file formats. Upgrading from 1.0.0 is
  a drop-in replacement.

## 📦 Downloads

* `CountdownOverlay Setup 1.0.1.exe` — installer (choose location, desktop shortcut)
* `CountdownOverlay-portable-1.0.1.exe` — portable, no installation required

> Binaries are unsigned — Windows SmartScreen will warn on first run. Choose
> **More info → Run anyway** to launch.
