// --- DOM ---
const $ = (id) => document.getElementById(id);
const minutesEl = $('minutes');
const secondsEl = $('seconds');
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
let remainingMs = 0;
let running = false;
let tickHandle = null;
let lastTs = 0;
let overlayVisible = false;

function setDurationFromInputs() {
  const m = Math.max(0, parseInt(minutesEl.value, 10) || 0);
  const s = Math.min(59, Math.max(0, parseInt(secondsEl.value, 10) || 0));
  remainingMs = (m * 60 + s) * 1000;
}

function format(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function pushUpdate() {
  window.overlay.update({
    text: format(remainingMs),
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

function tick() {
  const now = performance.now();
  const dt = now - lastTs;
  lastTs = now;
  remainingMs -= dt;

  if (remainingMs <= 0) {
    remainingMs = 0;
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
  if (remainingMs <= 0) setDurationFromInputs();
  if (remainingMs <= 0) return;
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
  statusEl.textContent = 'Paused';
}

function reset() {
  stop();
  setDurationFromInputs();
  pushUpdate();
  statusEl.textContent = 'Reset';
}

// --- Events ---
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);

fontEl.addEventListener('input', () => { fontVal.textContent = fontEl.value; pushUpdate(); });
posXEl.addEventListener('input', () => { xVal.textContent = posXEl.value; pushUpdate(); });
posYEl.addEventListener('input', () => { yVal.textContent = posYEl.value; pushUpdate(); });

minutesEl.addEventListener('change', () => { if (!running) reset(); });
secondsEl.addEventListener('change', () => { if (!running) reset(); });

toggleBtn.addEventListener('click', () => setOverlayVisible(!overlayVisible));

// --- Init ---
setDurationFromInputs();
// Give the output window a moment to register its IPC listeners.
setTimeout(pushUpdate, 300);
