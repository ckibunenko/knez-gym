import type {
  ExercisePrescription,
  MuscleGroup,
  Mesocycle,
  MuscleGroupId,
  Tier,
  Workout,
} from "@/lib/types";
import { EXERCISES, getExercise } from "@/lib/data/exercises";
import { daysAgo, isoDate } from "@/lib/utils";
import { estimateOneRepMax } from "./oneRepMax";
import { readinessScore, rirAccuracy, weeklySetsPerMuscle } from "./analytics";
import { recommendHypertrophyProgression } from "./hypertrophyProgression";
import { recommendStrengthProgression } from "./strengthProgression";

/** All prior completed sessions containing the exercise, newest first. */
function priorSessions(
  workouts: Workout[],
  current: Workout,
  exerciseId: string
) {
  return workouts
    .filter(
      (w) =>
        w.id !== current.id &&
        w.status === "completed" &&
        w.date <= current.date &&
        w.loggedSets.some((s) => s.exerciseId === exerciseId && s.completed)
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((w) => ({
      date: w.date,
      sets: w.loggedSets
        .filter((s) => s.exerciseId === exerciseId && s.completed)
        .sort((a, b) => a.setNumber - b.setNumber),
    }));
}

/** Most recent completed session containing the exercise, with its sets. */
export function lastPerformance(
  workouts: Workout[],
  current: Workout,
  exerciseId: string
) {
  return priorSessions(workouts, current, exerciseId)[0] ?? null;
}

export interface LoadSuggestion {
  weight: number;
  /** kg vs last session's top weight */
  delta: number;
  action: "increase" | "hold" | "reduce";
  reason: string;
}

function roundToStep(value: number): number {
  // Plate math: 2.5 kg steps for real loads, 0.5 kg for light cable/DB work.
  const step = value >= 20 ? 2.5 : 0.5;
  return Math.round(value / step) * step;
}

/**
 * What the coach would load the bar with today, derived from the last
 * session of this exercise run through the matching progression model.
 */
export function suggestNextLoad(
  workouts: Workout[],
  current: Workout,
  p: ExercisePrescription
): LoadSuggestion | null {
  const last = lastPerformance(workouts, current, p.exerciseId);
  if (!last || last.sets.length === 0) return null;
  const topWeight = Math.max(...last.sets.map((s) => s.weight));
  if (topWeight <= 0) return null;

  let weight: number;
  let action: LoadSuggestion["action"];
  let reason: string;

  if (p.goalType === "strength") {
    // How many sessions in a row this lift has missed its prescription —
    // the strength model backs off after two.
    let failures = 0;
    for (const session of priorSessions(workouts, current, p.exerciseId)) {
      if (session.sets.some((s) => s.reps < p.targetRepMin)) failures += 1;
      else break;
    }
    const r = recommendStrengthProgression({
      targetRir: p.targetRir,
      sets: last.sets.map((s) => ({
        weight: s.weight,
        targetReps: p.targetRepMin,
        actualReps: s.reps,
        rir: s.rir,
      })),
      consecutiveFailures: Math.min(failures, 2),
      loadIncrement: 2.5,
    });
    weight = roundToStep(topWeight + r.loadChange);
    action =
      r.loadChange > 0 ? "increase" : r.loadChange < 0 ? "reduce" : "hold";
    reason = r.reason;
  } else {
    // Recovery and trend context turn the generic model session-aware.
    const completed = workouts.filter(
      (w) => w.status === "completed" && w.id !== current.id
    );
    const bests = sessionBests(completed, p.exerciseId).slice(-3);
    const performanceStable =
      bests.length >= 3 &&
      Math.abs(bests[2] - bests[0]) / Math.max(bests[0], 1) < 0.015;
    const r = recommendHypertrophyProgression({
      targetRepMin: p.targetRepMin,
      targetRepMax: p.targetRepMax,
      targetRir: p.targetRir,
      highFatigue: readinessScore(completed) < 45,
      performanceStable,
      sets: last.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
      })),
    });
    weight = roundToStep(topWeight * (1 + r.suggestedLoadChangePercent / 100));
    action =
      r.suggestedLoadChangePercent > 0
        ? "increase"
        : r.suggestedLoadChangePercent < 0
          ? "reduce"
          : "hold";
    reason = r.reason;
  }

  return { weight, delta: Math.round((weight - topWeight) * 10) / 10, action, reason };
}

const TIER_RANK: Record<Tier, number> = { low: 0, medium: 1, high: 2 };

/**
 * A like-for-like swap: same primary muscle, gentler on the joints,
 * same movement pattern when possible.
 */
export function findSubstitute(
  exerciseId: string,
  { lowerJointStress = false }: { lowerJointStress?: boolean } = {}
) {
  const ex = getExercise(exerciseId);
  if (!ex) return null;
  const candidates = EXERCISES.filter(
    (c) =>
      c.id !== ex.id &&
      c.primaryMuscle === ex.primaryMuscle &&
      (!lowerJointStress || TIER_RANK[c.jointStress] < TIER_RANK[ex.jointStress])
  );
  candidates.sort(
    (a, b) =>
      Number(b.movementPattern === ex.movementPattern) -
        Number(a.movementPattern === ex.movementPattern) ||
      TIER_RANK[a.jointStress] - TIER_RANK[b.jointStress] ||
      TIER_RANK[a.fatigueCost] - TIER_RANK[b.fatigueCost]
  );
  return candidates[0] ?? null;
}

export interface PrChance {
  exerciseName: string;
  weight: number;
  reps: number;
}

/**
 * The lift in today's plan with the best shot at a new all-time e1RM,
 * assuming the coach-suggested load lands near the top of the rep range.
 */
export function prChance(workouts: Workout[], current: Workout): PrChance | null {
  const completed = workouts.filter(
    (w) => w.id !== current.id && w.status === "completed" && w.date <= current.date
  );
  let best: PrChance | null = null;
  let bestMargin = 0;
  for (const p of current.prescriptions) {
    const s = suggestNextLoad(workouts, current, p);
    if (!s || s.action === "reduce") continue;
    let allTime = 0;
    for (const w of completed) {
      for (const x of w.loggedSets) {
        if (x.exerciseId !== p.exerciseId || !x.completed) continue;
        allTime = Math.max(allTime, estimateOneRepMax(x.weight, x.reps));
      }
    }
    if (allTime <= 0) continue;
    const projected = estimateOneRepMax(s.weight, p.targetRepMax);
    const margin = projected - allTime;
    if (margin > bestMargin) {
      bestMargin = margin;
      best = {
        exerciseName: getExercise(p.exerciseId)?.name ?? p.exerciseId,
        weight: s.weight,
        reps: p.targetRepMax,
      };
    }
  }
  return best;
}

export interface SessionCall {
  readiness: number;
  mode: "push" | "standard" | "caution";
  title: string;
  detail: string;
  /** One-tap session trim offered on caution days. */
  adjust?: { setsDelta: number; rirDelta: number };
}

/**
 * The coach's pre-session call: read recovery signals and the recent
 * training streak, then size today's session accordingly.
 */
export function sessionCall(workouts: Workout[], current: Workout): SessionCall {
  const completed = workouts.filter(
    (w) => w.status === "completed" && w.id !== current.id
  );
  const readiness = readinessScore(completed);

  // Consecutive training days immediately before this session.
  const dates = new Set(completed.map((w) => w.date));
  let streak = 0;
  const d = new Date(current.date + "T12:00:00");
  for (;;) {
    d.setDate(d.getDate() - 1);
    if (!dates.has(isoDate(d))) break;
    streak += 1;
  }

  if (current.name.toLowerCase().includes("deload")) {
    return {
      readiness,
      mode: "standard",
      title: "Deload session — keep it honest",
      detail:
        "Moderate loads, stop well short of failure. The win today is leaving the gym fresher than you came in.",
    };
  }

  if (readiness < 45) {
    return {
      readiness,
      mode: "caution",
      title: "Rough recovery signals — trim today",
      detail: `Readiness ${readiness}/100${
        streak >= 2 ? ` after ${streak} straight training days` : ""
      }. Keep the planned loads, but cut a set per exercise and leave an extra rep in the tank.`,
      adjust: { setsDelta: -1, rirDelta: 1 },
    };
  }

  if (readiness < 70 || streak >= 3) {
    return {
      readiness,
      mode: "standard",
      title: "Train, but manage the budget",
      detail:
        streak >= 3
          ? `${streak} consecutive training days. Hit the planned targets and skip the optional extras.`
          : `Readiness ${readiness}/100. Hit your targets; save the hero sets for a better day.`,
    };
  }

  const chance = prChance(workouts, current);
  return {
    readiness,
    mode: "push",
    title: "Green light — earn something today",
    detail: chance
      ? `Readiness ${readiness}/100. PR window: ${chance.exerciseName} — ${chance.weight} kg × ${chance.reps} would set a new e1RM best.`
      : `Readiness ${readiness}/100. If the first work sets move fast, push for the top of the rep range — today is the day for a small PR.`,
  };
}

export interface CoachInsight {
  id: string;
  severity: "good" | "info" | "warn" | "danger";
  title: string;
  detail: string;
  muscle?: MuscleGroupId;
}

/** Best e1RM per session for an exercise, oldest first. */
function sessionBests(completed: Workout[], exerciseId: string): number[] {
  const bests: number[] = [];
  for (const w of completed) {
    let best = 0;
    for (const s of w.loggedSets) {
      if (s.exerciseId !== exerciseId || !s.completed) continue;
      best = Math.max(best, estimateOneRepMax(s.weight, s.reps));
    }
    if (best > 0) bests.push(best);
  }
  return bests;
}

/**
 * The coach's prioritized read of the last month of training: stalled
 * lifts (with a swap), pain patterns, under-fed muscles, RIR drift.
 */
export function coachInsights(
  muscleGroups: MuscleGroup[],
  workouts: Workout[],
  meso?: Mesocycle
): CoachInsight[] {
  const completed = workouts
    .filter((w) => w.status === "completed")
    .sort((a, b) => a.date.localeCompare(b.date));
  const recent = completed.filter((w) => w.date > daysAgo(28));
  const insights: CoachInsight[] = [];

  // Pain patterns: the same exercise flagged twice in a month is a signal.
  const painCounts = new Map<string, number>();
  for (const w of recent) {
    for (const s of w.loggedSets) {
      if (s.painFlag) painCounts.set(s.exerciseId, (painCounts.get(s.exerciseId) ?? 0) + 1);
    }
  }
  for (const [exId, count] of painCounts) {
    if (count < 2) continue;
    const ex = getExercise(exId);
    const sub = findSubstitute(exId, { lowerJointStress: true });
    insights.push({
      id: `pain-${exId}`,
      severity: "danger",
      muscle: ex?.primaryMuscle,
      title: `${ex?.name ?? exId} keeps causing pain`,
      detail: `Flagged in ${count} sets this month. ${
        sub ? `Try ${sub.name} — same muscle, easier on the joints.` : "Consider a joint-friendlier variation."
      }`,
    });
  }

  // Stalled lifts: 3+ exposures with no e1RM progress across the last 3.
  const exerciseIds = new Set(
    recent.flatMap((w) => w.loggedSets.filter((s) => s.completed).map((s) => s.exerciseId))
  );
  const stalls: CoachInsight[] = [];
  for (const exId of exerciseIds) {
    const bests = sessionBests(completed, exId);
    if (bests.length < 3) continue;
    const [a, b, c] = bests.slice(-3);
    if (c > a * 1.01 || b > a * 1.01) continue; // still moving
    const ex = getExercise(exId);
    const sub = findSubstitute(exId);
    stalls.push({
      id: `stall-${exId}`,
      severity: "warn",
      muscle: ex?.primaryMuscle,
      title: `${ex?.name ?? exId} has stalled`,
      detail: `No e1RM progress across the last 3 sessions. Options: drop ~5% and rebuild, change the rep range${
        sub ? `, or rotate to ${sub.name}` : ""
      }.`,
    });
  }
  insights.push(...stalls.slice(0, 3));

  // Under-MEV muscles in the current training week.
  const weekSets = weeklySetsPerMuscle(completed.filter((w) => w.date > daysAgo(7)));
  const focus = new Set(meso ? [...meso.primaryMuscles, ...meso.secondaryMuscles] : []);
  const under = muscleGroups.filter((mg) => {
    if (focus.size > 0 && !focus.has(mg.id)) return false;
    const sets = weekSets[mg.id] ?? 0;
    const mev = (meso?.landmarkOverrides[mg.id] ?? mg.landmarks).mev;
    return sets > 0 && sets < mev;
  });
  for (const mg of under.slice(0, 3)) {
    insights.push({
      id: `mev-${mg.id}`,
      severity: "info",
      muscle: mg.id,
      title: `${mg.name} is below MEV this week`,
      detail: `${Math.round(weekSets[mg.id] ?? 0)} sets vs MEV ${
        (meso?.landmarkOverrides[mg.id] ?? mg.landmarks).mev
      } — that volume maintains but likely won't grow. Add a set or two if recovery allows.`,
    });
  }

  // Adherence: planned sessions that quietly slipped past their date.
  const today = isoDate(new Date());
  const slipped = workouts.filter(
    (w) =>
      w.date > daysAgo(7) &&
      w.date < today &&
      (w.status === "skipped" || w.status === "planned")
  ).length;
  if (slipped >= 2) {
    insights.push({
      id: "adherence",
      severity: "warn",
      title: "Sessions are slipping",
      detail: `${slipped} planned sessions in the last week didn't happen. A 3-day plan you hit beats a 5-day plan you don't — consider consolidating.`,
    });
  }

  // RIR calibration drift.
  const acc = rirAccuracy(recent);
  if (acc !== null && acc > 1.5) {
    insights.push({
      id: "rir-drift",
      severity: "info",
      title: "RIR estimates are drifting",
      detail: `Logged effort is ±${acc} from target on average. Recalibrate with an occasional AMRAP set — accurate RIR keeps the whole engine honest.`,
    });
  }

  if (insights.length === 0 && recent.length > 0) {
    insights.push({
      id: "all-good",
      severity: "good",
      title: "Everything is trending the right way",
      detail: "No stalls, no pain patterns, volume in the productive zone. Keep executing the plan.",
    });
  }

  const order = { danger: 0, warn: 1, info: 2, good: 3 } as const;
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}
