const el = document.getElementById('timer');
let visible = false;

// Anchor proportional to position so the text hugs edges based on its own
// size: x=0 aligns its left edge, x=100 its right edge, x=50 centers it.
let curX = 50;
let curY = 50;
let curScale = 1;

// Keep the (scaled) text fully on screen regardless of font size: after
// applying the proportional anchor, measure the box and nudge it back inside
// the viewport with a pixel correction. If it is genuinely larger than the
// screen, pin it to the top/left so at least that corner is visible.
function clamp() {
  el.style.translate = `${-curX}% ${-curY}%`;
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let dx = 0;
  if (r.width > vw) dx = -r.left;
  else if (r.left < 0) dx = -r.left;
  else if (r.right > vw) dx = vw - r.right;

  let dy = 0;
  if (r.height > vh) dy = -r.top;
  else if (r.top < 0) dy = -r.top;
  else if (r.bottom > vh) dy = vh - r.bottom;

  if (dx || dy) {
    el.style.translate = `calc(${-curX}% + ${dx}px) calc(${-curY}% + ${dy}px)`;
  }
}

function applyLayout() {
  el.style.left = curX + '%';
  el.style.top = curY + '%';
  el.style.scale = String(curScale);
  clamp();
}

function render(state) {
  if (typeof state.text === 'string') el.textContent = state.text;
  if (typeof state.fontSize === 'number') el.style.fontSize = state.fontSize + 'px';
  if (typeof state.fontFamily === 'string') el.style.fontFamily = state.fontFamily;
  if (typeof state.color === 'string') el.style.color = state.color;
  if (typeof state.outline === 'boolean') el.classList.toggle('outline', state.outline);
  if (typeof state.x === 'number') curX = state.x;
  if (typeof state.y === 'number') curY = state.y;
  if (typeof state.emphasis === 'boolean') {
    curScale = state.emphasis ? (state.emphasisScale || 1.6) : 1;
  }
  applyLayout();
  el.style.display = visible ? 'block' : 'none';
}

window.overlay.onUpdate((state) => {
  render(state);
});

window.overlay.onVisible((v) => {
  visible = v;
  el.style.display = visible ? 'block' : 'none';
  if (visible) clamp();
});

// Re-clamp once the enlarge animation settles (ticks may have stopped, e.g.
// while holding an at-zero message) and if the display size changes.
el.addEventListener('transitionend', clamp);
window.addEventListener('resize', clamp);
