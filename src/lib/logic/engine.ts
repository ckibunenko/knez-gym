import type {
  Mesocycle,
  MuscleGroup,
  MuscleGroupId,
  Recommendation,
  Workout,
} from "@/lib/types";
import { getExercise } from "@/lib/data/exercises";
import { uid, daysAgo } from "@/lib/utils";
import {
  classifyVolume,
  muscleTrendMap,
  readinessScore,
  weeklySetsPerMuscle,
} from "./analytics";
import { recommendVolumeAdjustment } from "./volumeAdjustment";
import { recommendDeload, type DeloadResult } from "./deload";

export interface EngineOutput {
  volumeRecs: Recommendation[];
  deload: DeloadResult;
  readiness: number;
}

function landmarksFor(muscle: MuscleGroup, meso?: Mesocycle) {
  return meso?.landmarkOverrides[muscle.id] ?? muscle.landmarks;
}

/** Workouts whose date falls in the current calendar training week (last 7 days). */
export function workoutsThisWeek(workouts: Workout[]): Workout[] {
  const cutoff = daysAgo(7);
  return workouts.filter((w) => w.date > cutoff && w.status === "completed");
}

/** Per-muscle averages of the 0-3 feedback signals over recent workouts. */
interface SignalAvg {
  pump: number;
  localFatigue: number;
  jointDiscomfort: number;
}

function signalAverages(workouts: Workout[]): Map<MuscleGroupId, SignalAvg> {
  const sums = new Map<MuscleGroupId, SignalAvg & { count: number }>();
  for (const w of workouts) {
    for (const f of w.exerciseFeedback) {
      const muscle = getExercise(f.exerciseId)?.primaryMuscle;
      if (!muscle) continue;
      let s = sums.get(muscle);
      if (!s) {
        s = { pump: 0, localFatigue: 0, jointDiscomfort: 0, count: 0 };
        sums.set(muscle, s);
      }
      s.pump += f.pump;
      s.localFatigue += f.localFatigue;
      s.jointDiscomfort += f.jointDiscomfort;
      s.count += 1;
    }
  }
  const avgs = new Map<MuscleGroupId, SignalAvg>();
  for (const [muscle, s] of sums) {
    avgs.set(muscle, {
      pump: s.pump / s.count,
      localFatigue: s.localFatigue / s.count,
      jointDiscomfort: s.jointDiscomfort / s.count,
    });
  }
  return avgs;
}

const NO_SIGNAL: SignalAvg = { pump: 0, localFatigue: 0, jointDiscomfort: 0 };

/** Average soreness of the two most recent workouts with feedback. */
function recentSoreness(workouts: Workout[]): number {
  let newest: Workout | null = null;
  let second: Workout | null = null;
  for (const w of workouts) {
    if (!w.workoutFeedback) continue;
    if (!newest || w.date > newest.date) {
      second = newest;
      newest = w;
    } else if (!second || w.date > second.date) {
      second = w;
    }
  }
  if (!newest) return 0;
  const picked = second ? [newest, second] : [newest];
  return picked.reduce((s, w) => s + (w.workoutFeedback?.soreness ?? 0), 0) / picked.length;
}

/**
 * Run the full rule engine against current data: one volume
 * recommendation per trained muscle plus a global deload check.
 */
export function runEngine(
  muscleGroups: MuscleGroup[],
  workouts: Workout[],
  activeMeso?: Mesocycle
): EngineOutput {
  const completed = workouts.filter((w) => w.status === "completed");
  const thisWeek = workoutsThisWeek(completed);
  const recent = [...completed]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  const weeklySets = weeklySetsPerMuscle(thisWeek);
  const readiness = readinessScore(completed);
  const overallSoreness = recentSoreness(completed);
  // Precomputed once; the loop below only does map lookups per muscle.
  const trends = muscleTrendMap(recent);
  const signals = signalAverages(recent);

  const volumeRecs: Recommendation[] = [];
  let musclesNearMrv = 0;
  let decliningMuscles = 0;

  for (const mg of muscleGroups) {
    const sets = weeklySets[mg.id] ?? 0;
    if (sets === 0) continue; // untrained this week — nothing to adjust

    const lm = landmarksFor(mg, activeMeso);
    const zone = classifyVolume(sets, lm);
    if (zone === "nearMrv" || zone === "exceedingMrv") musclesNearMrv += 1;

    const trend = trends[mg.id] ?? "stable";
    if (trend === "declining") decliningMuscles += 1;

    const signal = signals.get(mg.id) ?? NO_SIGNAL;
    const result = recommendVolumeAdjustment({
      muscle: mg.id,
      currentWeeklySets: Math.round(sets),
      landmarks: lm,
      performanceTrend: trend,
      pump: signal.pump,
      soreness: Math.max(overallSoreness, signal.localFatigue * 0.5),
      jointPain: signal.jointDiscomfort,
      localFatigue: signal.localFatigue,
      recoveryScore: readiness,
      targetRirAchieved: true,
    });

    volumeRecs.push({
      id: uid("rec"),
      type: "volume",
      muscleGroup: mg.id,
      action: result.action,
      setChange: result.setChange,
      reason: result.reason,
      confidence: result.confidence,
      createdAt: new Date().toISOString(),
    });
  }

  const lastFeedback = recent.find((w) => w.workoutFeedback)?.workoutFeedback;

  const deload = recommendDeload({
    consecutivePerformanceDrops: decliningMuscles >= 2 ? 2 : decliningMuscles,
    musclesNearMrv,
    highSorenessSessions: overallSoreness >= 2 ? 2 : 0,
    jointPain: Math.max(
      ...muscleGroups.map((mg) => signals.get(mg.id)?.jointDiscomfort ?? 0),
      0
    ),
    recoveryScore: readiness,
    motivation: lastFeedback?.motivation ?? 4,
    rirTargetMissed: false,
    userReportsHighFatigue: false,
  });

  return { volumeRecs, deload, readiness };
}
