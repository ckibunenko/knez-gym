// Estimated 1RM via the Epley formula. Used for trend tracking only,
// not exact prediction. RIR-adjusted variant adds reps left in the tank.

// Epley drifts badly past ~12 reps (a 23-rep pump set would "beat" a real
// heavy set), so high-rep sets are scored as if they were 12-rep sets.
const MAX_FORMULA_REPS = 12;

export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return round1(weight * (1 + Math.min(reps, MAX_FORMULA_REPS) / 30));
}

/** Treats RIR as extra achievable reps for a truer ceiling estimate. */
export function estimateOneRepMaxWithRir(
  weight: number,
  reps: number,
  rir: number
): number {
  const effectiveReps = reps + Math.max(0, Math.min(rir, 5));
  return estimateOneRepMax(weight, effectiveReps);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
