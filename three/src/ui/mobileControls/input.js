const DIRECTIONS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyA: 'left', KeyS: 'down' };

export function createInput({ toggleDOF, quality, stats, stage, benchmark, mute = () => {}, debug = () => {}, canInput = () => true }, {
  windowTarget = window, documentTarget = document,
} = {}) {
  const keys = new Set(), pointers = new Map(), listeners = [];
  const actions = { KeyD: toggleDOF, KeyQ: quality, KeyM: mute, F4: debug, F3: stats, KeyE: stage, Space: stage, KeyB: benchmark };
  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push([target, type, handler]);
  };
  const reset = () => {
    keys.clear();
    for (const [id, held] of pointers) {
      if (held.button.hasPointerCapture?.(id)) held.button.releasePointerCapture(id);
    }
    pointers.clear();
  };
  listen(windowTarget, 'keydown', (event) => {
    if (event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
    const direction = DIRECTIONS[event.code], action = actions[event.code];
    if (!direction && !action) return;
    if (!canInput()) return;
    event.preventDefault();
    if (direction) keys.add(event.code);
    if (!event.repeat) action?.();
  });
  listen(windowTarget, 'keyup', (event) => { keys.delete(event.code); });
  listen(windowTarget, 'blur', reset);
  listen(documentTarget, 'visibilitychange', () => { if (documentTarget.hidden) reset(); });
  for (const button of documentTarget.querySelectorAll('[data-move]')) {
    listen(button, 'pointerdown', (event) => {
      if (!canInput()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { direction: button.dataset.move, button });
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      listen(button, type, (event) => pointers.delete(event.pointerId));
    }
    listen(button, 'contextmenu', (event) => event.preventDefault());
  }
  for (const [selector, action] of [
    ['#dof', toggleDOF], ['#quality', quality], ['#audio', mute], ['#debug', debug], ['#stats-toggle', benchmark], ['#stage', stage],
  ]) {
    const button = documentTarget.querySelector(selector);
    if (button) listen(button, 'click', () => { if (canInput()) action(); });
  }
  return {
    has: (direction) => canInput() && ([...keys].some((key) => DIRECTIONS[key] === direction) || [...pointers.values()].some((held) => held.direction === direction)),
    reset,
    dispose: () => { reset(); for (const [target, type, handler] of listeners) target.removeEventListener(type, handler); listeners.length = 0; },
  };
}
