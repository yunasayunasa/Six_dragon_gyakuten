// Owns browser suspension and the frame clock. Rendering may continue while
// updates and benchmark samples are paused.
export class ApplicationLifecycle {
  constructor({ windowTarget = window, documentTarget = document, onSuspend = () => {}, onResume = () => {} } = {}) {
    this.windowTarget = windowTarget;
    this.documentTarget = documentTarget;
    this.onSuspend = onSuspend;
    this.onResume = onResume;
    this.manualPaused = false;
    this.blurred = false;
    this.pageHidden = false;
    this.lastTime = null;
    this.disposed = false;
    this.listeners = [];
    this.listen(windowTarget, 'blur', () => this.setBrowserState('blurred', true));
    this.listen(windowTarget, 'focus', () => this.setBrowserState('blurred', false));
    this.listen(windowTarget, 'pagehide', () => this.setBrowserState('pageHidden', true));
    this.listen(windowTarget, 'pageshow', () => {
      this.setBrowserState('pageHidden', false);
      this.setBrowserState('blurred', false);
    });
    this.listen(documentTarget, 'visibilitychange', () => this.refreshVisibility());
  }

  listen(target, type, listener) {
    target.addEventListener(type, listener);
    this.listeners.push([target, type, listener]);
  }

  get active() {
    return !this.manualPaused && !this.blurred && !this.pageHidden && !this.documentTarget.hidden;
  }

  setBrowserState(field, value) {
    const wasActive = this.active;
    this[field] = value;
    this.changed(wasActive);
  }

  refreshVisibility() {
    // document.hidden has already changed when visibilitychange is delivered.
    this.lastTime = null;
    if (this.documentTarget.hidden) this.onSuspend();
    else if (this.active) this.onResume();
  }

  setPaused(value) { this.setBrowserState('manualPaused', Boolean(value)); }

  changed(wasActive) {
    if (wasActive === this.active) return;
    this.lastTime = null;
    if (!this.active) this.onSuspend();
    else this.onResume();
  }

  tick(now) {
    const elapsed = this.lastTime === null ? 0 : Math.max(0, (now - this.lastTime) / 1000);
    this.lastTime = now;
    return this.active ? elapsed : 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const [target, type, listener] of this.listeners) target.removeEventListener(type, listener);
    this.listeners.length = 0;
  }
}
