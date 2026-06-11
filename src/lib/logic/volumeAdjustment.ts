import type {
  Confidence,
  MuscleGroupId,
  RecommendationAction,
  VolumeLandmarks,
} from "@/lib/types";

export type PerformanceTrend = "improving" | "stable" | "declining";

export interface VolumeAdjustmentInput {
  muscle: MuscleGroupId;
  currentWeeklySets: number;
  landmarks: VolumeLandmarks;
  performanceTrend: PerformanceTrend;
  /** 0-3 averages from recent exercise feedback */
  pump: number;
  soreness: number;
  jointPain: number;
  localFatigue: number;
  /** 0-100; below 40 is poor recovery */
  recoveryScore: number;
  targetRirAchieved: boolean;
}

export interface VolumeAdjustmentResult {
  muscle: MuscleGroupId;
  action: RecommendationAction;
  setChange: number;
  reason: string;
  confidence: Confidence;
}

const HIGH = 2; // threshold on 0-3 scales where a signal counts as "high"

/**
 * Rule-based weekly volume recommendation for one muscle group.
 * Rules are evaluated in priority order: safety first (MRV, joint pain),
 * then fatigue, then growth opportunities.
 */
export function recommendVolumeAdjustment(
  input: VolumeAdjustmentInput
): VolumeAdjustmentResult {
  const {
    muscle,
    currentWeeklySets: sets,
    landmarks: { mev, mav, mrv },
    performanceTrend,
    soreness,
    jointPain,
    localFatigue,
    recoveryScore,
  } = input;

  // Rule 6: above MRV — pull back immediately.
  if (sets > mrv) {
    return {
      muscle,
      action: "deload",
      setChange: -(sets - mav),
      reason: `Current volume (${sets} sets) exceeds your maximum recoverable volume (${mrv}). Reduce immediately and consider a deload.`,
      confidence: "high",
    };
  }

  // Rule 4: high joint pain — reduce and substitute.
  if (jointPain >= HIGH) {
    return {
      muscle,
      action: "substituteExercise",
      setChange: -2,
      reason: `Joint discomfort is elevated. Reduce volume by 2 sets and substitute the aggravating exercise for a lower-stress option.`,
      confidence: "high",
    };
  }

  // Rule 3: declining performance + high fatigue signals.
  if (
    performanceTrend === "declining" &&
    (soreness >= HIGH || localFatigue >= HIGH)
  ) {
    const drop = soreness >= HIGH && localFatigue >= HIGH ? 3 : 2;
    return {
      muscle,
      action: "reduce",
      setChange: -drop,
      reason: `Performance dropped while soreness/fatigue is high. Cut ${drop} sets to restore recovery.`,
      confidence: "high",
    };
  }

  // Declining without overt fatigue: hold and watch.
  if (performanceTrend === "declining") {
    return {
      muscle,
      action: "maintain",
      setChange: 0,
      reason: `Performance is dipping without clear fatigue signals. Hold volume and reassess after the next session.`,
      confidence: "medium",
    };
  }

  // Rule 5: below MEV with good recovery — climb toward MEV.
  if (sets < mev && recoveryScore >= 40 && jointPain < HIGH) {
    const bump = Math.min(2, mev - sets);
    return {
      muscle,
      action: "increase",
      setChange: bump,
      reason: `Current volume (${sets} sets) is below your minimum effective volume (${mev}). Add ${bump} set${bump > 1 ? "s" : ""} to enter the productive range.`,
      confidence: "high",
    };
  }

  // Rule 2: improving but very sore — maintain.
  if (soreness >= HIGH) {
    return {
      muscle,
      action: "maintain",
      setChange: 0,
      reason: `Performance is holding but soreness is high. Maintain volume until recovery normalizes.`,
      confidence: "medium",
    };
  }

  // Rule 1: progressing, recovering, room below MAV — add volume.
  if (sets < mav && recoveryScore >= 40) {
    const bump = performanceTrend === "improving" && input.pump < 2 ? 2 : 1;
    const capped = Math.min(bump, mav - sets);
    return {
      muscle,
      action: "increase",
      setChange: capped,
      reason: `Performance is ${performanceTrend}, soreness is manageable, and volume (${sets} sets) is below your adaptive ceiling (${mav}). Add ${capped} set${capped > 1 ? "s" : ""} next week.`,
      confidence: performanceTrend === "improving" ? "high" : "medium",
    };
  }

  // Between MAV and MRV: only push if everything is green.
  if (sets < mrv && performanceTrend === "improving" && recoveryScore >= 70) {
    return {
      muscle,
      action: "increase",
      setChange: 1,
      reason: `You are above the adaptive range but still recovering well and progressing. Add 1 careful set — you are approaching your recoverable ceiling (${mrv}).`,
      confidence: "low",
    };
  }

  return {
    muscle,
    action: "maintain",
    setChange: 0,
    reason: `Volume (${sets} sets) is near the top of your productive range. Maintain and focus on load progression.`,
    confidence: "medium",
  };
}
