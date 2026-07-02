// --- DOM ---
const $ = (id) => document.getElementById(id);
const modeEl = $('mode');
const durationBlock = $('durationBlock');
const targetBlock = $('targetBlock');
const thresholdBlock = $('thresholdBlock');
const minutesEl = $('minutes');
const secondsEl = $('seconds');
const targetTimeEl = $('targetTime');
const thresholdEl = $('threshold');
const thresholdLabel = $('thresholdLabel');
const thresholdHint = $('thresholdHint');
const modeHint = $('modeHint');
const endMessageBlock = $('endMessageBlock');
const endMessageEl = $('endMessage');
const autoHideEl = $('autoHide');
const hideDelayEl = $('hideDelay');
const hideDelayRow = $('hideDelayRow');
const startBtn = $('start');
const pauseBtn = $('pause');
const resetBtn = $('reset');
const fontEl = $('fontSize');
const enlargeEl = $('enlarge');
const posXEl = $('posX');
const posYEl = $('posY');
const xVal = $('xVal');
const yVal = $('yVal');
const fontFamilyEl = $('fontFamily');
const colorEl = $('color');
const outlineEl = $('outline');
const toggleBtn = $('toggle');
const statusEl = $('status');
const previewBox = $('previewBox');
const previewTimer = $('previewTimer');

// The output overlay fills the display; assume ~1080p tall so the preview
// scales the font down proportionally to its own (much smaller) box.
const ASSUMED_SCREEN_HEIGHT = 1080;

// --- State ---
let mode = 'countdown';      // 'countdown' | 'countto' | 'countup' | 'clock'
let remainingMs = 0;         // countdown (duration), decremented
let targetEpoch = 0;         // countto, absolute wall-clock ms
let elapsedMs = 0;           // countup, incremented
let running = false;
let paused = false;         // stopped mid-countdown with time on the clock
let tickHandle = null;
let lastTs = 0;
let overlayVisible = false;
let hideTimer = null;        // pending auto-hide after the at-zero message

// --- Input helpers ---
function setDurationFromInputs() {
  const m = Math.max(0, parseInt(minutesEl.value, 10) || 0);
  const s = Math.min(59, Math.max(0, parseInt(secondsEl.value, 10) || 0));
  remainingMs = (m * 60 + s) * 1000;
}

// Next occurrence of HH:MM — today if still ahead, else tomorrow.
function computeTargetEpoch() {
  const [h, m] = (targetTimeEl.value || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime();
}

function thresholdMs() {
  return Math.max(0, parseInt(thresholdEl.value, 10) || 0) * 1000;
}

// Value currently shown (ms). Countdown/countto = time left; countup = time elapsed.
function displayMs() {
  if (mode === 'countto') return targetEpoch - Date.now();
  if (mode === 'countup') return elapsedMs;
  return remainingMs;
}

// Countdown/countto end at zero; countup and clock never end.
function isFinished() {
  return (mode === 'countdown' || mode === 'countto') && displayMs() <= 0;
}

function format(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Current wall-clock time as HH:MM:SS (24-hour).
function formatClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Begin the grow 1s before the threshold so the 2s transition leads into it.
const EMPHASIS_LEAD_MS = 1000;

// Threshold crossed → emphasize (enlarge) the text.
function emphasisFor(value) {
  const thr = thresholdMs();
  if (thr <= 0) return false;
  if (mode === 'countup') {
    // Overrun: start growing 1s before elapsed reaches the limit.
    return value >= thr - EMPHASIS_LEAD_MS;
  }
  // Warning: start growing 1s before time left hits the threshold.
  return value > 0 && value <= thr + EMPHASIS_LEAD_MS;
}

// One render frame: the exact state sent to the overlay and mirrored in the
// preview. Callers may override fields (e.g. the at-zero message text).
function buildFrame() {
  const value = displayMs();
  const isClock = mode === 'clock';
  return {
    text: isClock ? formatClock() : format(value),
    emphasis: isClock ? false : emphasisFor(value),
    emphasisScale: parseFloat(enlargeEl.value) || 1.6,
    fontSize: parseInt(fontEl.value, 10),
    fontFamily: fontFamilyEl.value,
    color: colorEl.value,
    outline: outlineEl.checked,
    x: parseInt(posXEl.value, 10),
    y: parseInt(posYEl.value, 10),
  };
}

// Mirror a frame in the control-window preview (scaled-down, not a capture).
let previewX = 50;
let previewY = 50;

// Same idea as output.js clamp(): after the proportional anchor, measure the
// text box and nudge it back inside the preview with a pixel correction.
function clampPreview() {
  previewTimer.style.translate = `${-previewX}% ${-previewY}%`;
  const box = previewBox.getBoundingClientRect();
  const r = previewTimer.getBoundingClientRect();

  let dx = 0;
  if (r.width > box.width) dx = box.left - r.left;
  else if (r.left < box.left) dx = box.left - r.left;
  else if (r.right > box.right) dx = box.right - r.right;

  let dy = 0;
  if (r.height > box.height) dy = box.top - r.top;
  else if (r.top < box.top) dy = box.top - r.top;
  else if (r.bottom > box.bottom) dy = box.bottom - r.bottom;

  if (dx || dy) {
    previewTimer.style.translate = `calc(${-previewX}% + ${dx}px) calc(${-previewY}% + ${dy}px)`;
  }
}

function renderPreview(frame) {
  const scale = (previewBox.clientHeight || 1) / ASSUMED_SCREEN_HEIGHT;
  previewTimer.textContent = frame.text;
  previewTimer.style.fontSize = Math.max(1, frame.fontSize * scale) + 'px';
  previewTimer.style.fontFamily = frame.fontFamily;
  previewTimer.style.color = frame.color;
  previewTimer.classList.toggle('outline', frame.outline);
  previewTimer.style.left = frame.x + '%';
  previewTimer.style.top = frame.y + '%';
  previewTimer.style.scale = String(frame.emphasis ? frame.emphasisScale : 1);
  previewX = frame.x;
  previewY = frame.y;
  clampPreview();
}

// Re-clamp when the enlarge animation settles or the window is resized.
previewTimer.addEventListener('transitionend', clampPreview);
window.addEventListener('resize', clampPreview);

function pushUpdate() {
  const frame = buildFrame();
  window.overlay.update(frame);
  renderPreview(frame);
}

function setOverlayVisible(v) {
  overlayVisible = v;
  window.overlay.setVisible(v);
  toggleBtn.textContent = v ? 'Hide overlay' : 'Show overlay';
  toggleBtn.classList.toggle('on', v);
}

// --- Engine ---
function tick() {
  const now = performance.now();
  const dt = now - lastTs;
  lastTs = now;

  if (mode === 'countdown') remainingMs -= dt;
  else if (mode === 'countup') elapsedMs += dt;
  // countto derives from wall clock; no accumulator.

  if (isFinished()) {
    if (mode === 'countdown') remainingMs = 0;
    stop();
    const msg = endMessageEl.value.trim();
    if (msg) {
      // Non-empty message: hold the overlay showing the custom text.
      // Keep the enlarged size if threshold emphasis was active — don't shrink.
      const frame = buildFrame();
      frame.text = msg;
      frame.emphasis = thresholdMs() > 0;
      window.overlay.update(frame);
      renderPreview(frame);
      if (autoHideEl.checked) {
        const secs = Math.max(0, parseInt(hideDelayEl.value, 10) || 0);
        statusEl.textContent = `Finished — showing "${msg}", hiding in ${secs}s`;
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          hideTimer = null;
          setOverlayVisible(false);
          statusEl.textContent = 'Finished — overlay hidden';
        }, secs * 1000);
      } else {
        statusEl.textContent = `Finished — showing "${msg}"`;
      }
    } else {
      // Empty message: fall back to auto-hide at zero.
      pushUpdate();
      setOverlayVisible(false);
      statusEl.textContent = 'Finished — overlay hidden';
    }
    return;
  }
  pushUpdate();
}

function start() {
  if (running) return;
  clearTimeout(hideTimer); hideTimer = null; // cancel any pending at-zero hide
  if (mode === 'countdown') {
    if (remainingMs <= 0) setDurationFromInputs();
    if (remainingMs <= 0) {
      statusEl.textContent = 'Set a duration first';
      return;
    }
  } else if (mode === 'countto') {
    targetEpoch = computeTargetEpoch();
    if (targetEpoch - Date.now() <= 0) return;
  }
  // countup just resumes from current elapsedMs.
  running = true;
  paused = false;
  previewTimer.classList.remove('paused');
  pauseBtn.disabled = false;
  lastTs = performance.now();
  tickHandle = setInterval(tick, 200);
  setOverlayVisible(true);
  pushUpdate();
  statusEl.textContent = 'Running';
}

function stop() {
  running = false;
  pauseBtn.disabled = true;
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = null;
}

function pause() {
  if (!running) return;
  stop();
  paused = true;
  previewTimer.classList.add('paused');
  // countto/clock are wall-clock driven — pause is really a stop.
  statusEl.textContent = mode === 'countto' || mode === 'clock' ? 'Stopped' : 'Paused';
}

function reset() {
  stop();
  paused = false;
  previewTimer.classList.remove('paused');
  clearTimeout(hideTimer); hideTimer = null; // cancel any pending at-zero hide
  if (mode === 'countdown') setDurationFromInputs();
  else if (mode === 'countto') targetEpoch = computeTargetEpoch();
  else elapsedMs = 0;
  pushUpdate();
  statusEl.textContent = 'Reset';
}

const MODE_HINTS = {
  countdown: 'Counts down from a set duration.',
  countto: 'Counts down to a clock time — today, or tomorrow if already past.',
  countup: 'Counts up from zero, like a stopwatch.',
  clock: 'Shows the current time.',
};

function applyMode() {
  mode = modeEl.value;
  modeHint.textContent = MODE_HINTS[mode];
  durationBlock.style.display = mode === 'countdown' ? '' : 'none';
  targetBlock.style.display = mode === 'countto' ? '' : 'none';
  // Threshold/emphasis is meaningless for a live clock.
  thresholdBlock.style.display = mode === 'clock' ? 'none' : '';
  // At-zero message only applies to modes that actually finish.
  endMessageBlock.style.display = mode === 'countdown' || mode === 'countto' ? '' : 'none';
  pauseBtn.textContent = mode === 'countto' || mode === 'clock' ? 'Stop' : 'Pause';

  if (mode === 'countup') {
    thresholdLabel.textContent = 'Grow the text when over time';
    thresholdHint.textContent = 'seconds elapsed (0 = off)';
  } else {
    thresholdLabel.textContent = 'Grow the text when time is low';
    thresholdHint.textContent = 'seconds left (0 = off)';
  }
  reset();
}

// Delay input is only relevant when auto-hide is enabled; keep it visible
// but disabled so the option stays discoverable.
function updateHideDelayState() {
  const off = !autoHideEl.checked;
  hideDelayEl.disabled = off;
  hideDelayRow.classList.toggle('off', off);
}

// Enlarge ratio is meaningless while the threshold is 0 (feature off).
function updateEnlargeState() {
  const off = thresholdMs() <= 0;
  enlargeEl.disabled = off;
  enlargeEl.closest('.row').classList.toggle('off', off);
}

// --- Events ---
modeEl.addEventListener('change', applyMode);
autoHideEl.addEventListener('change', updateHideDelayState);
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);

fontEl.addEventListener('input', pushUpdate);
enlargeEl.addEventListener('input', pushUpdate);
posXEl.addEventListener('input', () => { xVal.textContent = posXEl.value; updatePosButtons(); pushUpdate(); });
posYEl.addEventListener('input', () => { yVal.textContent = posYEl.value; updatePosButtons(); pushUpdate(); });

// Position presets — jump X/Y to a corner/edge/center, then sync + save.
const posButtons = document.querySelectorAll('.pos');

// Highlight the preset matching the current X/Y (none if sliders are between).
function updatePosButtons() {
  posButtons.forEach((btn) => {
    btn.classList.toggle(
      'active',
      btn.dataset.x === posXEl.value && btn.dataset.y === posYEl.value
    );
  });
}

function setPosition(x, y) {
  posXEl.value = x; xVal.textContent = x;
  posYEl.value = y; yVal.textContent = y;
  updatePosButtons();
  pushUpdate();
  persist();
}
posButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setPosition(parseInt(btn.dataset.x, 10), parseInt(btn.dataset.y, 10));
  });
});

// Editing the time while idle re-arms the timer. A paused countdown keeps
// its remaining time; the new duration takes effect on Reset.
function onDurationEdit() {
  if (running) return;
  if (paused && mode === 'countdown') {
    statusEl.textContent = 'New duration applies on reset';
    return;
  }
  reset();
  statusEl.textContent = 'Duration updated';
}
minutesEl.addEventListener('change', onDurationEdit);
secondsEl.addEventListener('change', onDurationEdit);
targetTimeEl.addEventListener('change', () => {
  if (!running) { reset(); statusEl.textContent = 'Target time updated'; }
});

thresholdEl.addEventListener('input', () => { updateEnlargeState(); pushUpdate(); });

fontFamilyEl.addEventListener('change', pushUpdate);
colorEl.addEventListener('input', pushUpdate);
outlineEl.addEventListener('change', pushUpdate);

toggleBtn.addEventListener('click', () => setOverlayVisible(!overlayVisible));

// Keyboard shortcuts — ignored while typing in a field.
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  switch (e.key) {
    case ' ':
      e.preventDefault();
      if (running) pause(); else start();
      break;
    case 'r': case 'R':
      reset();
      break;
    case 'h': case 'H':
      setOverlayVisible(!overlayVisible);
      break;
  }
});

// --- Settings persistence ---
const SETTINGS_FIELDS = [
  modeEl, minutesEl, secondsEl, targetTimeEl, thresholdEl, enlargeEl, endMessageEl,
  autoHideEl, hideDelayEl, fontEl, posXEl, posYEl,
  fontFamilyEl, colorEl, outlineEl,
];

function collectSettings() {
  return {
    mode: modeEl.value,
    minutes: minutesEl.value,
    seconds: secondsEl.value,
    targetTime: targetTimeEl.value,
    threshold: thresholdEl.value,
    enlarge: enlargeEl.value,
    endMessage: endMessageEl.value,
    autoHide: autoHideEl.checked,
    hideDelay: hideDelayEl.value,
    fontFamily: fontFamilyEl.value,
    color: colorEl.value,
    outline: outlineEl.checked,
    fontSize: fontEl.value,
    posX: posXEl.value,
    posY: posYEl.value,
  };
}

function applySettings(s) {
  if (!s) return;
  if (s.mode) modeEl.value = s.mode;
  if (s.minutes != null) minutesEl.value = s.minutes;
  if (s.seconds != null) secondsEl.value = s.seconds;
  if (s.targetTime) targetTimeEl.value = s.targetTime;
  if (s.threshold != null) thresholdEl.value = s.threshold;
  if (s.endMessage != null) endMessageEl.value = s.endMessage;
  if (s.autoHide != null) autoHideEl.checked = s.autoHide;
  if (s.hideDelay != null) hideDelayEl.value = s.hideDelay;
  if (s.fontFamily) fontFamilyEl.value = s.fontFamily;
  if (s.color) colorEl.value = s.color;
  if (s.outline != null) outlineEl.checked = s.outline;
  if (s.fontSize != null) fontEl.value = s.fontSize;
  if (s.enlarge != null) enlargeEl.value = s.enlarge;
  if (s.posX != null) { posXEl.value = s.posX; xVal.textContent = s.posX; }
  if (s.posY != null) { posYEl.value = s.posY; yVal.textContent = s.posY; }
}

function persist() {
  window.overlay.saveSettings(collectSettings());
}

// Save on any control change (input covers sliders, change covers selects/numbers).
SETTINGS_FIELDS.forEach((el) => {
  el.addEventListener('input', persist);
  el.addEventListener('change', persist);
});

// --- Init ---
async function init() {
  const saved = await window.overlay.loadSettings();
  applySettings(saved);
  updatePosButtons();
  updateHideDelayState();
  updateEnlargeState();
  applyMode(); // reads inputs, toggles blocks, resets to the loaded config
  // Give the output window a moment to register its IPC listeners.
  setTimeout(pushUpdate, 300);
}

init();
