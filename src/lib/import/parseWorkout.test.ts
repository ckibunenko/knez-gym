import { describe, expect, it } from "vitest";
import {
  buildWorkoutFromParsed,
  extractDate,
  matchExerciseId,
  parseWorkoutText,
} from "./parseWorkout";

// OCR-like text reproducing the user's workout-app screenshots.
const SCREENSHOT_WEEK3_DAY2 = `
WEEK 3 DAY 2
Wednesday - Moj prvi plan
SEP 5, 2025 v
BACK
Cable Flexion Row
Cable
WEIGHT REPS © LOG
25 30
35 20
Pulldown (Narrow Grip)
Cable
WEIGHT REPS © LOG
35 21
40 16
CHEST
Pushup
Bodyweight @ 100 Kg
WEIGHT REPS © LOG
100 27
100 15
BICEPS
Dumbbell Curl (2-Arm)
Dumbbell
WEIGHT REPS © LOG
7.5 28
9 16
SHOULDERS
Machine Shoulder Press
Machine
WEIGHT REPS © LOG
7.75 21
HAMSTRINGS
Back Raise (45 degree)
Bodyweight @ 100 Kg
WEIGHT REPS © LOG
100 18
`;

const SCREENSHOT_WEEK2_DAY3 = `
WEEK 2 DAY 3
Saturday - Moj prvi plan
AUG 30, 2025 v
BACK
Dumbbell Row (2-Arm)
Dumbbell
WEIGHT REPS © LOG
10 28
CHEST
Bench Press (Incline, Medium Grip)
Barbell
WEIGHT REPS © LOG
40 20
45 12
TRICEPS
Cable Overhead Triceps Extension
Cable
WEIGHT REPS © LOG
10 22
15 16
BICEPS
Cable Rope Twist Curl
Cable
WEIGHT REPS © LOG
10 25
12.5 20
15 15
SHOULDERS
Cable Front Raise (Underhand)
Cable
WEIGHT REPS © LOG
5 22
7.5 18
10 16
QUADS
Leg Extension
Machine
WEIGHT REPS © LOG
40 24
50 18
HAMSTRINGS
Seated Leg Curl
Machine
WEIGHT REPS © LOG
40 20
`;

describe("parseWorkoutText", () => {
  it("extracts name, exact date, and all exercises from week 3 day 2", () => {
    const parsed = parseWorkoutText(SCREENSHOT_WEEK3_DAY2);
    expect(parsed.name).toBe("Week 3 · Day 2 · Moj prvi plan");
    expect(parsed.date).toBe("2025-09-05");
    expect(parsed.exercises).toHaveLength(6);
    expect(parsed.exercises[0].rawName).toBe("Cable Flexion Row");
    expect(parsed.exercises[0].muscleHint).toBe("back");
    expect(parsed.exercises[0].sets).toEqual([
      { weight: 25, reps: 30 },
      { weight: 35, reps: 20 },
    ]);
    // decimal weights survive
    expect(parsed.exercises[3].sets[0]).toEqual({ weight: 7.5, reps: 28 });
    expect(parsed.exercises[4].sets[0]).toEqual({ weight: 7.75, reps: 21 });
  });

  it("extracts week 2 day 3 with 3-set exercises and exact date", () => {
    const parsed = parseWorkoutText(SCREENSHOT_WEEK2_DAY3);
    expect(parsed.date).toBe("2025-08-30");
    expect(parsed.exercises).toHaveLength(7);
    const curl = parsed.exercises.find((e) => e.rawName.includes("Rope Twist"));
    expect(curl?.sets).toHaveLength(3);
  });

  it("ignores bodyweight subtitle numbers and uses column values", () => {
    const parsed = parseWorkoutText(SCREENSHOT_WEEK3_DAY2);
    const pushup = parsed.exercises.find((e) => e.rawName === "Pushup");
    expect(pushup?.sets).toEqual([
      { weight: 100, reps: 27 },
      { weight: 100, reps: 15 },
    ]);
  });

  it("reads day-first dates and the equipment subtitle as a hint", () => {
    const parsed = parseWorkoutText(`
WEEK 1 DAY 1
Monday · Sedmi po redu
22 APR 2026 v
HAMSTRINGS
Romanian Deadlift
Dumbbell
WEIGHT REPS © LOG
16 12
`);
    expect(parsed.name).toBe("Week 1 · Day 1 · Sedmi po redu");
    expect(parsed.date).toBe("2026-04-22");
    expect(parsed.exercises[0].equipmentHint).toBe("dumbbell");
    const { workout, matched } = buildWorkoutFromParsed(parsed);
    expect(matched).toBe(1);
    expect(workout.loggedSets[0].exerciseId).toBe("dumbbell-romanian-deadlift");
  });

  it("drops skipped n/a set rows and in-app notices", () => {
    const parsed = parseWorkoutText(`
WEEK 5 DAY 3
Friday · Sedmi po redu
MAY 30, 2026 v
TRICEPS
Cable Triceps Pushdown (Bar)
Cable
WEIGHT REPS © LOG
12.5 n/a
FOREARMS
Reverse Curl
Barbell
Exercise has no sets programmed
HAMSTRINGS
Seated Leg Curl
Machine
WEIGHT REPS © LOG
25 12
`);
    // The n/a exercise has no usable sets; the notice isn't a title.
    expect(parsed.exercises).toHaveLength(1);
    expect(parsed.exercises[0].rawName).toBe("Seated Leg Curl");
    expect(parsed.exercises[0].sets).toEqual([{ weight: 25, reps: 12 }]);
  });

  it("repairs OCR stroke-letter days from the date badge", () => {
    // Tiny badges fuse "11" into M/NM; only days 1 and 11 are pure strokes.
    expect(extractDate("APR NM, 2026 v")).toBe("2026-04-11");
    expect(extractDate("APR M, 2026")).toBe("2026-04-11");
    expect(extractDate("MAR I, 2026")).toBe("2026-03-01");
    // A clean digit day always wins over stroke repair.
    expect(extractDate("MAR 14, 2026 v")).toBe("2026-03-14");
    expect(extractDate("SEP 5.2025")).toBe("2025-09-05");
    expect(extractDate("APR27,2026 v")).toBe("2026-04-27");
    expect(extractDate("no date here")).toBeNull();
  });

  it("pairs numbers that OCR split across separate lines", () => {
    const parsed = parseWorkoutText(`
WEEK 1 DAY 1
SEP 1, 2025
CHEST
Bench Press
Barbell
60
10
65
8
`);
    expect(parsed.exercises[0].sets).toEqual([
      { weight: 60, reps: 10 },
      { weight: 65, reps: 8 },
    ]);
  });
});

describe("matchExerciseId", () => {
  it("maps the app's exercise names to library ids", () => {
    expect(matchExerciseId("Cable Flexion Row", "back")).toBe("cable-flexion-row");
    expect(matchExerciseId("Pulldown (Normal Grip)", "back")).toBe("pulldown-normal-grip");
    expect(matchExerciseId("Pulldown (Narrow Grip)", "back")).toBe("pulldown-narrow-grip");
    expect(matchExerciseId("Pushup", "chest")).toBe("pushup");
    expect(matchExerciseId("Dumbbell Curl (2-Arm)", "biceps")).toBe("dumbbell-curl-2-arm");
    expect(matchExerciseId("Machine Shoulder Press", "shoulders")).toBe("machine-shoulder-press");
    expect(matchExerciseId("Back Raise (45 degree)", "hamstrings")).toBe("back-raise-45-degree");
    expect(matchExerciseId("Dumbbell Row (2-Arm)", "back")).toBe("dumbbell-row-2-arm");
    expect(matchExerciseId("Bench Press (Wide Grip)", "chest")).toBe("bench-press-wide-grip");
    expect(matchExerciseId("Bench Press (Incline, Medium Grip)", "chest")).toBe("bench-press-incline-medium-grip");
    expect(matchExerciseId("Cable Overhead Triceps Extension", "triceps")).toBe("cable-overhead-triceps-extension");
    expect(matchExerciseId("Cable Overhead Triceps Extension (Rope)", "triceps")).toBe("cable-overhead-triceps-extension-rope");
    expect(matchExerciseId("Cable Triceps Pushdown (Rope)", "triceps")).toBe("cable-triceps-pushdown-rope");
    expect(matchExerciseId("Cable Rope Twist Curl", "biceps")).toBe("cable-rope-twist-curl");
    expect(matchExerciseId("Cable Rope Facepull", "shoulders")).toBe("cable-rope-facepull");
    expect(matchExerciseId("Cable Front Raise (Underhand)", "shoulders")).toBe("cable-front-raise-underhand");
    expect(matchExerciseId("Cable Cross Body Lateral Raise", "shoulders")).toBe("cable-cross-body-lateral-raise");
    expect(matchExerciseId("Technogym MG1000 Wide Chest Press", "chest")).toBe("technogym-wide-chest-press");
    expect(matchExerciseId("Dumbbell Press (Flat)", "chest")).toBe("dumbbell-press-flat");
    expect(matchExerciseId("Dumbbell Flye (Incline)", "chest")).toBe("dumbbell-flye-incline");
    expect(matchExerciseId("Dumbbell Front Squat", "quads")).toBe("dumbbell-front-squat");
    expect(matchExerciseId("Goblet Squat", "quads")).toBe("goblet-squat");
    expect(matchExerciseId("Barbell Upright Row", "shoulders")).toBe("barbell-upright-row");
    expect(matchExerciseId("Leg Extension", "quads")).toBe("leg-extension");
    expect(matchExerciseId("Seated Leg Curl", "hamstrings")).toBe("seated-leg-curl");
    expect(matchExerciseId("Cable Triceps Pushdown (Bar)", "triceps")).toBe("cable-triceps-pushdown-bar");
    expect(matchExerciseId("Pulldown (Underhand Grip)", "back")).toBe("pulldown-underhand-grip");
    expect(matchExerciseId("Dip Machine", "triceps")).toBe("dip-machine");
    expect(matchExerciseId("Machine Hip Thrust", "glutes")).toBe("machine-hip-thrust");
    expect(matchExerciseId("Machine Preacher Curl", "biceps")).toBe("preacher-curl");
    expect(matchExerciseId("Dumbbell Preacher Curl (Single-Arm)", "biceps")).toBe(
      "dumbbell-preacher-curl-single-arm"
    );
    expect(matchExerciseId("Smith Machine Squat", "quads")).toBe("smith-machine-squat");
    expect(matchExerciseId("Reverse Curl", "forearms")).toBe("reverse-curl");
    expect(matchExerciseId("Hack Squat", "quads")).toBe("hack-squat");
  });

  it("uses the equipment subtitle to split near-identical names", () => {
    expect(matchExerciseId("Romanian Deadlift", "hamstrings", "dumbbell")).toBe(
      "dumbbell-romanian-deadlift"
    );
    expect(matchExerciseId("Romanian Deadlift", "hamstrings", "barbell")).toBe(
      "romanian-deadlift"
    );
    expect(matchExerciseId("Romanian Deadlift", "hamstrings")).toBe("romanian-deadlift");
  });

  it("returns null for gibberish", () => {
    expect(matchExerciseId("xyzzy frobnicate")).toBeNull();
  });
});

describe("meso templates", () => {
  it("reference only exercises that exist in the library", async () => {
    const { MESO_TEMPLATES } = await import("@/lib/data/templates");
    const { getExercise } = await import("@/lib/data/exercises");
    for (const t of MESO_TEMPLATES) {
      for (const d of t.days) {
        for (const s of d.slots) {
          expect(getExercise(s.exerciseId), `${t.id}/${d.name}: ${s.exerciseId}`).toBeDefined();
        }
      }
    }
  });
});

describe("buildWorkoutFromParsed", () => {
  it("builds a completed workout on the exact date with all sets logged", () => {
    const parsed = parseWorkoutText(SCREENSHOT_WEEK2_DAY3);
    const { workout, matched, skipped } = buildWorkoutFromParsed(parsed);
    expect(workout.date).toBe("2025-08-30");
    expect(workout.status).toBe("completed");
    expect(matched).toBe(7);
    expect(skipped).toHaveLength(0);
    expect(workout.loggedSets).toHaveLength(14);
    expect(workout.loggedSets.every((s) => s.completed)).toBe(true);
  });
});
