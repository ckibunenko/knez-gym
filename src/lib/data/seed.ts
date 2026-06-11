import type {
  ExerciseFeedback,
  ExercisePrescription,
  LoggedSet,
  MesoDayPlan,
  Mesocycle,
  Recommendation,
  UserProfile,
  Workout,
  WorkoutFeedback,
} from "@/lib/types";
import { uid, daysAgo } from "@/lib/utils";
import {
  DEFAULT_DELOAD,
  DEFAULT_HYPERTROPHY_RIR,
  defaultMuscleGroups,
  rirTargetForWeek,
} from "./defaults";
import { getExercise } from "./exercises";

export interface SeedState {
  profile: UserProfile;
  mesocycles: Mesocycle[];
  workouts: Workout[];
  recommendations: Recommendation[];
}

// Deterministic pseudo-random so the seed looks organic but is stable.
function hashNoise(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function roundLoad(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}

interface PrescSpec {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  rest: number;
  goalType: "strength" | "hypertrophy";
  baseLoad: number;
}

function presc(spec: PrescSpec, targetRir: number): ExercisePrescription {
  return {
    id: uid("presc"),
    exerciseId: spec.exerciseId,
    targetSets: spec.sets,
    targetRepMin: spec.repMin,
    targetRepMax: spec.repMax,
    targetRir,
    targetLoad: spec.baseLoad,
    restSeconds: spec.rest,
    goalType: spec.goalType,
  };
}

const UPPER_STRENGTH: PrescSpec[] = [
  { exerciseId: "bench-press-wide-grip", sets: 4, repMin: 4, repMax: 6, rest: 180, goalType: "strength", baseLoad: 100 },
  { exerciseId: "overhead-press", sets: 3, repMin: 5, repMax: 8, rest: 150, goalType: "strength", baseLoad: 57.5 },
  { exerciseId: "chest-supported-row", sets: 3, repMin: 8, repMax: 12, rest: 120, goalType: "hypertrophy", baseLoad: 80 },
  { exerciseId: "pulldown-normal-grip", sets: 3, repMin: 10, repMax: 15, rest: 90, goalType: "hypertrophy", baseLoad: 75 },
  { exerciseId: "barbell-curl", sets: 3, repMin: 8, repMax: 12, rest: 90, goalType: "hypertrophy", baseLoad: 40 },
];

const LOWER_STRENGTH: PrescSpec[] = [
  { exerciseId: "squat", sets: 4, repMin: 4, repMax: 6, rest: 210, goalType: "strength", baseLoad: 140 },
  { exerciseId: "romanian-deadlift", sets: 3, repMin: 6, repMax: 10, rest: 180, goalType: "strength", baseLoad: 120 },
  { exerciseId: "leg-press", sets: 3, repMin: 10, repMax: 15, rest: 120, goalType: "hypertrophy", baseLoad: 220 },
  { exerciseId: "standing-calf-raise", sets: 4, repMin: 10, repMax: 15, rest: 75, goalType: "hypertrophy", baseLoad: 110 },
  { exerciseId: "cable-crunch", sets: 3, repMin: 10, repMax: 15, rest: 60, goalType: "hypertrophy", baseLoad: 55 },
];

const UPPER_HYPERTROPHY: PrescSpec[] = [
  { exerciseId: "incline-dumbbell-press", sets: 4, repMin: 8, repMax: 12, rest: 120, goalType: "hypertrophy", baseLoad: 36 },
  { exerciseId: "technogym-wide-chest-press", sets: 3, repMin: 10, repMax: 15, rest: 90, goalType: "hypertrophy", baseLoad: 85 },
  { exerciseId: "cable-flexion-row", sets: 4, repMin: 10, repMax: 15, rest: 90, goalType: "hypertrophy", baseLoad: 85 },
  { exerciseId: "lateral-raise", sets: 4, repMin: 12, repMax: 20, rest: 60, goalType: "hypertrophy", baseLoad: 12.5 },
  { exerciseId: "cable-triceps-pushdown-rope", sets: 3, repMin: 10, repMax: 15, rest: 60, goalType: "hypertrophy", baseLoad: 35 },
  { exerciseId: "dumbbell-curl-2-arm", sets: 3, repMin: 10, repMax: 15, rest: 60, goalType: "hypertrophy", baseLoad: 16 },
];

const LOWER_HYPERTROPHY: PrescSpec[] = [
  { exerciseId: "hack-squat", sets: 4, repMin: 8, repMax: 12, rest: 150, goalType: "hypertrophy", baseLoad: 130 },
  { exerciseId: "leg-curl", sets: 4, repMin: 10, repMax: 15, rest: 90, goalType: "hypertrophy", baseLoad: 50 },
  { exerciseId: "hip-thrust", sets: 3, repMin: 8, repMax: 12, rest: 120, goalType: "hypertrophy", baseLoad: 140 },
  { exerciseId: "seated-calf-raise", sets: 4, repMin: 12, repMax: 20, rest: 60, goalType: "hypertrophy", baseLoad: 60 },
  { exerciseId: "hanging-leg-raise", sets: 3, repMin: 10, repMax: 15, rest: 60, goalType: "hypertrophy", baseLoad: 0 },
];

const DAY_SPECS: { name: string; dayOfWeek: number; focus: string; specs: PrescSpec[] }[] = [
  { name: "Upper Strength", dayOfWeek: 0, focus: "Heavy press + pull", specs: UPPER_STRENGTH },
  { name: "Lower Strength", dayOfWeek: 1, focus: "Heavy squat + hinge", specs: LOWER_STRENGTH },
  { name: "Upper Hypertrophy", dayOfWeek: 3, focus: "Upper-body volume", specs: UPPER_HYPERTROPHY },
  { name: "Lower Hypertrophy", dayOfWeek: 4, focus: "Lower-body volume", specs: LOWER_HYPERTROPHY },
];

/** Weekly load creep: strength lifts +~1.8%/week, accessories +~1.2%. */
function loadForWeek(spec: PrescSpec, week: number): number {
  const rate = spec.goalType === "strength" ? 0.018 : 0.012;
  const raw = spec.baseLoad * (1 + rate * (week - 1));
  if (spec.baseLoad === 0) return 0;
  if (spec.baseLoad < 20) return Math.round(raw * 2) / 2; // dumbbells: 0.5 steps
  return roundLoad(raw);
}

function genLoggedSets(
  spec: PrescSpec,
  week: number,
  workoutKey: string,
  targetRir: number
): LoggedSet[] {
  const weight = loadForWeek(spec, week);
  const sets: LoggedSet[] = [];
  for (let i = 1; i <= spec.sets; i++) {
    const noise = hashNoise(`${workoutKey}-${spec.exerciseId}-${i}`);
    const span = spec.repMax - spec.repMin;
    // Later sets lose a rep or two; week pushes reps up slightly.
    let reps = Math.round(
      spec.repMin + span * (0.55 + 0.18 * (week - 1) + noise * 0.3) - (i - 1) * 0.6
    );
    reps = Math.max(spec.repMin - 1, Math.min(spec.repMax, reps));
    const rir = Math.max(0, targetRir + (noise > 0.8 ? 1 : 0) - (i === spec.sets && noise < 0.25 ? 1 : 0));
    sets.push({
      id: uid("set"),
      exerciseId: spec.exerciseId,
      setNumber: i,
      weight,
      reps: spec.baseLoad === 0 ? Math.min(reps + 2, spec.repMax) : reps,
      rir,
      completed: true,
      skipped: false,
      painFlag: false,
      techniqueQuality: noise < 0.12 ? "acceptable" : "good",
    });
  }
  return sets;
}

function genExerciseFeedback(
  spec: PrescSpec,
  week: number,
  workoutKey: string
): ExerciseFeedback {
  const noise = hashNoise(`${workoutKey}-${spec.exerciseId}-fb`);
  const ex = getExercise(spec.exerciseId);
  const fatigueBias = ex?.fatigueCost === "high" ? 1 : 0;
  return {
    exerciseId: spec.exerciseId,
    pump: spec.goalType === "hypertrophy" ? (noise > 0.4 ? 2 : 1) + (week > 2 ? 1 : 0) > 3 ? 3 : (noise > 0.4 ? 2 : 1) + (week > 2 ? 1 : 0) : 1,
    localFatigue: Math.min(3, (noise > 0.6 ? 1 : 0) + fatigueBias + (week > 2 ? 1 : 0)),
    jointDiscomfort: noise > 0.92 ? 1 : 0,
    performanceComparison: week === 1 ? "same" : noise > 0.25 ? "better" : "same",
  };
}

function genWorkoutFeedback(week: number, workoutKey: string): WorkoutFeedback {
  const noise = hashNoise(`${workoutKey}-wfb`);
  return {
    energy: week > 2 ? 3 : 4,
    motivation: noise > 0.3 ? 4 : 3,
    soreness: week > 2 ? 2 : 1,
    overallDifficulty: Math.min(10, 5 + week + (noise > 0.6 ? 1 : 0)),
  };
}

export function buildSeedState(): SeedState {
  const profile: UserProfile = {
    id: "user-1",
    name: "Aleksandar",
    bodyWeight: 103,
    height: 196,
    trainingExperience: "intermediate",
    preferredUnits: "metric",
    defaultGoal: "hybrid",
  };

  // Start 16 days ago → today sits midway through week 3 of 6.
  const startOffset = 16;
  const startDate = daysAgo(startOffset);

  const days: MesoDayPlan[] = DAY_SPECS.map((d) => ({
    id: uid("day"),
    name: d.name,
    dayOfWeek: d.dayOfWeek,
    focus: d.focus,
    prescriptions: d.specs.map((s) => presc(s, 2)),
  }));

  const meso: Mesocycle = {
    id: "meso-seed-1",
    name: "Foundation Block 1",
    goal: "hybrid",
    startDate,
    durationWeeks: 6,
    currentWeek: 3,
    status: "active",
    split: "upperLower",
    primaryMuscles: ["chest", "back", "quads", "hamstrings"],
    secondaryMuscles: ["shoulders", "biceps", "triceps", "glutes", "calves"],
    days,
    startingWeeklySets: {
      chest: 11,
      back: 14,
      shoulders: 10,
      biceps: 6,
      triceps: 6,
      quads: 11,
      hamstrings: 7,
      glutes: 3,
      calves: 8,
      abs: 6,
    },
    landmarkOverrides: {},
    rirProgression: DEFAULT_HYPERTROPHY_RIR,
    deload: { ...DEFAULT_DELOAD },
    deloadWeek: 6,
    notes:
      "First block of the season. Strength emphasis on bench and squat, hypertrophy volume ramping from moderate.",
  };

  const workouts: Workout[] = [];

  for (let week = 1; week <= 3; week++) {
    const rirTarget = rirTargetForWeek(meso.rirProgression, week);
    for (let di = 0; di < DAY_SPECS.length; di++) {
      const spec = DAY_SPECS[di];
      const dayPlan = days[di];
      const offset = startOffset - ((week - 1) * 7 + spec.dayOfWeek);
      const date = daysAgo(offset);
      const isPast = offset >= 1;
      // Week 3: Mon/Tue done, Thu/Fri upcoming.
      if (week === 3 && !isPast) {
        workouts.push({
          id: uid("workout"),
          mesocycleId: meso.id,
          mesoDayId: dayPlan.id,
          name: spec.name,
          date,
          week,
          focus: spec.focus,
          prescriptions: spec.specs.map((s) => ({
            ...presc(s, rirTarget.rirMin),
            targetLoad: loadForWeek(s, week),
          })),
          loggedSets: [],
          exerciseFeedback: [],
          status: "planned",
        });
        continue;
      }

      const key = `w${week}d${di}`;
      const loggedSets = spec.specs.flatMap((s) =>
        genLoggedSets(s, week, key, rirTarget.rirMin)
      );
      workouts.push({
        id: uid("workout"),
        mesocycleId: meso.id,
        mesoDayId: dayPlan.id,
        name: spec.name,
        date,
        week,
        focus: spec.focus,
        prescriptions: spec.specs.map((s) => ({
          ...presc(s, rirTarget.rirMin),
          targetLoad: loadForWeek(s, week),
        })),
        loggedSets,
        exerciseFeedback: spec.specs.map((s) => genExerciseFeedback(s, week, key)),
        workoutFeedback: genWorkoutFeedback(week, key),
        status: "completed",
      });
    }
  }

  const now = new Date().toISOString();
  const recommendations: Recommendation[] = [
    {
      id: uid("rec"),
      type: "volume",
      muscleGroup: "chest",
      action: "increase",
      setChange: 1,
      reason:
        "Add 1 set to chest next week: pressing performance is improving, soreness is low, and current volume sits below your adaptive ceiling.",
      confidence: "high",
      createdAt: now,
    },
    {
      id: uid("rec"),
      type: "volume",
      muscleGroup: "quads",
      action: "maintain",
      setChange: 0,
      reason:
        "Hold quad volume: squat performance improved but soreness entering sessions is elevated. Let recovery normalize before adding sets.",
      confidence: "medium",
      createdAt: now,
    },
    {
      id: uid("rec"),
      type: "load",
      exerciseId: "bench-press-wide-grip",
      action: "increase",
      setChange: 0,
      reason:
        "Increase bench press load by 2.5 kg next session: all prescribed sets were completed at target RIR.",
      confidence: "high",
      createdAt: now,
    },
  ];

  return { profile, mesocycles: [meso], workouts, recommendations };
}
