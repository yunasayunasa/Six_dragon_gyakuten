export function createInput({ toggleDOF, quality, stats, stage }) {
  const keys = new Set(), pointers = new Map();
  const directions = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyA: 'left', KeyS: 'down' };
  const actions = { KeyD: toggleDOF, KeyQ: quality, F3: stats, KeyE: stage, Space: stage };
  window.addEventListener('keydown', (event) => {
    if (directions[event.code] || actions[event.code]) event.preventDefault();
    if (directions[event.code]) keys.add(event.code);
    if (!event.repeat) actions[event.code]?.();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); pointers.clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); pointers.clear(); } });
  for (const button of document.querySelectorAll('[data-move]')) {
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); pointers.set(event.pointerId, button.dataset.move); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, (event) => pointers.delete(event.pointerId));
  }
  document.querySelector('#dof').onclick = toggleDOF;
  document.querySelector('#quality').onclick = quality;
  document.querySelector('#stats-toggle').onclick = stats;
  document.querySelector('#stage').onclick = stage;
  return { has: (direction) => [...keys].some((key) => directions[key] === direction) || [...pointers.values()].includes(direction) };
}
