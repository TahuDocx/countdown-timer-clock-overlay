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

// --- State ---
let mode = 'countdown';      // 'countdown' | 'countto' | 'countup' | 'clock'
let remainingMs = 0;         // countdown (duration), decremented
let targetEpoch = 0;         // countto, absolute wall-clock ms
let elapsedMs = 0;           // countup, incremented
let running = false;
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

function pushUpdate() {
  const value = displayMs();
  const isClock = mode === 'clock';
  window.overlay.update({
    text: isClock ? formatClock() : format(value),
    emphasis: isClock ? false : emphasisFor(value),
    emphasisScale: parseFloat(enlargeEl.value) || 1.6,
    fontSize: parseInt(fontEl.value, 10),
    fontFamily: fontFamilyEl.value,
    color: colorEl.value,
    outline: outlineEl.checked,
    x: parseInt(posXEl.value, 10),
    y: parseInt(posYEl.value, 10),
  });
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
      window.overlay.update({
        text: msg,
        emphasis: thresholdMs() > 0,
        emphasisScale: parseFloat(enlargeEl.value) || 1.6,
        fontSize: parseInt(fontEl.value, 10),
        fontFamily: fontFamilyEl.value,
        color: colorEl.value,
        outline: outlineEl.checked,
        x: parseInt(posXEl.value, 10),
        y: parseInt(posYEl.value, 10),
      });
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
    if (remainingMs <= 0) return;
  } else if (mode === 'countto') {
    targetEpoch = computeTargetEpoch();
    if (targetEpoch - Date.now() <= 0) return;
  }
  // countup just resumes from current elapsedMs.
  running = true;
  lastTs = performance.now();
  tickHandle = setInterval(tick, 200);
  setOverlayVisible(true);
  pushUpdate();
  statusEl.textContent = 'Running';
}

function stop() {
  running = false;
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = null;
}

function pause() {
  if (!running) return;
  stop();
  // countto/clock are wall-clock driven — pause is really a stop.
  statusEl.textContent = mode === 'countto' || mode === 'clock' ? 'Stopped' : 'Paused';
}

function reset() {
  stop();
  clearTimeout(hideTimer); hideTimer = null; // cancel any pending at-zero hide
  if (mode === 'countdown') setDurationFromInputs();
  else if (mode === 'countto') targetEpoch = computeTargetEpoch();
  else elapsedMs = 0;
  pushUpdate();
  statusEl.textContent = 'Reset';
}

function applyMode() {
  mode = modeEl.value;
  durationBlock.style.display = mode === 'countdown' ? '' : 'none';
  targetBlock.style.display = mode === 'countto' ? '' : 'none';
  // Threshold/emphasis is meaningless for a live clock.
  thresholdBlock.style.display = mode === 'clock' ? 'none' : '';
  // At-zero message only applies to modes that actually finish.
  endMessageBlock.style.display = mode === 'countdown' || mode === 'countto' ? '' : 'none';
  pauseBtn.textContent = mode === 'countto' || mode === 'clock' ? 'Stop' : 'Pause';

  if (mode === 'countup') {
    thresholdLabel.textContent = 'Overrun limit (enlarges text)';
    thresholdHint.textContent = 'sec elapsed (0 = off)';
  } else {
    thresholdLabel.textContent = 'Warning threshold (enlarges text)';
    thresholdHint.textContent = 'sec left (0 = off)';
  }
  reset();
}

// Delay input is only relevant when auto-hide is enabled.
function updateHideDelayVisibility() {
  hideDelayRow.style.display = autoHideEl.checked ? '' : 'none';
}

// --- Events ---
modeEl.addEventListener('change', applyMode);
autoHideEl.addEventListener('change', updateHideDelayVisibility);
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);

fontEl.addEventListener('input', pushUpdate);
enlargeEl.addEventListener('input', pushUpdate);
posXEl.addEventListener('input', () => { xVal.textContent = posXEl.value; pushUpdate(); });
posYEl.addEventListener('input', () => { yVal.textContent = posYEl.value; pushUpdate(); });

// Position presets — jump X/Y to a corner/edge/center, then sync + save.
function setPosition(x, y) {
  posXEl.value = x; xVal.textContent = x;
  posYEl.value = y; yVal.textContent = y;
  pushUpdate();
  persist();
}
document.querySelectorAll('.pos').forEach((btn) => {
  btn.addEventListener('click', () => {
    setPosition(parseInt(btn.dataset.x, 10), parseInt(btn.dataset.y, 10));
  });
});

minutesEl.addEventListener('change', () => { if (!running) reset(); });
secondsEl.addEventListener('change', () => { if (!running) reset(); });
targetTimeEl.addEventListener('change', () => { if (!running) reset(); });

thresholdEl.addEventListener('input', pushUpdate);

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
  updateHideDelayVisibility();
  applyMode(); // reads inputs, toggles blocks, resets to the loaded config
  // Give the output window a moment to register its IPC listeners.
  setTimeout(pushUpdate, 300);
}

init();
