const el = document.getElementById('timer');
let visible = false;

function render(state) {
  if (typeof state.text === 'string') el.textContent = state.text;
  if (typeof state.emphasis === 'boolean') {
    const scale = state.emphasis ? (state.emphasisScale || 1.6) : 1;
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  if (typeof state.fontSize === 'number') el.style.fontSize = state.fontSize + 'px';
  if (typeof state.fontFamily === 'string') el.style.fontFamily = state.fontFamily;
  if (typeof state.color === 'string') el.style.color = state.color;
  if (typeof state.outline === 'boolean') el.classList.toggle('outline', state.outline);
  if (typeof state.x === 'number') el.style.left = state.x + '%';
  if (typeof state.y === 'number') el.style.top = state.y + '%';
  el.style.display = visible ? 'block' : 'none';
}

window.overlay.onUpdate((state) => {
  render(state);
});

window.overlay.onVisible((v) => {
  visible = v;
  el.style.display = visible ? 'block' : 'none';
});
