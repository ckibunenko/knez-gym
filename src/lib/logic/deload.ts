export interface DeloadInput {
  /** Consecutive workouts where key-lift performance dropped */
  consecutivePerformanceDrops: number;
  /** Number of muscle groups at or above ~90% of MRV */
  musclesNearMrv: number;
  /** Consecutive sessions with soreness >= 2 (0-3 scale) */
  highSorenessSessions: number;
  /** 0-3 average joint discomfort across recent sessions */
  jointPain: number;
  /** 0-100 */
  recoveryScore: number;
  /** 1-5 average from recent workout feedback */
  motivation: number;
  /** True if target RIR could not be hit at normal loads */
  rirTargetMissed: boolean;
  /** Self-reported high fatigue */
  userReportsHighFatigue: boolean;
}

export interface DeloadResult {
  deloadRecommended: boolean;
  triggeredSignals: string[];
  reason: string;
  suggestedVolumeReductionPercent: number;
  suggestedRir: number;
  suggestedDurationDays: number;
}

/**
 * Deload when several independent fatigue signals fire at once.
 * One bad day is noise; three concurrent signals is a pattern.
 */
export function recommendDeload(input: DeloadInput): DeloadResult {
  const signals: string[] = [];

  if (input.consecutivePerformanceDrops >= 2)
    signals.push("performance dropped for 2+ consecutive workouts");
  if (input.musclesNearMrv >= 2)
    signals.push(`${input.musclesNearMrv} muscle groups near or above MRV`);
  if (input.highSorenessSessions >= 2)
    signals.push("soreness elevated for 2+ sessions");
  if (input.jointPain >= 2) signals.push("joint discomfort elevated");
  if (input.recoveryScore < 40) signals.push("recovery score is low");
  if (input.motivation <= 2) signals.push("motivation is low");
  if (input.rirTargetMissed)
    signals.push("target RIR cannot be hit at normal loads");
  if (input.userReportsHighFatigue) signals.push("self-reported high fatigue");

  const deloadRecommended = signals.length >= 3;
  // Scale the reduction with how loud the fatigue signals are.
  const severity = Math.min(signals.length, 6);
  const reductionPercent = deloadRecommended ? 40 + (severity - 3) * 7 : 0;

  return {
    deloadRecommended,
    triggeredSignals: signals,
    reason: deloadRecommended
      ? `Deload recommended: ${signals.join("; ")}.`
      : signals.length > 0
        ? `Fatigue signals present (${signals.join("; ")}) but not yet enough to require a deload. Monitor closely.`
        : "Recovery looks good. No deload needed.",
    suggestedVolumeReductionPercent: Math.min(reductionPercent, 60),
    suggestedRir: deloadRecommended ? 4 : 0,
    suggestedDurationDays: deloadRecommended ? (severity >= 5 ? 7 : 5) : 0,
  };
}
