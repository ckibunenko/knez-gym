import type { MuscleGroupId, Workout } from "@/lib/types";
import { getExercise } from "@/lib/data/exercises";
import { estimateOneRepMax } from "./oneRepMax";
import { workoutTonnage } from "./analytics";

export interface ExerciseAnalysis {
  exerciseId: string;
  exerciseName: string;
  muscle: MuscleGroupId;
  setsDone: number;
  targetSets: number;
  /** Completed sets whose reps landed inside the prescribed range. */
  repRangeHits: number;
  bestE1rm: number;
  /** Best e1RM across all earlier workouts, null when first exposure. */
  prevBestE1rm: number | null;
  e1rmDeltaPct: number | null;
  /** Rep loss first→last set at the heaviest weight, null under 2 sets. */
  repDropOffPct: number | null;
  isPr: boolean;
  suggestion: string;
}

export interface WorkoutAnalysis {
  tonnage: number;
  /** Average tonnage of up to 3 previous sessions of the same day plan. */
  avgPrevTonnage: number | null;
  totalSets: number;
  prCount: number;
  exercises: ExerciseAnalysis[];
}

function suggestionFor(
  a: Pick<ExerciseAnalysis, "setsDone" | "repRangeHits" | "isPr">,
  repsBelowMin: boolean,
  allAtTop: boolean
): string {
  if (a.setsDone === 0) return "Skipped — keep it or swap it next session.";
  if (allAtTop)
    return "Every set hit the top of the range — add ~2.5 kg next time.";
  if (repsBelowMin)
    return "Fell below the rep range — drop ~5% load or rest longer.";
  return "Hold the load and push reps toward the top of the range.";
}

/** Deterministic per-session debrief: adherence, progress, and next steps. */
export function analyzeWorkout(workout: Workout, all: Workout[]): WorkoutAnalysis {
  const history = all.filter(
    (w) =>
      w.id !== workout.id && w.status === "completed" && w.date <= workout.date
  );

  const exercises: ExerciseAnalysis[] = workout.prescriptions.map((p) => {
    const sets = workout.loggedSets.filter(
      (s) => s.exerciseId === p.exerciseId && s.completed
    );
    const ex = getExercise(p.exerciseId);

    const repRangeHits = sets.filter(
      (s) => s.reps >= p.targetRepMin && s.reps <= p.targetRepMax
    ).length;
    const repsBelowMin = sets.some((s) => s.reps < p.targetRepMin);
    const allAtTop =
      sets.length > 0 && sets.every((s) => s.reps >= p.targetRepMax);

    const bestE1rm = Math.max(
      0,
      ...sets.map((s) => estimateOneRepMax(s.weight, s.reps))
    );

    let prevBestE1rm: number | null = null;
    for (const w of history) {
      for (const s of w.loggedSets) {
        if (s.exerciseId !== p.exerciseId || !s.completed) continue;
        const e = estimateOneRepMax(s.weight, s.reps);
        if (prevBestE1rm === null || e > prevBestE1rm) prevBestE1rm = e;
      }
    }

    // Fatigue read: rep loss across sets done at the day's heaviest weight.
    let repDropOffPct: number | null = null;
    if (sets.length >= 2) {
      const topWeight = Math.max(...sets.map((s) => s.weight));
      const atTop = sets.filter((s) => s.weight === topWeight);
      if (atTop.length >= 2 && atTop[0].reps > 0) {
        repDropOffPct = Math.round(
          ((atTop[0].reps - atTop[atTop.length - 1].reps) / atTop[0].reps) * 100
        );
      }
    }

    const isPr =
      prevBestE1rm !== null && bestE1rm > prevBestE1rm && sets.length > 0;
    const partial = { setsDone: sets.length, repRangeHits, isPr };

    return {
      exerciseId: p.exerciseId,
      exerciseName: ex?.name ?? p.exerciseId,
      muscle: ex?.primaryMuscle ?? "chest",
      targetSets: p.targetSets,
      bestE1rm,
      prevBestE1rm,
      e1rmDeltaPct:
        prevBestE1rm && prevBestE1rm > 0 && sets.length > 0
          ? Math.round(((bestE1rm - prevBestE1rm) / prevBestE1rm) * 1000) / 10
          : null,
      repDropOffPct,
      suggestion: suggestionFor(partial, repsBelowMin, allAtTop),
      ...partial,
    };
  });

  const sameDay = history
    .filter((w) =>
      workout.mesoDayId ? w.mesoDayId === workout.mesoDayId : w.name === workout.name
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return {
    tonnage: workoutTonnage(workout),
    avgPrevTonnage: sameDay.length
      ? sameDay.reduce((s, w) => s + workoutTonnage(w), 0) / sameDay.length
      : null,
    totalSets: workout.loggedSets.filter((s) => s.completed).length,
    prCount: exercises.filter((e) => e.isPr).length,
    exercises,
  };
}
