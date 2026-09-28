// Optional DPR-only adaptation. Manual quality and DOF stay under user control.
// Disable during benchmark so comparisons use an unchanged rendering profile.
export class QualityManager {
  constructor(dof, { enabled = false, onChange = () => {}, minimum = 0.65 } = {}) {
    this.dof = dof;
    this.enabled = enabled;
    this.onChange = onChange;
    this.minimum = minimum;
    this.manualCap = dof.pixelRatioCap;
    this.adaptiveCap = null;
    this.slow = 0;
    this.fast = 0;
  }

  baseCap() {
    const profile = this.dof.qualityProfiles[this.dof.quality];
    return this.manualCap ?? profile[this.dof.mobile ? 'mobile' : 'desktop'];
  }

  apply(cap) {
    this.adaptiveCap = cap;
    this.dof.setPixelRatioCap(cap ?? this.manualCap);
    this.onChange();
  }

  manualQualityChanged() { this.slow = 0; this.fast = 0; this.apply(null); }
  setManualCap(cap) { this.manualCap = cap; this.manualQualityChanged(); }
  setEnabled(value) { this.enabled = Boolean(value); if (!this.enabled) this.manualQualityChanged(); }

  update(frameSeconds, { active = true, benchmark = false } = {}) {
    if (!this.enabled || !active || benchmark || !Number.isFinite(frameSeconds) || frameSeconds <= 0 || frameSeconds > 0.15) return;
    this.slow = frameSeconds > 1 / 50 ? this.slow + frameSeconds : 0;
    this.fast = frameSeconds < 1 / 58 ? this.fast + frameSeconds : 0;
    if (this.slow >= 3) {
      const next = Math.max(this.minimum, (this.adaptiveCap ?? this.baseCap()) - 0.15);
      if (next < (this.adaptiveCap ?? this.baseCap())) this.apply(Number(next.toFixed(2)));
      this.slow = 0; this.fast = 0;
    } else if (this.fast >= 12 && this.adaptiveCap !== null) {
      const next = Math.min(this.baseCap(), this.adaptiveCap + 0.15);
      this.apply(next >= this.baseCap() ? null : Number(next.toFixed(2)));
      this.slow = 0; this.fast = 0;
    }
  }
}
