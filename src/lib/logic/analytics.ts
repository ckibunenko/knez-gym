import type {
  MuscleGroupId,
  VolumeLandmarks,
  Workout,
} from "@/lib/types";
import { getExercise } from "@/lib/data/exercises";
import { estimateOneRepMax } from "./oneRepMax";
import type { PerformanceTrend } from "./volumeAdjustment";

export type VolumeZone = "belowMev" | "productive" | "nearMrv" | "exceedingMrv";

export const VOLUME_ZONE_LABELS: Record<VolumeZone, string> = {
  belowMev: "Below MEV",
  productive: "Productive",
  nearMrv: "Near MRV",
  exceedingMrv: "Exceeding MRV",
};

export function classifyVolume(
  sets: number,
  landmarks: VolumeLandmarks
): VolumeZone {
  if (sets > landmarks.mrv) return "exceedingMrv";
  if (sets >= landmarks.mav) return "nearMrv";
  if (sets >= landmarks.mev) return "productive";
  return "belowMev";
}

/** Secondary muscles count as half a set toward weekly volume. */
export function weeklySetsPerMuscle(
  workouts: Workout[]
): Record<MuscleGroupId, number> {
  const totals = {} as Record<MuscleGroupId, number>;
  for (const w of workouts) {
    for (const set of w.loggedSets) {
      if (!set.completed || set.skipped) continue;
      const ex = getExercise(set.exerciseId);
      if (!ex) continue;
      totals[ex.primaryMuscle] = (totals[ex.primaryMuscle] ?? 0) + 1;
      for (const sec of ex.secondaryMuscles) {
        totals[sec] = (totals[sec] ?? 0) + 0.5;
      }
    }
  }
  for (const k of Object.keys(totals) as MuscleGroupId[]) {
    totals[k] = Math.round(totals[k] * 10) / 10;
  }
  return totals;
}

/** Best e1RM per exercise per workout date, for trend charts. */
export function e1rmHistory(
  workouts: Workout[],
  exerciseId: string
): { date: string; e1rm: number }[] {
  const points: { date: string; e1rm: number }[] = [];
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    let best = 0;
    for (const s of w.loggedSets) {
      if (s.exerciseId !== exerciseId || !s.completed) continue;
      best = Math.max(best, estimateOneRepMax(s.weight, s.reps));
    }
    if (best > 0) points.push({ date: w.date, e1rm: best });
  }
  return points;
}

/** Compare the last two e1RM points to call a trend per exercise. */
export function performanceTrendForExercise(
  workouts: Workout[],
  exerciseId: string
): PerformanceTrend {
  const history = e1rmHistory(workouts, exerciseId);
  if (history.length < 2) return "stable";
  const prev = history[history.length - 2].e1rm;
  const last = history[history.length - 1].e1rm;
  const delta = (last - prev) / prev;
  if (delta > 0.01) return "improving";
  if (delta < -0.01) return "declining";
  return "stable";
}

/** Aggregate trend for a muscle from its exercises' last sessions. */
export function performanceTrendForMuscle(
  workouts: Workout[],
  muscle: MuscleGroupId
): PerformanceTrend {
  const exerciseIds = new Set<string>();
  for (const w of workouts) {
    for (const s of w.loggedSets) {
      const ex = getExercise(s.exerciseId);
      if (ex?.primaryMuscle === muscle) exerciseIds.add(s.exerciseId);
    }
  }
  let score = 0;
  let counted = 0;
  for (const id of exerciseIds) {
    const t = performanceTrendForExercise(workouts, id);
    if (t === "improving") score += 1;
    if (t === "declining") score -= 1;
    counted += 1;
  }
  if (counted === 0) return "stable";
  if (score > 0) return "improving";
  if (score < 0) return "declining";
  return "stable";
}

/**
 * Trends for every muscle at once in a single chronological pass —
 * equivalent to performanceTrendForMuscle per muscle, but without
 * re-sorting and re-scanning the workouts for each muscle × exercise.
 */
export function muscleTrendMap(
  workouts: Workout[]
): Partial<Record<MuscleGroupId, PerformanceTrend>> {
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  // Last two best-e1RM sessions per exercise.
  const hist = new Map<string, { prev: number; last: number; sessions: number }>();
  for (const w of sorted) {
    const bests = new Map<string, number>();
    for (const s of w.loggedSets) {
      if (!s.completed) continue;
      const e1rm = estimateOneRepMax(s.weight, s.reps);
      if (e1rm > 0 && e1rm > (bests.get(s.exerciseId) ?? 0)) {
        bests.set(s.exerciseId, e1rm);
      }
    }
    for (const [id, best] of bests) {
      const h = hist.get(id);
      if (h) {
        h.prev = h.last;
        h.last = best;
        h.sessions += 1;
      } else {
        hist.set(id, { prev: 0, last: best, sessions: 1 });
      }
    }
  }

  const scores = new Map<MuscleGroupId, number>();
  for (const [id, h] of hist) {
    const muscle = getExercise(id)?.primaryMuscle;
    if (!muscle) continue;
    let vote = 0;
    if (h.sessions >= 2) {
      const delta = (h.last - h.prev) / h.prev;
      vote = delta > 0.01 ? 1 : delta < -0.01 ? -1 : 0;
    }
    scores.set(muscle, (scores.get(muscle) ?? 0) + vote);
  }

  const out: Partial<Record<MuscleGroupId, PerformanceTrend>> = {};
  for (const [m, score] of scores) {
    out[m] = score > 0 ? "improving" : score < 0 ? "declining" : "stable";
  }
  return out;
}

/**
 * Readiness score 0-100 from the latest workout feedback signals.
 * Energy and motivation lift it; soreness and difficulty drag it down.
 */
export function readinessScore(workouts: Workout[]): number {
  const recent = [...workouts]
    .filter((w) => w.status === "completed" && w.workoutFeedback)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  if (recent.length === 0) return 75;

  let score = 0;
  for (const w of recent) {
    const f = w.workoutFeedback!;
    const energy = (f.energy - 1) / 4; // 0-1
    const motivation = (f.motivation - 1) / 4;
    const soreness = f.soreness / 3;
    const difficulty = (f.overallDifficulty - 1) / 9;
    const jointAvg =
      w.exerciseFeedback.length > 0
        ? w.exerciseFeedback.reduce((s, x) => s + x.jointDiscomfort, 0) /
          w.exerciseFeedback.length /
          3
        : 0;
    score +=
      100 *
      (0.3 * energy +
        0.2 * motivation +
        0.25 * (1 - soreness) +
        0.15 * (1 - difficulty) +
        0.1 * (1 - jointAvg));
  }
  return Math.round(score / recent.length);
}

export interface PrRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  e1rm: number;
  date: string;
}

/** Sets that beat every earlier e1RM for that exercise. */
export function personalRecords(workouts: Workout[]): PrRecord[] {
  const bestByExercise = new Map<string, number>();
  const prs: PrRecord[] = [];
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const s of w.loggedSets) {
      if (!s.completed) continue;
      const e1rm = estimateOneRepMax(s.weight, s.reps);
      const prev = bestByExercise.get(s.exerciseId) ?? 0;
      if (e1rm > prev) {
        bestByExercise.set(s.exerciseId, e1rm);
        const ex = getExercise(s.exerciseId);
        if (prev > 0) {
          prs.push({
            exerciseId: s.exerciseId,
            exerciseName: ex?.name ?? s.exerciseId,
            weight: s.weight,
            reps: s.reps,
            e1rm,
            date: w.date,
          });
        }
      }
    }
  }
  return prs.sort((a, b) => b.date.localeCompare(a.date));
}

export interface BestRecord {
  exerciseId: string;
  exerciseName: string;
  muscle: MuscleGroupId;
  weight: number;
  reps: number;
  e1rm: number;
  date: string;
  /** How many times the record was raised (1 = set once, never beaten). */
  prCount: number;
  /** Total completed sets ever logged for the exercise — its "popularity". */
  setsLogged: number;
}

/** All-time best set (by e1RM) for every exercise ever logged, most-trained first. */
export function bestRecords(workouts: Workout[]): BestRecord[] {
  const best = new Map<string, BestRecord>();
  const counts = new Map<string, number>();
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const s of w.loggedSets) {
      if (!s.completed || s.weight <= 0 || s.reps <= 0) continue;
      counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1);
      const e1rm = estimateOneRepMax(s.weight, s.reps);
      const prev = best.get(s.exerciseId);
      if (prev && e1rm <= prev.e1rm) continue;
      const ex = getExercise(s.exerciseId);
      best.set(s.exerciseId, {
        exerciseId: s.exerciseId,
        exerciseName: ex?.name ?? s.exerciseId,
        muscle: ex?.primaryMuscle ?? "chest",
        weight: s.weight,
        reps: s.reps,
        e1rm,
        date: w.date,
        prCount: (prev?.prCount ?? 0) + 1,
        setsLogged: 0,
      });
    }
  }
  return [...best.values()]
    .map((r) => ({ ...r, setsLogged: counts.get(r.exerciseId) ?? 0 }))
    .sort((a, b) => b.setsLogged - a.setsLogged || b.e1rm - a.e1rm);
}

/** |target - actual| averaged across completed sets; lower is better. */
export function rirAccuracy(workouts: Workout[]): number | null {
  let total = 0;
  let count = 0;
  for (const w of workouts) {
    for (const s of w.loggedSets) {
      if (!s.completed) continue;
      const presc = w.prescriptions.find((p) => p.exerciseId === s.exerciseId);
      if (!presc) continue;
      total += Math.abs(presc.targetRir - s.rir);
      count += 1;
    }
  }
  if (count === 0) return null;
  return Math.round((total / count) * 100) / 100;
}

/** Total kg lifted in a workout (weight x reps over completed sets). */
export function workoutTonnage(workout: Workout): number {
  return workout.loggedSets.reduce(
    (sum, s) => (s.completed ? sum + s.weight * s.reps : sum),
    0
  );
}
