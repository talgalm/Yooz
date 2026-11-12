export const STRIDE_M = 0.7;
const GRAVITY = 9.81;
const BASELINE_EASE = 0.02;
const STEP_SWING = 1.5;
const REARM_SWING = STEP_SWING * 0.3;
const MIN_STEP_GAP_MS = 300;

export interface StepDetector {
  push: (accelerationMagnitude: number, timeMs: number) => boolean;
}

export function createStepDetector(): StepDetector {
  let baseline = GRAVITY;
  let armed = false;
  let lastStepAt = Number.NEGATIVE_INFINITY;
  return {
    push(accelerationMagnitude, timeMs) {
      baseline += (accelerationMagnitude - baseline) * BASELINE_EASE;
      const swing = accelerationMagnitude - baseline;
      if (armed && swing > STEP_SWING && timeMs - lastStepAt > MIN_STEP_GAP_MS) {
        armed = false;
        lastStepAt = timeMs;
        return true;
      }
      if (swing < REARM_SWING) armed = true;
      return false;
    },
  };
}
