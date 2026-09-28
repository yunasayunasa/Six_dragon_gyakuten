// Bokeh quality adjusts blur strength. DPR can be overridden independently.
export const QUALITY_PROFILES = {
  HIGH: { desktop: 2, mobile: 1.5, blurScale: 1 },
  MEDIUM: { desktop: 1.25, mobile: 1, blurScale: 0.9 },
  LOW: { desktop: 0.85, mobile: 0.85, blurScale: 0.8 },
};
