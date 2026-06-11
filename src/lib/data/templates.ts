import type { Goal, LoadTarget, MuscleGroupId, SplitType } from "@/lib/types";

// Mesocycle starting templates, transcribed from the user's programs
// (workouts_from_screenshots_with_load_targets.md). Days are Mon/Wed/Fri.
// Where the source lists only a muscle group + load target, a sensible
// default exercise from the library fills the slot — editable after apply.

export interface MesoTemplateSlot {
  exerciseId: string;
  loadTarget: LoadTarget;
  sets: number;
}

export interface MesoTemplateDay {
  name: string;
  dayOfWeek: number; // 0=Mon … 6=Sun
  slots: MesoTemplateSlot[];
}

export interface MesoTemplate {
  id: string;
  name: string;
  description: string;
  goal: Goal;
  split: SplitType;
  primaryMuscles: MuscleGroupId[];
  secondaryMuscles: MuscleGroupId[];
  days: MesoTemplateDay[];
}

const E = (exerciseId: string, sets = 3): MesoTemplateSlot => ({
  exerciseId,
  loadTarget: "emphasis",
  sets,
});
const G = (exerciseId: string, sets = 2): MesoTemplateSlot => ({
  exerciseId,
  loadTarget: "grow",
  sets,
});
const M = (exerciseId: string, sets = 2): MesoTemplateSlot => ({
  exerciseId,
  loadTarget: "maintain",
  sets,
});

export const MESO_TEMPLATES: MesoTemplate[] = [
  {
    id: "full-body-20",
    name: "20 Minute Full Body",
    description:
      "Three short full-body days. One hard exercise per muscle, everything emphasized.",
    goal: "hypertrophy",
    split: "fullBody",
    primaryMuscles: ["chest", "back", "shoulders", "quads", "hamstrings", "abs"],
    secondaryMuscles: [],
    days: [
      {
        name: "Full Body A",
        dayOfWeek: 0,
        slots: [
          E("bench-press-medium-grip", 2),
          E("smith-machine-row", 2),
          E("freemotion-y-raise", 2),
          E("belt-squat", 2),
          E("hanging-knee-raise", 2),
          E("dumbbell-stiff-leg-deadlift", 2),
        ],
      },
      {
        name: "Full Body B",
        dayOfWeek: 2,
        slots: [
          E("incline-dumbbell-press", 2),
          E("assisted-pullup-parallel-grip", 2),
          E("barbell-upright-row", 2),
          E("leg-extension", 2),
          E("cable-crunch", 2),
          E("leg-curl", 2),
        ],
      },
      {
        name: "Full Body C",
        dayOfWeek: 4,
        slots: [
          E("smith-machine-bench-press-wide-grip", 2),
          E("dumbbell-row-2-arm", 2),
          E("lateral-raise", 2),
          E("belt-squat", 2),
          E("hanging-knee-raise", 2),
          E("back-raise-45-degree", 2),
        ],
      },
    ],
  },
  {
    id: "upper-body-emphasis",
    name: "Upper Body Emphasis",
    description:
      "Chest, back, arms and shoulders emphasized; legs kept growing with minimum volume.",
    goal: "hypertrophy",
    split: "fullBody",
    primaryMuscles: ["chest", "back", "shoulders", "biceps", "triceps"],
    secondaryMuscles: ["quads", "hamstrings", "glutes"],
    days: [
      {
        name: "Upper A",
        dayOfWeek: 0,
        slots: [
          E("bench-press-wide-grip"),
          E("incline-dumbbell-press"),
          E("pulldown-normal-grip"),
          E("cable-triceps-pushdown-rope"),
          E("dumbbell-curl-2-arm"),
          E("machine-shoulder-press"),
          G("leg-press"),
          G("seated-leg-curl"),
        ],
      },
      {
        name: "Upper B",
        dayOfWeek: 2,
        slots: [
          E("cable-rope-twist-curl"),
          E("hammer-curl"),
          E("cable-overhead-triceps-extension"),
          E("cable-triceps-pushdown-bar"),
          E("cable-flexion-row"),
          E("dumbbell-press-flat"),
          E("cable-rope-facepull"),
          G("leg-extension"),
          G("machine-hip-thrust"),
        ],
      },
      {
        name: "Upper C",
        dayOfWeek: 4,
        slots: [
          E("pulldown-narrow-grip"),
          E("dumbbell-row-2-arm"),
          E("lateral-raise"),
          E("preacher-curl"),
          E("dip-machine"),
          E("technogym-wide-chest-press"),
          G("hip-thrust"),
          G("back-raise-45-degree"),
        ],
      },
    ],
  },
  {
    id: "chest-back-emphasis",
    name: "Chest & Back Emphasis",
    description:
      "Pressing and pulling volume pushed toward MRV; arms, shoulders and legs grow on the side.",
    goal: "hypertrophy",
    split: "fullBody",
    primaryMuscles: ["chest", "back"],
    secondaryMuscles: ["shoulders", "biceps", "triceps", "quads", "hamstrings"],
    days: [
      {
        name: "Chest & Back A",
        dayOfWeek: 0,
        slots: [
          E("bench-press-wide-grip"),
          E("incline-dumbbell-press"),
          E("pulldown-normal-grip"),
          G("cable-triceps-pushdown-rope"),
          G("cable-cross-body-lateral-raise"),
          G("leg-extension"),
        ],
      },
      {
        name: "Chest & Back B",
        dayOfWeek: 2,
        slots: [
          E("cable-flexion-row"),
          E("pulldown-narrow-grip"),
          E("dumbbell-press-flat"),
          G("dumbbell-curl-2-arm"),
          G("cable-rope-facepull"),
          G("seated-leg-curl"),
        ],
      },
      {
        name: "Chest & Back C",
        dayOfWeek: 4,
        slots: [
          E("dumbbell-row-2-arm"),
          E("technogym-wide-chest-press"),
          G("cable-overhead-triceps-extension"),
          G("cable-rope-twist-curl"),
          G("lateral-raise"),
          G("goblet-squat"),
          G("back-raise-45-degree"),
        ],
      },
    ],
  },
  {
    id: "upper-lower-4",
    name: "Upper / Lower 4-Day",
    description:
      "The classic evidence-based default: every muscle trained 2×/week, 10–16 weekly sets, compounds first and isolation behind them.",
    goal: "hypertrophy",
    split: "upperLower",
    primaryMuscles: ["chest", "back", "shoulders", "quads", "hamstrings", "glutes"],
    secondaryMuscles: ["biceps", "triceps", "calves", "abs"],
    days: [
      {
        name: "Upper A",
        dayOfWeek: 0,
        slots: [
          E("bench-press-wide-grip"),
          E("barbell-row"),
          E("incline-dumbbell-press", 2),
          E("pulldown-normal-grip", 2),
          G("lateral-raise", 3),
          G("ez-bar-curl"),
          G("cable-triceps-pushdown-rope"),
        ],
      },
      {
        name: "Lower A",
        dayOfWeek: 1,
        slots: [
          E("squat"),
          E("romanian-deadlift"),
          G("leg-press"),
          G("leg-curl"),
          E("standing-calf-raise", 3),
          G("cable-crunch"),
        ],
      },
      {
        name: "Upper B",
        dayOfWeek: 3,
        slots: [
          E("overhead-press"),
          E("pull-up"),
          E("dumbbell-press-flat", 2),
          E("chest-supported-row", 2),
          G("cable-rope-facepull"),
          G("incline-dumbbell-curl"),
          G("skull-crusher"),
        ],
      },
      {
        name: "Lower B",
        dayOfWeek: 4,
        slots: [
          E("deadlift"),
          E("hack-squat"),
          E("hip-thrust", 2),
          G("seated-leg-curl"),
          E("seated-calf-raise", 3),
          G("hanging-leg-raise"),
        ],
      },
    ],
  },
  {
    id: "ppl-6",
    name: "Push / Pull / Legs 6-Day",
    description:
      "High-volume PPL run twice per week. Each muscle hit 2× with different angles; best for experienced lifters with recovery to spare.",
    goal: "hypertrophy",
    split: "pushPullLegs",
    primaryMuscles: ["chest", "back", "shoulders", "quads", "hamstrings", "biceps", "triceps"],
    secondaryMuscles: ["glutes", "calves", "abs"],
    days: [
      {
        name: "Push A",
        dayOfWeek: 0,
        slots: [
          E("bench-press-wide-grip"),
          E("machine-shoulder-press", 2),
          G("cable-fly"),
          E("lateral-raise", 3),
          E("cable-triceps-pushdown-rope", 2),
          G("cable-overhead-triceps-extension"),
        ],
      },
      {
        name: "Pull A",
        dayOfWeek: 1,
        slots: [
          E("pull-up"),
          E("barbell-row"),
          G("straight-arm-pulldown"),
          G("cable-rope-facepull"),
          E("barbell-curl", 2),
          G("hammer-curl"),
        ],
      },
      {
        name: "Legs A",
        dayOfWeek: 2,
        slots: [
          E("squat"),
          E("romanian-deadlift"),
          G("leg-extension"),
          G("leg-curl"),
          E("standing-calf-raise", 3),
          G("cable-crunch"),
        ],
      },
      {
        name: "Push B",
        dayOfWeek: 3,
        slots: [
          E("overhead-press"),
          E("incline-dumbbell-press"),
          G("pec-deck"),
          G("cable-cross-body-lateral-raise"),
          E("skull-crusher", 2),
          G("cable-triceps-kickback"),
        ],
      },
      {
        name: "Pull B",
        dayOfWeek: 4,
        slots: [
          E("pulldown-normal-grip"),
          E("chest-supported-row"),
          G("rear-delt-fly"),
          G("barbell-shrug"),
          E("incline-dumbbell-curl", 2),
          G("preacher-curl"),
        ],
      },
      {
        name: "Legs B",
        dayOfWeek: 5,
        slots: [
          E("leg-press"),
          E("bulgarian-split-squat", 2),
          E("seated-leg-curl", 2),
          G("hip-thrust"),
          E("seated-calf-raise", 3),
          G("hanging-leg-raise"),
        ],
      },
    ],
  },
  {
    id: "strength-foundations-4",
    name: "Strength Foundations 4-Day",
    description:
      "One main lift per day (squat / bench / deadlift / press) trained heavy, plus a few targeted accessories. Built for e1RM progress.",
    goal: "strength",
    split: "upperLower",
    primaryMuscles: ["quads", "chest", "back", "shoulders", "hamstrings"],
    secondaryMuscles: ["glutes", "triceps", "biceps", "abs"],
    days: [
      {
        name: "Squat Day",
        dayOfWeek: 0,
        slots: [
          E("squat", 4),
          G("leg-press"),
          G("leg-curl"),
          G("plank"),
        ],
      },
      {
        name: "Bench Day",
        dayOfWeek: 1,
        slots: [
          E("bench-press-medium-grip", 4),
          E("barbell-row"),
          G("close-grip-bench-press"),
          G("cable-triceps-pushdown-bar"),
        ],
      },
      {
        name: "Deadlift Day",
        dayOfWeek: 3,
        slots: [
          E("deadlift", 4),
          E("pull-up"),
          G("good-morning"),
          G("back-raise-45-degree"),
        ],
      },
      {
        name: "Press Day",
        dayOfWeek: 4,
        slots: [
          E("overhead-press", 4),
          E("chin-up"),
          G("bench-press-incline-medium-grip"),
          G("lateral-raise"),
          G("cable-rope-facepull"),
        ],
      },
    ],
  },
  {
    id: "full-body-hybrid-3",
    name: "Full Body Hybrid 3-Day",
    description:
      "Three sessions: a heavy compound to lead each day for strength, hypertrophy accessories behind it. The best return per gym hour.",
    goal: "hybrid",
    split: "fullBody",
    primaryMuscles: ["quads", "chest", "back", "hamstrings", "shoulders"],
    secondaryMuscles: ["glutes", "biceps", "triceps", "calves"],
    days: [
      {
        name: "Full Body A",
        dayOfWeek: 0,
        slots: [
          E("squat"),
          E("bench-press-wide-grip"),
          E("chest-supported-row"),
          G("leg-curl"),
          G("lateral-raise"),
        ],
      },
      {
        name: "Full Body B",
        dayOfWeek: 2,
        slots: [
          E("deadlift"),
          E("overhead-press"),
          E("pull-up"),
          G("leg-extension"),
          G("ez-bar-curl"),
        ],
      },
      {
        name: "Full Body C",
        dayOfWeek: 4,
        slots: [
          E("leg-press"),
          E("incline-dumbbell-press"),
          E("barbell-row"),
          G("romanian-deadlift"),
          G("cable-triceps-pushdown-rope"),
          G("standing-calf-raise"),
        ],
      },
    ],
  },
  {
    id: "arm-specialization-4",
    name: "Arm Specialization",
    description:
      "Biceps and triceps pushed toward MRV with varied curl and extension angles; everything else held at maintenance so arms get the recovery budget.",
    goal: "hypertrophy",
    split: "bodyPart",
    primaryMuscles: ["biceps", "triceps"],
    secondaryMuscles: ["chest", "back", "shoulders", "quads", "hamstrings"],
    days: [
      {
        name: "Arms A · Heavy",
        dayOfWeek: 0,
        slots: [
          E("barbell-curl"),
          E("close-grip-bench-press"),
          E("incline-dumbbell-curl", 2),
          E("cable-overhead-triceps-extension", 2),
          M("bench-press-medium-grip"),
          M("lateral-raise"),
        ],
      },
      {
        name: "Lower · Maintain",
        dayOfWeek: 1,
        slots: [
          M("squat"),
          M("romanian-deadlift"),
          M("standing-calf-raise"),
          G("cable-crunch"),
        ],
      },
      {
        name: "Arms B · Pump",
        dayOfWeek: 3,
        slots: [
          E("preacher-curl"),
          E("cable-triceps-pushdown-rope"),
          E("hammer-curl", 2),
          E("cable-triceps-kickback", 2),
          M("pulldown-normal-grip"),
          M("chest-supported-row"),
        ],
      },
      {
        name: "Arms C · Volume",
        dayOfWeek: 4,
        slots: [
          E("ez-bar-curl", 2),
          E("dumbbell-overhead-extension", 2),
          E("concentration-curl", 2),
          E("dip-machine", 2),
          M("dumbbell-shoulder-press"),
          M("cable-rope-facepull"),
        ],
      },
    ],
  },
  {
    id: "lower-body-emphasis-4",
    name: "Lower Body Emphasis",
    description:
      "Quads, hamstrings and glutes get 2× frequency and the volume budget; upper body trains twice at maintenance to hold ground.",
    goal: "hypertrophy",
    split: "bodyPart",
    primaryMuscles: ["quads", "hamstrings", "glutes", "calves"],
    secondaryMuscles: ["chest", "back", "shoulders", "abs"],
    days: [
      {
        name: "Quad Focus",
        dayOfWeek: 0,
        slots: [
          E("squat"),
          E("leg-press"),
          E("leg-extension", 2),
          G("walking-lunge"),
          E("standing-calf-raise", 3),
        ],
      },
      {
        name: "Upper · Maintain",
        dayOfWeek: 1,
        slots: [
          M("bench-press-wide-grip"),
          M("barbell-row"),
          M("dumbbell-shoulder-press"),
          M("pulldown-normal-grip"),
          G("cable-crunch"),
        ],
      },
      {
        name: "Posterior Chain",
        dayOfWeek: 3,
        slots: [
          E("romanian-deadlift"),
          E("hip-thrust"),
          E("leg-curl", 2),
          G("hip-abduction-machine"),
          E("seated-calf-raise", 3),
        ],
      },
      {
        name: "Lower Mixed",
        dayOfWeek: 4,
        slots: [
          E("hack-squat"),
          E("bulgarian-split-squat", 2),
          E("seated-leg-curl", 2),
          G("back-raise-45-degree"),
          M("incline-dumbbell-press"),
          M("chin-up"),
        ],
      },
    ],
  },
];
