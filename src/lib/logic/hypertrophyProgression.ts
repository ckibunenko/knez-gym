export interface HypertrophySetLog {
  weight: number;
  reps: number;
  rir: number;
}

export interface HypertrophyProgressionInput {
  targetRepMin: number;
  targetRepMax: number;
  targetRir: number;
  sets: HypertrophySetLog[];
  /** Recovery context: true when fatigue signals are high */
  highFatigue?: boolean;
  performanceStable?: boolean;
}

export type LoadAction =
  | "increaseLoad"
  | "keepLoad"
  | "reduceLoad"
  | "reduceVolume"
  | "addVolume";

export interface HypertrophyProgressionResult {
  action: LoadAction;
  reason: string;
  suggestedLoadChangePercent: number;
}

/**
 * Double-progression for hypertrophy work: fill the rep range at target
 * RIR first, then add load.
 */
export function recommendHypertrophyProgression(
  input: HypertrophyProgressionInput
): HypertrophyProgressionResult {
  const { targetRepMin, targetRepMax, targetRir, sets } = input;
  if (sets.length === 0) {
    return {
      action: "keepLoad",
      reason: "No sets logged yet. Keep the planned load.",
      suggestedLoadChangePercent: 0,
    };
  }

  const avgRir = sets.reduce((s, x) => s + x.rir, 0) / sets.length;
  const allAtTop = sets.every((s) => s.reps >= targetRepMax);
  const anyBelowRange = sets.some((s) => s.reps < targetRepMin);
  const rirTooLow = avgRir < targetRir - 1;
  const rirTooHigh = avgRir > targetRir + 1;

  // Reps collapsed below range and effort maxed: load is too heavy.
  if (anyBelowRange && rirTooLow) {
    return {
      action: input.highFatigue ? "reduceVolume" : "reduceLoad",
      reason: input.highFatigue
        ? "Reps fell below range at maximal effort with high fatigue. Reduce volume and let recovery catch up."
        : "Reps fell below the target range at near-failure effort. Reduce the load 5-10% to get back in range.",
      suggestedLoadChangePercent: input.highFatigue ? 0 : -7.5,
    };
  }

  if (anyBelowRange) {
    return {
      action: "keepLoad",
      reason:
        "Some sets fell below the rep range. Keep the load and work back into range before progressing.",
      suggestedLoadChangePercent: 0,
    };
  }

  // Whole range filled with reps to spare: clear load increase.
  if (allAtTop && avgRir >= targetRir) {
    return {
      action: "increaseLoad",
      reason: `All sets hit the top of the rep range (${targetRepMax}) at or above target RIR. Increase the load ~2.5-5% next session.`,
      suggestedLoadChangePercent: avgRir > targetRir ? 5 : 2.5,
    };
  }

  // Way under-efforted: load is too light even mid-range.
  if (rirTooHigh) {
    return {
      action: "increaseLoad",
      reason: `Average RIR (${avgRir.toFixed(1)}) is well above target (${targetRir}). The load is too light — increase ~5%.`,
      suggestedLoadChangePercent: 5,
    };
  }

  // Hitting failure too early relative to plan.
  if (rirTooLow) {
    return {
      action: "reduceLoad",
      reason: `Effort exceeded plan (avg RIR ${avgRir.toFixed(1)} vs target ${targetRir}). Trim the load slightly or cut a rep per set to stay on the progression.`,
      suggestedLoadChangePercent: -2.5,
    };
  }

  // Stable and recovering well: volume is the next lever.
  if (input.performanceStable && !input.highFatigue) {
    return {
      action: "addVolume",
      reason:
        "Performance is stable at target effort and recovery is good. Add a set before pushing intensity harder.",
      suggestedLoadChangePercent: 0,
    };
  }

  return {
    action: "keepLoad",
    reason:
      "Within the rep range at target effort. Keep the load and push reps toward the top of the range.",
    suggestedLoadChangePercent: 0,
  };
}
