import type {
  MuscleGroup,
  MuscleGroupId,
  RirWeekTarget,
  VolumeLandmarks,
} from "@/lib/types";
import { MUSCLE_GROUP_IDS, MUSCLE_LABELS } from "@/lib/types";

// Sensible starting landmarks for an intermediate lifter. All editable
// in Settings and overridable per mesocycle.
export const DEFAULT_LANDMARKS: Record<MuscleGroupId, VolumeLandmarks> = {
  chest: { mv: 6, mev: 10, mav: 18, mrv: 22 },
  back: { mv: 8, mev: 10, mav: 20, mrv: 25 },
  shoulders: { mv: 6, mev: 8, mav: 19, mrv: 26 },
  biceps: { mv: 5, mev: 8, mav: 17, mrv: 20 },
  triceps: { mv: 4, mev: 6, mav: 14, mrv: 18 },
  quads: { mv: 6, mev: 8, mav: 15, mrv: 18 },
  hamstrings: { mv: 4, mev: 6, mav: 12, mrv: 16 },
  glutes: { mv: 0, mev: 4, mav: 12, mrv: 16 },
  calves: { mv: 6, mev: 8, mav: 14, mrv: 18 },
  abs: { mv: 0, mev: 4, mav: 12, mrv: 16 },
  forearms: { mv: 2, mev: 4, mav: 10, mrv: 14 },
  traps: { mv: 2, mev: 4, mav: 12, mrv: 16 },
  lowerBack: { mv: 2, mev: 4, mav: 8, mrv: 12 },
};

export function defaultMuscleGroups(): MuscleGroup[] {
  return MUSCLE_GROUP_IDS.map((id) => ({
    id,
    name: MUSCLE_LABELS[id],
    landmarks: { ...DEFAULT_LANDMARKS[id] },
    fatigueStatus: "normal",
  }));
}

export const DEFAULT_HYPERTROPHY_RIR: RirWeekTarget[] = [
  { week: 1, rirMin: 3, rirMax: 3 },
  { week: 2, rirMin: 2, rirMax: 2 },
  { week: 3, rirMin: 1, rirMax: 2 },
  { week: 4, rirMin: 0, rirMax: 1 },
  { week: 5, rirMin: 0, rirMax: 1 },
];

export function rirTargetForWeek(
  progression: RirWeekTarget[],
  week: number
): RirWeekTarget {
  return (
    progression.find((t) => t.week === week) ??
    progression[progression.length - 1] ?? { week, rirMin: 2, rirMax: 3 }
  );
}

export const DEFAULT_DELOAD = {
  volumeReductionPercent: 50,
  targetRir: 4,
  durationDays: 7,
};
