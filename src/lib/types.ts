// Core domain types for the training system.

export type Units = "metric" | "imperial";
export type Goal = "hypertrophy" | "strength" | "hybrid";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type MuscleGroupId =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "forearms"
  | "traps"
  | "lowerBack";

export const MUSCLE_GROUP_IDS: MuscleGroupId[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "forearms",
  "traps",
  "lowerBack",
];

export const MUSCLE_LABELS: Record<MuscleGroupId, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
  forearms: "Forearms",
  traps: "Traps",
  lowerBack: "Lower Back",
};

/** Signature color per muscle group, used for icons and chips app-wide. */
export const MUSCLE_COLORS: Record<MuscleGroupId, string> = {
  chest: "#f472b6",
  back: "#38bdf8",
  shoulders: "#c084fc",
  biceps: "#60a5fa",
  triceps: "#a78bfa",
  quads: "#4ade80",
  hamstrings: "#34d399",
  glutes: "#fb923c",
  calves: "#2dd4bf",
  abs: "#facc15",
  forearms: "#818cf8",
  traps: "#e879f9",
  lowerBack: "#f87171",
};

// ── Load targets (per-exercise volume intent within a mesocycle) ─────

export type LoadTarget = "emphasis" | "grow" | "maintain";

export const LOAD_TARGET_LABELS: Record<LoadTarget, string> = {
  emphasis: "Emphasize",
  grow: "Grow",
  maintain: "Maintain",
};

// ── Mesocycle colors (unique hue per block on the calendar) ──────────

export const MESO_COLORS = [
  "#e3b341",
  "#60a5fa",
  "#f472b6",
  "#34d399",
  "#a78bfa",
  "#fb923c",
  "#22d3ee",
  "#f87171",
] as const;

/** Stable color for a mesocycle: stored color first, id-hash fallback. */
export function mesoColor(meso: { id: string; color?: string }): string {
  if (meso.color) return meso.color;
  let h = 0;
  for (let i = 0; i < meso.id.length; i++) h = (h * 31 + meso.id.charCodeAt(i)) >>> 0;
  return MESO_COLORS[h % MESO_COLORS.length];
}

export interface VolumeLandmarks {
  /** Maintenance volume — weekly sets to keep current size */
  mv: number;
  /** Minimum effective volume — least sets that drive growth */
  mev: number;
  /** Maximum adaptive volume — most productive range ceiling */
  mav: number;
  /** Maximum recoverable volume — beyond this, recovery fails */
  mrv: number;
}

export type FatigueStatus = "fresh" | "normal" | "accumulating" | "overreached";

export interface MuscleGroup {
  id: MuscleGroupId;
  name: string;
  landmarks: VolumeLandmarks;
  fatigueStatus: FatigueStatus;
}

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight";

export type ExerciseCategory = "compound" | "isolation";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontalPush"
  | "verticalPush"
  | "horizontalPull"
  | "verticalPull"
  | "lunge"
  | "curl"
  | "extension"
  | "raise"
  | "carry"
  | "core";

export type Tier = "low" | "medium" | "high";
export type GoalSuitability = "strength" | "hypertrophy" | "both";

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroupId;
  secondaryMuscles: MuscleGroupId[];
  equipment: Equipment;
  category: ExerciseCategory;
  movementPattern: MovementPattern;
  fatigueCost: Tier;
  jointStress: Tier;
  goalSuitability: GoalSuitability;
}

export type MesoPhase =
  | "accumulation"
  | "intensification"
  | "deload"
  | "maintenance";

export type MesoStatus = "planned" | "active" | "completed";

export type SplitType =
  | "custom"
  | "upperLower"
  | "pushPullLegs"
  | "fullBody"
  | "bodyPart";

export interface RirWeekTarget {
  week: number;
  rirMin: number;
  rirMax: number;
}

export interface DeloadModel {
  volumeReductionPercent: number; // 40-60 typical
  targetRir: number; // e.g. 4
  durationDays: number;
}

export interface MesoDayPlan {
  id: string;
  name: string; // e.g. "Upper A"
  dayOfWeek: number; // 0=Mon … 6=Sun
  focus: string;
  prescriptions: ExercisePrescription[];
}

export interface Mesocycle {
  id: string;
  name: string;
  goal: Goal;
  startDate: string; // ISO date
  durationWeeks: number; // includes deload week
  currentWeek: number; // 1-based
  status: MesoStatus;
  split: SplitType;
  primaryMuscles: MuscleGroupId[];
  secondaryMuscles: MuscleGroupId[];
  days: MesoDayPlan[];
  startingWeeklySets: Partial<Record<MuscleGroupId, number>>;
  landmarkOverrides: Partial<Record<MuscleGroupId, VolumeLandmarks>>;
  rirProgression: RirWeekTarget[];
  deload: DeloadModel;
  deloadWeek: number; // which week is the deload (usually last)
  /** Calendar accent for this block; assigned at creation. */
  color?: string;
  notes?: string;
}

export type GoalType = "strength" | "hypertrophy";

export interface ExercisePrescription {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  targetRir: number;
  targetLoad?: number;
  restSeconds: number;
  goalType: GoalType;
  /** Volume intent for this slot within the block (Emphasize/Grow/Maintain). */
  loadTarget?: LoadTarget;
  notes?: string;
}

export type TechniqueQuality = "good" | "acceptable" | "poor";

export interface LoggedSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number;
  rpe?: number;
  completed: boolean;
  skipped: boolean;
  notes?: string;
  painFlag: boolean;
  techniqueQuality: TechniqueQuality;
}

export type PerformanceComparison = "better" | "same" | "worse";

export interface ExerciseFeedback {
  exerciseId: string;
  pump: number; // 0-3
  localFatigue: number; // 0-3
  jointDiscomfort: number; // 0-3
  performanceComparison: PerformanceComparison;
}

export interface WorkoutFeedback {
  energy: number; // 1-5
  motivation: number; // 1-5
  soreness: number; // 0-3, entering session
  overallDifficulty: number; // 1-10
  notes?: string;
}

export type WorkoutStatus = "planned" | "inProgress" | "completed" | "skipped";

export interface Workout {
  id: string;
  mesocycleId?: string;
  mesoDayId?: string;
  name: string;
  date: string; // ISO date
  week?: number; // meso week this belongs to
  focus?: string;
  prescriptions: ExercisePrescription[];
  loggedSets: LoggedSet[];
  exerciseFeedback: ExerciseFeedback[];
  workoutFeedback?: WorkoutFeedback;
  status: WorkoutStatus;
  notes?: string;
}

export type RecommendationType =
  | "volume"
  | "load"
  | "deload"
  | "substitution"
  | "fatigueWarning";

export type RecommendationAction =
  | "increase"
  | "maintain"
  | "reduce"
  | "deload"
  | "substituteExercise";

export type Confidence = "low" | "medium" | "high";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  muscleGroup?: MuscleGroupId;
  exerciseId?: string;
  action: RecommendationAction;
  setChange?: number;
  reason: string;
  confidence: Confidence;
  createdAt: string; // ISO datetime
  dismissed?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  bodyWeight: number;
  height: number;
  trainingExperience: ExperienceLevel;
  preferredUnits: Units;
  defaultGoal: Goal;
}

export interface DailyReadiness {
  date: string;
  sleep?: number; // 1-5
  energy?: number; // 1-5
  stress?: number; // 1-5 (higher = more stressed)
  soreness?: number; // 0-3 overall
}
