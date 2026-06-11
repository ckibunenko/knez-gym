import { describe, expect, it } from "vitest";
import { estimateOneRepMax, estimateOneRepMaxWithRir } from "./oneRepMax";
import {
  recommendVolumeAdjustment,
  type VolumeAdjustmentInput,
} from "./volumeAdjustment";
import { recommendDeload, type DeloadInput } from "./deload";
import { recommendHypertrophyProgression } from "./hypertrophyProgression";
import { recommendStrengthProgression } from "./strengthProgression";
import { classifyVolume } from "./analytics";

describe("estimateOneRepMax", () => {
  it("returns the weight itself for a single", () => {
    expect(estimateOneRepMax(140, 1)).toBe(140);
  });

  it("applies the Epley formula for multiple reps", () => {
    // 100 * (1 + 5/30) = 116.7
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.7, 1);
  });

  it("returns 0 for invalid inputs", () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });

  it("counts RIR as additional achievable reps", () => {
    expect(estimateOneRepMaxWithRir(100, 5, 2)).toBe(
      estimateOneRepMax(100, 7)
    );
  });
});

const baseVolumeInput: VolumeAdjustmentInput = {
  muscle: "chest",
  currentWeeklySets: 12,
  landmarks: { mv: 6, mev: 10, mav: 18, mrv: 22 },
  performanceTrend: "stable",
  pump: 2,
  soreness: 1,
  jointPain: 0,
  localFatigue: 1,
  recoveryScore: 75,
  targetRirAchieved: true,
};

describe("recommendVolumeAdjustment", () => {
  it("adds sets when progressing below MAV with good recovery", () => {
    const r = recommendVolumeAdjustment(baseVolumeInput);
    expect(r.action).toBe("increase");
    expect(r.setChange).toBeGreaterThanOrEqual(1);
    expect(r.setChange).toBeLessThanOrEqual(2);
  });

  it("maintains when performance is good but soreness is high", () => {
    const r = recommendVolumeAdjustment({
      ...baseVolumeInput,
      performanceTrend: "improving",
      soreness: 3,
    });
    expect(r.action).toBe("maintain");
    expect(r.setChange).toBe(0);
  });

  it("reduces when performance declines with high fatigue", () => {
    const r = recommendVolumeAdjustment({
      ...baseVolumeInput,
      performanceTrend: "declining",
      soreness: 3,
      localFatigue: 3,
    });
    expect(r.action).toBe("reduce");
    expect(r.setChange).toBe(-3);
  });

  it("suggests substitution on high joint pain", () => {
    const r = recommendVolumeAdjustment({ ...baseVolumeInput, jointPain: 3 });
    expect(r.action).toBe("substituteExercise");
    expect(r.setChange).toBeLessThan(0);
  });

  it("pushes toward MEV when below it and recovering well", () => {
    const r = recommendVolumeAdjustment({
      ...baseVolumeInput,
      currentWeeklySets: 7,
    });
    expect(r.action).toBe("increase");
    expect(r.setChange).toBe(2);
  });

  it("flags deload-level reduction above MRV", () => {
    const r = recommendVolumeAdjustment({
      ...baseVolumeInput,
      currentWeeklySets: 24,
    });
    expect(r.action).toBe("deload");
    expect(r.setChange).toBeLessThan(0);
    expect(r.confidence).toBe("high");
  });

  it("never recommends increasing past MAV in the standard path", () => {
    const r = recommendVolumeAdjustment({
      ...baseVolumeInput,
      currentWeeklySets: 17,
      performanceTrend: "improving",
      pump: 1,
    });
    expect(r.setChange).toBeLessThanOrEqual(1);
  });
});

const calmDeloadInput: DeloadInput = {
  consecutivePerformanceDrops: 0,
  musclesNearMrv: 0,
  highSorenessSessions: 0,
  jointPain: 0,
  recoveryScore: 80,
  motivation: 4,
  rirTargetMissed: false,
  userReportsHighFatigue: false,
};

describe("recommendDeload", () => {
  it("does not deload when recovery is good", () => {
    const r = recommendDeload(calmDeloadInput);
    expect(r.deloadRecommended).toBe(false);
    expect(r.suggestedVolumeReductionPercent).toBe(0);
  });

  it("does not deload on a single fatigue signal", () => {
    const r = recommendDeload({ ...calmDeloadInput, jointPain: 3 });
    expect(r.deloadRecommended).toBe(false);
    expect(r.triggeredSignals.length).toBe(1);
  });

  it("deloads when three or more signals fire", () => {
    const r = recommendDeload({
      ...calmDeloadInput,
      consecutivePerformanceDrops: 2,
      musclesNearMrv: 3,
      highSorenessSessions: 2,
    });
    expect(r.deloadRecommended).toBe(true);
    expect(r.suggestedVolumeReductionPercent).toBeGreaterThanOrEqual(40);
    expect(r.suggestedVolumeReductionPercent).toBeLessThanOrEqual(60);
    expect(r.suggestedRir).toBe(4);
    expect(r.suggestedDurationDays).toBeGreaterThan(0);
  });

  it("scales the reduction with signal count, capped at 60%", () => {
    const heavy = recommendDeload({
      ...calmDeloadInput,
      consecutivePerformanceDrops: 3,
      musclesNearMrv: 4,
      highSorenessSessions: 3,
      jointPain: 3,
      recoveryScore: 20,
      motivation: 1,
      rirTargetMissed: true,
      userReportsHighFatigue: true,
    });
    expect(heavy.suggestedVolumeReductionPercent).toBe(60);
    expect(heavy.suggestedDurationDays).toBe(7);
  });
});

describe("recommendHypertrophyProgression", () => {
  const base = { targetRepMin: 8, targetRepMax: 12, targetRir: 2 };

  it("keeps or slightly increases load when top of range is reached at target RIR", () => {
    const r = recommendHypertrophyProgression({
      ...base,
      sets: [
        { weight: 80, reps: 12, rir: 2 },
        { weight: 80, reps: 12, rir: 2 },
        { weight: 80, reps: 12, rir: 2 },
      ],
    });
    expect(r.action).toBe("increaseLoad");
    expect(r.suggestedLoadChangePercent).toBe(2.5);
  });

  it("increases load more when RIR is above target at top of range", () => {
    const r = recommendHypertrophyProgression({
      ...base,
      sets: [
        { weight: 80, reps: 12, rir: 3 },
        { weight: 80, reps: 12, rir: 3 },
        { weight: 80, reps: 12, rir: 3 },
      ],
    });
    expect(r.action).toBe("increaseLoad");
    expect(r.suggestedLoadChangePercent).toBe(5);
  });

  it("reduces load when reps collapse below range at zero RIR", () => {
    const r = recommendHypertrophyProgression({
      ...base,
      sets: [
        { weight: 80, reps: 8, rir: 0 },
        { weight: 80, reps: 7, rir: 0 },
        { weight: 80, reps: 6, rir: 0 },
      ],
    });
    expect(r.action).toBe("reduceLoad");
    expect(r.suggestedLoadChangePercent).toBeLessThan(0);
  });

  it("reduces volume instead when fatigue is high", () => {
    const r = recommendHypertrophyProgression({
      ...base,
      highFatigue: true,
      sets: [
        { weight: 80, reps: 7, rir: 0 },
        { weight: 80, reps: 6, rir: 0 },
      ],
    });
    expect(r.action).toBe("reduceVolume");
  });

  it("adds volume when stable, mid-range, and recovering well", () => {
    const r = recommendHypertrophyProgression({
      ...base,
      performanceStable: true,
      sets: [
        { weight: 80, reps: 10, rir: 2 },
        { weight: 80, reps: 10, rir: 2 },
      ],
    });
    expect(r.action).toBe("addVolume");
  });

  it("keeps load with no sets logged", () => {
    const r = recommendHypertrophyProgression({ ...base, sets: [] });
    expect(r.action).toBe("keepLoad");
  });
});

describe("recommendStrengthProgression", () => {
  const base = { targetRir: 2, consecutiveFailures: 0, loadIncrement: 2.5 };

  it("increases load when all sets completed at target RIR", () => {
    const r = recommendStrengthProgression({
      ...base,
      sets: [
        { weight: 140, targetReps: 5, actualReps: 5, rir: 2 },
        { weight: 140, targetReps: 5, actualReps: 5, rir: 2 },
        { weight: 140, targetReps: 5, actualReps: 5, rir: 2 },
      ],
    });
    expect(r.action).toBe("increaseLoad");
    expect(r.loadChange).toBe(2.5);
  });

  it("repeats load when reps were missed at maximal effort (first miss)", () => {
    const r = recommendStrengthProgression({
      ...base,
      sets: [
        { weight: 140, targetReps: 5, actualReps: 4, rir: 0 },
        { weight: 140, targetReps: 5, actualReps: 3, rir: 0 },
      ],
    });
    expect(r.action).toBe("repeatLoad");
    expect(r.loadChange).toBe(0);
  });

  it("deloads the lift after two consecutive failures", () => {
    const r = recommendStrengthProgression({
      ...base,
      consecutiveFailures: 2,
      sets: [{ weight: 140, targetReps: 5, actualReps: 3, rir: 0 }],
    });
    expect(r.action).toBe("deloadLift");
    // 5-10% of 140 = 7 to 14 kg reduction
    expect(r.loadChange).toBeLessThanOrEqual(-7);
    expect(r.loadChange).toBeGreaterThanOrEqual(-14);
  });

  it("tracks estimated 1RM from the best set", () => {
    const r = recommendStrengthProgression({
      ...base,
      sets: [{ weight: 140, targetReps: 5, actualReps: 5, rir: 2 }],
    });
    expect(r.estimatedOneRepMax).toBeCloseTo(163.3, 1);
  });
});

describe("classifyVolume", () => {
  const lm = { mv: 6, mev: 10, mav: 18, mrv: 22 };
  it("classifies all four zones", () => {
    expect(classifyVolume(8, lm)).toBe("belowMev");
    expect(classifyVolume(14, lm)).toBe("productive");
    expect(classifyVolume(19, lm)).toBe("nearMrv");
    expect(classifyVolume(23, lm)).toBe("exceedingMrv");
  });
});

// --- analyzeWorkout ------------------------------------------------------
import { analyzeWorkout } from "./analyzeWorkout";
import type { Workout, LoggedSet, ExercisePrescription } from "@/lib/types";

function set(exerciseId: string, n: number, weight: number, reps: number): LoggedSet {
  return {
    id: `s-${exerciseId}-${n}`,
    exerciseId,
    setNumber: n,
    weight,
    reps,
    rir: 2,
    completed: true,
    skipped: false,
    painFlag: false,
    techniqueQuality: "good",
  };
}

function presc(exerciseId: string, sets = 3): ExercisePrescription {
  return {
    id: `p-${exerciseId}`,
    exerciseId,
    targetSets: sets,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    restSeconds: 120,
    goalType: "hypertrophy",
  };
}

function workout(id: string, date: string, sets: LoggedSet[]): Workout {
  return {
    id,
    name: "Upper A",
    date,
    prescriptions: [presc("bench-press-wide-grip")],
    loggedSets: sets,
    exerciseFeedback: [],
    status: "completed",
  };
}

describe("analyzeWorkout", () => {
  const prev = workout("w1", "2026-06-01", [
    set("bench-press-wide-grip", 1, 100, 8),
    set("bench-press-wide-grip", 2, 100, 8),
    set("bench-press-wide-grip", 3, 100, 6),
  ]);
  const today = workout("w2", "2026-06-08", [
    set("bench-press-wide-grip", 1, 100, 12),
    set("bench-press-wide-grip", 2, 100, 12),
    set("bench-press-wide-grip", 3, 100, 12),
  ]);

  it("flags a PR when e1RM beats all earlier sessions", () => {
    const a = analyzeWorkout(today, [prev, today]);
    expect(a.prCount).toBe(1);
    expect(a.exercises[0].isPr).toBe(true);
    expect(a.exercises[0].e1rmDeltaPct).toBeGreaterThan(0);
  });

  it("suggests adding load when every set hits the top of the range", () => {
    const a = analyzeWorkout(today, [prev, today]);
    expect(a.exercises[0].suggestion).toMatch(/add/i);
    expect(a.exercises[0].repRangeHits).toBe(3);
  });

  it("suggests reducing load when reps fall below the range", () => {
    const a = analyzeWorkout(prev, [prev]);
    expect(a.exercises[0].suggestion).toMatch(/drop|rest/i);
    expect(a.exercises[0].prevBestE1rm).toBeNull();
    expect(a.exercises[0].isPr).toBe(false);
  });

  it("computes rep drop-off at the top weight", () => {
    const a = analyzeWorkout(prev, [prev]);
    expect(a.exercises[0].repDropOffPct).toBe(25); // 8 → 6
  });

  it("compares tonnage with previous same-name sessions", () => {
    const a = analyzeWorkout(today, [prev, today]);
    expect(a.avgPrevTonnage).toBeCloseTo(2200, 0); // 100*(8+8+6)
    expect(a.tonnage).toBe(3600);
  });
});

// --- coach ---------------------------------------------------------------
import { suggestNextLoad, findSubstitute, coachInsights, sessionCall, prChance } from "./coach";

describe("suggestNextLoad", () => {
  it("suggests a load increase after filling the rep range", () => {
    const prev = workout("c1", "2026-06-05", [
      set("bench-press-wide-grip", 1, 100, 12),
      set("bench-press-wide-grip", 2, 100, 12),
      set("bench-press-wide-grip", 3, 100, 12),
    ]);
    const today = workout("c2", "2026-06-10", []);
    const s = suggestNextLoad([prev, today], today, presc("bench-press-wide-grip"));
    expect(s).not.toBeNull();
    expect(s!.action).toBe("increase");
    expect(s!.weight).toBeGreaterThan(100);
    expect(s!.weight % 2.5).toBe(0); // plate-loadable
  });

  it("returns null with no history", () => {
    const today = workout("c3", "2026-06-10", []);
    expect(suggestNextLoad([today], today, presc("bench-press-wide-grip"))).toBeNull();
  });
});

describe("findSubstitute", () => {
  it("finds a same-muscle alternative with lower joint stress", () => {
    const sub = findSubstitute("bench-press-wide-grip", { lowerJointStress: true });
    expect(sub).not.toBeNull();
    expect(sub!.primaryMuscle).toBe("chest");
    expect(sub!.id).not.toBe("bench-press-wide-grip");
  });
});

describe("coachInsights", () => {
  it("flags a lift stalled across three sessions", () => {
    const sets = (id: string) => [
      set("bench-press-wide-grip", 1, 100, 8),
      set("bench-press-wide-grip", 2, 100, 8),
    ];
    const ws = [
      workout("s1", "2026-05-25", sets("s1")),
      workout("s2", "2026-06-01", sets("s2")),
      workout("s3", "2026-06-08", sets("s3")),
    ];
    const insights = coachInsights([], ws);
    expect(insights.some((i) => i.id === "stall-bench-press-wide-grip")).toBe(true);
  });

  it("reports all-clear when nothing is wrong", () => {
    const ws = [
      workout("g1", "2026-06-01", [set("bench-press-wide-grip", 1, 100, 8)]),
      workout("g2", "2026-06-08", [set("bench-press-wide-grip", 1, 102.5, 8)]),
    ];
    const insights = coachInsights([], ws);
    expect(insights.some((i) => i.id === "all-good")).toBe(true);
  });
});

describe("sessionCall", () => {
  function withFeedback(w: Workout, energy: number, soreness: number): Workout {
    return {
      ...w,
      workoutFeedback: {
        energy,
        motivation: energy,
        soreness,
        overallDifficulty: soreness >= 2 ? 9 : 5,
      },
    };
  }

  it("gives a green light when recovery looks good", () => {
    const prev = withFeedback(
      workout("r1", "2026-06-08", [set("bench-press-wide-grip", 1, 100, 8)]),
      5,
      0
    );
    const today = workout("r2", "2026-06-10", []);
    const c = sessionCall([prev, today], today);
    expect(c.mode).toBe("push");
    expect(c.adjust).toBeUndefined();
  });

  it("offers a session trim when recovery signals are poor", () => {
    const ws = ["2026-06-06", "2026-06-07", "2026-06-08"].map((d, i) =>
      withFeedback(
        workout(`p${i}`, d, [set("bench-press-wide-grip", 1, 100, 8)]),
        1,
        3
      )
    );
    const today = workout("p9", "2026-06-09", []);
    const c = sessionCall([...ws, today], today);
    expect(c.mode).toBe("caution");
    expect(c.adjust).toEqual({ setsDelta: -1, rirDelta: 1 });
  });

  it("recognizes a deload session by name", () => {
    const today = { ...workout("d1", "2026-06-10", []), name: "Upper A (Deload)" };
    const c = sessionCall([today], today);
    expect(c.mode).toBe("standard");
    expect(c.title.toLowerCase()).toContain("deload");
  });
});

describe("coach context awareness", () => {
  const strengthPresc: ExercisePrescription = {
    ...presc("squat"),
    targetRepMin: 5,
    targetRepMax: 5,
    goalType: "strength",
  };

  it("backs off a strength lift after two straight missed sessions", () => {
    const miss = (id: string, date: string) => ({
      ...workout(id, date, [set("squat", 1, 100, 3), set("squat", 2, 100, 3)]),
      prescriptions: [strengthPresc],
    });
    const ws = [miss("f1", "2026-06-01"), miss("f2", "2026-06-05")];
    const today = { ...workout("f3", "2026-06-10", []), prescriptions: [strengthPresc] };
    const s = suggestNextLoad([...ws, today], today, strengthPresc);
    expect(s!.action).toBe("reduce");
    expect(s!.weight).toBeLessThan(100);
  });

  it("spots a PR window when the suggested load projects a new best", () => {
    const prev = workout("pw1", "2026-06-05", [
      set("bench-press-wide-grip", 1, 100, 12),
      set("bench-press-wide-grip", 2, 100, 12),
      set("bench-press-wide-grip", 3, 100, 12),
    ]);
    const today = workout("pw2", "2026-06-10", []);
    const chance = prChance([prev, today], today);
    expect(chance).not.toBeNull();
    expect(chance!.exerciseName).toMatch(/Bench/i);
    expect(chance!.weight).toBeGreaterThan(100);
  });

  it("flags slipping adherence from missed planned sessions", () => {
    const slip = (id: string, date: string): Workout => ({
      ...workout(id, date, []),
      status: "planned",
    });
    const insights = coachInsights([], [slip("a1", "2026-06-08"), slip("a2", "2026-06-09")]);
    expect(insights.some((i) => i.id === "adherence")).toBe(true);
  });
});
