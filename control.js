// --- DOM ---
const $ = (id) => document.getElementById(id);
const modeEl = $('mode');
const durationBlock = $('durationBlock');
const targetBlock = $('targetBlock');
const minutesEl = $('minutes');
const secondsEl = $('seconds');
const targetTimeEl = $('targetTime');
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
let mode = 'countdown';      // 'countdown' | 'countto'
let remainingMs = 0;         // used by countdown (duration)
let targetEpoch = 0;         // used by countto (absolute wall-clock ms)
let running = false;
let tickHandle = null;
let lastTs = 0;
let overlayVisible = false;

// --- Helpers ---
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

// Current remaining ms for the active mode.
function currentRemaining() {
  if (mode === 'countto') return targetEpoch - Date.now();
  return remainingMs;
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

function pushUpdate() {
  window.overlay.update({
    text: format(currentRemaining()),
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
  if (mode === 'countdown') {
    const now = performance.now();
    remainingMs -= now - lastTs;
    lastTs = now;
  }
  // countto recomputes from wall clock inside currentRemaining(), no decrement.

  if (currentRemaining() <= 0) {
    if (mode === 'countdown') remainingMs = 0;
    pushUpdate();
    stop();
    setOverlayVisible(false); // auto-hide at zero (MVP)
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
  } else {
    targetEpoch = computeTargetEpoch();
    if (targetEpoch - Date.now() <= 0) return;
  }
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
  // countto can't truly pause (it's wall-clock anchored); treat as stop.
  statusEl.textContent = mode === 'countto' ? 'Stopped' : 'Paused';
}

function reset() {
  stop();
  if (mode === 'countdown') {
    setDurationFromInputs();
  } else {
    targetEpoch = computeTargetEpoch();
  }
  pushUpdate();
  statusEl.textContent = 'Reset';
}

function applyMode() {
  mode = modeEl.value;
  const isCountto = mode === 'countto';
  durationBlock.style.display = isCountto ? 'none' : '';
  targetBlock.style.display = isCountto ? '' : 'none';
  pauseBtn.textContent = isCountto ? 'Stop' : 'Pause';
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

toggleBtn.addEventListener('click', () => setOverlayVisible(!overlayVisible));

// --- Init ---
applyMode();
// Give the output window a moment to register its IPC listeners.
setTimeout(pushUpdate, 300);
