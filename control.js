// --- DOM ---
const $ = (id) => document.getElementById(id);
const modeEl = $('mode');
const durationBlock = $('durationBlock');
const targetBlock = $('targetBlock');
const minutesEl = $('minutes');
const secondsEl = $('seconds');
const targetTimeEl = $('targetTime');
const thresholdEl = $('threshold');
const thresholdLabel = $('thresholdLabel');
const thresholdHint = $('thresholdHint');
const startBtn = $('start');
const pauseBtn = $('pause');
const resetBtn = $('reset');
const fontEl = $('fontSize');
const fontVal = $('fontVal');
const posXEl = $('posX');
const posYEl = $('posY');
const xVal = $('xVal');
const yVal = $('yVal');
const toggleBtn = $('toggle');
const statusEl = $('status');

// --- State ---
let mode = 'countdown';      // 'countdown' | 'countto' | 'countup'
let remainingMs = 0;         // countdown (duration), decremented
let targetEpoch = 0;         // countto, absolute wall-clock ms
let elapsedMs = 0;           // countup, incremented
let running = false;
let tickHandle = null;
let lastTs = 0;
let overlayVisible = false;

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

// Countdown/countto end at zero; countup never ends.
function isFinished() {
  return mode !== 'countup' && displayMs() <= 0;
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
  window.overlay.update({
    text: format(value),
    emphasis: emphasisFor(value),
    fontSize: parseInt(fontEl.value, 10),
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
    pushUpdate();
    stop();
    setOverlayVisible(false); // auto-hide at zero (countdown/countto)
    statusEl.textContent = 'Finished — overlay hidden';
    return;
  }
  pushUpdate();
}

function start() {
  if (running) return;
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
  // countto is wall-clock anchored — pause is really a stop.
  statusEl.textContent = mode === 'countto' ? 'Stopped' : 'Paused';
}

function reset() {
  stop();
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
  pauseBtn.textContent = mode === 'countto' ? 'Stop' : 'Pause';

  if (mode === 'countup') {
    thresholdLabel.textContent = 'Overrun limit (enlarges text)';
    thresholdHint.textContent = 'sec elapsed (0 = off)';
  } else {
    thresholdLabel.textContent = 'Warning threshold (enlarges text)';
    thresholdHint.textContent = 'sec left (0 = off)';
  }
  reset();
}

// --- Events ---
modeEl.addEventListener('change', applyMode);
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);

fontEl.addEventListener('input', () => { fontVal.textContent = fontEl.value; pushUpdate(); });
posXEl.addEventListener('input', () => { xVal.textContent = posXEl.value; pushUpdate(); });
posYEl.addEventListener('input', () => { yVal.textContent = posYEl.value; pushUpdate(); });

minutesEl.addEventListener('change', () => { if (!running) reset(); });
secondsEl.addEventListener('change', () => { if (!running) reset(); });
targetTimeEl.addEventListener('change', () => { if (!running) reset(); });

thresholdEl.addEventListener('input', pushUpdate);

toggleBtn.addEventListener('click', () => setOverlayVisible(!overlayVisible));

// --- Init ---
applyMode();
// Give the output window a moment to register its IPC listeners.
setTimeout(pushUpdate, 300);
