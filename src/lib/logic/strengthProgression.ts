import { estimateOneRepMax } from "./oneRepMax";

export interface StrengthSetLog {
  weight: number;
  targetReps: number;
  actualReps: number;
  rir: number;
}

export interface StrengthProgressionInput {
  targetRir: number;
  sets: StrengthSetLog[];
  consecutiveFailures: number;
  /** Smallest practical load step, e.g. 2.5 kg */
  loadIncrement: number;
}

export interface StrengthProgressionResult {
  action: "increaseLoad" | "repeatLoad" | "reduceLoad" | "deloadLift";
  loadChange: number;
  reason: string;
  estimatedOneRepMax: number;
}

/**
 * Linear-style strength progression: complete the prescription at target
 * RIR → small load increase; miss with effort to spare → repeat; repeated
 * failure → back off 5-10%.
 */
export function recommendStrengthProgression(
  input: StrengthProgressionInput
): StrengthProgressionResult {
  const { targetRir, sets, consecutiveFailures, loadIncrement } = input;

  const best = sets.reduce(
    (acc, s) => Math.max(acc, estimateOneRepMax(s.weight, s.actualReps)),
    0
  );

  if (sets.length === 0) {
    return {
      action: "repeatLoad",
      loadChange: 0,
      reason: "No sets logged. Repeat the planned load.",
      estimatedOneRepMax: 0,
    };
  }

  const topWeight = Math.max(...sets.map((s) => s.weight));
  const allCompleted = sets.every((s) => s.actualReps >= s.targetReps);
  const avgRir = sets.reduce((s, x) => s + x.rir, 0) / sets.length;

  // Rule 3: two consecutive failed sessions — back off meaningfully.
  if (consecutiveFailures >= 2) {
    const reduction = -Math.max(
      roundToIncrement(topWeight * 0.075, loadIncrement),
      loadIncrement
    );
    return {
      action: "deloadLift",
      loadChange: reduction,
      reason: `Two consecutive missed sessions on this lift. Reduce the load 5-10% (${reduction} on the top set) and rebuild.`,
      estimatedOneRepMax: best,
    };
  }

  // Rule 1: prescription completed at (or easier than) target effort.
  if (allCompleted && avgRir >= targetRir) {
    const bump =
      avgRir > targetRir + 1
        ? roundToIncrement(loadIncrement * 2, loadIncrement)
        : loadIncrement;
    return {
      action: "increaseLoad",
      loadChange: bump,
      reason: `All prescribed sets completed at target RIR. Add ${bump} next session.`,
      estimatedOneRepMax: best,
    };
  }

  // Completed, but effort ran hotter than planned — bank it, don't add.
  if (allCompleted) {
    return {
      action: "repeatLoad",
      loadChange: 0,
      reason: `Sets completed but effort exceeded target (avg RIR ${avgRir.toFixed(1)} vs ${targetRir}). Repeat this load to consolidate before adding.`,
      estimatedOneRepMax: best,
    };
  }

  // Rule 2: missed reps while RIR was already at/below floor.
  if (avgRir < Math.max(targetRir, 1)) {
    return {
      action: consecutiveFailures >= 1 ? "reduceLoad" : "repeatLoad",
      loadChange:
        consecutiveFailures >= 1
          ? -roundToIncrement(topWeight * 0.05, loadIncrement)
          : 0,
      reason:
        consecutiveFailures >= 1
          ? "Missed reps again at maximal effort. Reduce the load ~5% and rebuild momentum."
          : "Missed reps at maximal effort. Repeat the load next session; reduce if it happens again.",
      estimatedOneRepMax: best,
    };
  }

  return {
    action: "repeatLoad",
    loadChange: 0,
    reason:
      "Prescription not fully completed but effort was submaximal — likely an off day. Repeat the load.",
    estimatedOneRepMax: best,
  };
}

function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return Math.round(value * 10) / 10;
  return Math.round(value / increment) * increment;
}
