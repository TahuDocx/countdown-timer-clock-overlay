const el = document.getElementById('timer');
let visible = false;

function render(state) {
  if (typeof state.text === 'string') el.textContent = state.text;
  if (typeof state.emphasis === 'boolean') el.classList.toggle('emphasis', state.emphasis);
  if (typeof state.fontSize === 'number') el.style.fontSize = state.fontSize + 'px';
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
