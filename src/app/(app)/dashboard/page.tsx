"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useActiveMesocycle,
  useHydrated,
  useTrainingStore,
} from "@/lib/store";
import { runEngine } from "@/lib/logic/engine";
import { coachInsights, type CoachInsight } from "@/lib/logic/coach";
import {
  classifyVolume,
  e1rmHistory,
  personalRecords,
  weeklySetsPerMuscle,
  workoutTonnage,
} from "@/lib/logic/analytics";
import { daysAgo, formatDate, isoDate, cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  LinkButton,
  MuscleChip,
  PageHeader,
  PageSkeleton,
  Stat,
  VolumeMeter,
  VolumeZoneBadge,
} from "@/components/ui";
import {
  DeloadIcon,
  ReadinessIcon,
  StrengthIcon,
  HypertrophyIcon,
  TrendIcon,
  VolumeLandmarksIcon,
} from "@/components/icons/training";
import { MesocycleIcon, WorkoutIcon } from "@/components/icons/navigation";
import { PrIcon } from "@/components/icons/feedback";
import { MuscleIcon } from "@/components/icons/muscles";
import { getExercise } from "@/lib/data/exercises";

const PHASE_LABELS: Record<string, string> = {
  accumulation: "Accumulation",
  intensification: "Intensification",
  deload: "Deload",
  maintenance: "Maintenance",
};

function phaseForWeek(week: number, durationWeeks: number, deloadWeek: number) {
  if (week >= deloadWeek) return "deload";
  if (week >= Math.max(2, durationWeeks - 2)) return "intensification";
  return "accumulation";
}

const KEY_LIFTS = ["bench-press-wide-grip", "squat", "overhead-press", "romanian-deadlift"];

const COACH_TONES: Record<CoachInsight["severity"], string> = {
  danger: "border-danger/40 bg-danger-soft/40",
  warn: "border-warn/40 bg-warn-soft/40",
  info: "border-border bg-raised",
  good: "border-good/40 bg-good-soft/40",
};

export default function DashboardPage() {
  const hydrated = useHydrated();
  const muscleGroups = useTrainingStore((s) => s.muscleGroups);
  const workouts = useTrainingStore((s) => s.workouts);
  const meso = useActiveMesocycle();

  const engine = useMemo(
    () => runEngine(muscleGroups, workouts, meso),
    [muscleGroups, workouts, meso]
  );

  const coach = useMemo(
    () => coachInsights(muscleGroups, workouts, meso),
    [muscleGroups, workouts, meso]
  );

  const completed = useMemo(
    () => workouts.filter((w) => w.status === "completed"),
    [workouts]
  );

  const weekSets = useMemo(() => {
    const cutoff = daysAgo(7);
    return weeklySetsPerMuscle(
      completed.filter((w) => w.date > cutoff)
    );
  }, [completed]);

  const nextWorkout = useMemo(() => {
    const today = isoDate(new Date());
    return [...workouts]
      .filter((w) => w.status === "planned" && w.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [workouts]);

  const trainedThisWeek = useMemo(() => {
    const cutoff = daysAgo(7);
    return completed.filter((w) => w.date > cutoff).length;
  }, [completed]);

  const prs = useMemo(() => personalRecords(completed).slice(0, 4), [completed]);

  const keyLifts = useMemo(
    () =>
      KEY_LIFTS.map((id) => {
        const history = e1rmHistory(completed, id);
        if (history.length === 0) return null;
        const latest = history[history.length - 1].e1rm;
        const first = history[0].e1rm;
        const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
        return { id, name: getExercise(id)?.name ?? id, latest, deltaPct };
      }).filter(Boolean) as { id: string; name: string; latest: number; deltaPct: number }[],
    [completed]
  );

  const volumeTrend = useMemo(() => {
    // total completed sets per week, last 3 training weeks
    const weeks: { label: string; sets: number; tonnage: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const from = daysAgo((i + 1) * 7);
      const to = daysAgo(i * 7);
      const ws = completed.filter((w) => w.date > from && w.date <= to);
      weeks.push({
        label: i === 0 ? "This week" : i === 1 ? "Last week" : "2 weeks ago",
        sets: ws.reduce(
          (s, w) => s + w.loggedSets.filter((x) => x.completed).length,
          0
        ),
        tonnage: ws.reduce((s, w) => s + workoutTonnage(w), 0),
      });
    }
    return weeks;
  }, [completed]);

  const topActions = useMemo(() => {
    const interesting = engine.volumeRecs.filter((r) => r.action !== "maintain");
    const list = interesting.length > 0 ? interesting : engine.volumeRecs;
    return list.slice(0, 4);
  }, [engine.volumeRecs]);

  const updateWorkout = useTrainingStore((s) => s.updateWorkout);
  const [appliedRecs, setAppliedRecs] = useState<Set<string>>(new Set());

  // Planned sessions of the active meso's next week, the apply target.
  const nextWeekWorkouts = useMemo(
    () =>
      meso
        ? workouts.filter(
            (w) =>
              w.mesocycleId === meso.id &&
              w.week === meso.currentWeek + 1 &&
              w.status === "planned"
          )
        : [],
    [workouts, meso]
  );

  function nextWeekHasMuscle(muscle: string): boolean {
    return nextWeekWorkouts.some((w) =>
      w.prescriptions.some((p) => getExercise(p.exerciseId)?.primaryMuscle === muscle)
    );
  }

  /** Adds/removes the recommended sets on next week's matching exercises. */
  function applyRec(rec: (typeof topActions)[number]) {
    if (!meso || !rec.muscleGroup || !rec.setChange) return;
    let remaining = rec.setChange;
    for (const w of nextWeekWorkouts) {
      if (remaining === 0) break;
      const prescs = w.prescriptions.map((p) => ({ ...p }));
      let changed = false;
      for (const p of prescs) {
        if (remaining === 0) break;
        if (getExercise(p.exerciseId)?.primaryMuscle !== rec.muscleGroup) continue;
        if (remaining > 0) {
          p.targetSets += 1;
          remaining -= 1;
          changed = true;
        } else if (p.targetSets > 1) {
          p.targetSets -= 1;
          remaining += 1;
          changed = true;
        }
      }
      if (changed) updateWorkout(w.id, { prescriptions: prescs });
    }
    setAppliedRecs((s) => new Set(s).add(rec.muscleGroup!));
  }

  if (!hydrated) return <PageSkeleton />;

  const phase = meso
    ? phaseForWeek(meso.currentWeek, meso.durationWeeks, meso.deloadWeek)
    : null;

  const readinessTone =
    engine.readiness >= 70 ? "good" : engine.readiness >= 45 ? "warn" : "danger";

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title="Dashboard"
        description="Your training status at a glance."
        action={
          nextWorkout && (
            <LinkButton href={`/workouts/${nextWorkout.id}/log`} variant="primary">
              Start next workout →
            </LinkButton>
          )
        }
      />

      {engine.deload.deloadRecommended && (
        <Card className="border-warn/40 bg-warn-soft">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-warn">
              <DeloadIcon size={22} />
            </span>
            <div>
              <div className="font-semibold text-warn">Deload recommended</div>
              <p className="mt-1 text-sm text-text-secondary">{engine.deload.reason}</p>
              <p className="mt-1 text-xs text-muted">
                Suggested: cut volume ~{engine.deload.suggestedVolumeReductionPercent}%,
                train at {engine.deload.suggestedRir} RIR for{" "}
                {engine.deload.suggestedDurationDays} days.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Coach digest: prioritized read of the last month of training */}
      {coach.length > 0 && (
        <Card>
          <CardTitle icon={<ReadinessIcon size={16} />}>Coach</CardTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {coach.slice(0, 6).map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border p-3",
                  COACH_TONES[insight.severity]
                )}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {insight.muscle && <MuscleIcon muscle={insight.muscle} size={15} />}
                  {insight.title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {insight.detail}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Row 1: meso + readiness */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<MesocycleIcon size={16} />}>Current mesocycle</CardTitle>
          {meso ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/mesocycles/${meso.id}`}
                  className="text-lg font-semibold hover:text-accent"
                >
                  {meso.name}
                </Link>
                <Badge tone={phase === "deload" ? "warn" : "accent"}>
                  {PHASE_LABELS[phase!]}
                </Badge>
                <Badge tone="neutral" className="capitalize">{meso.goal}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat
                  label="Week"
                  value={
                    <>
                      {meso.currentWeek}
                      <span className="text-sm text-muted"> / {meso.durationWeeks}</span>
                    </>
                  }
                />
                <Stat label="Sessions this week" value={`${trainedThisWeek} / ${meso.days.length}`} />
                <Stat
                  label="Next workout"
                  value={
                    nextWorkout ? (
                      <span className="block truncate text-base" title={nextWorkout.name}>
                        {nextWorkout.name}
                      </span>
                    ) : (
                      <span className="text-base text-muted">—</span>
                    )
                  }
                  sub={nextWorkout ? formatDate(nextWorkout.date) : "Nothing planned"}
                />
                <Stat
                  label="Deload"
                  value={<span className="text-base">Week {meso.deloadWeek}</span>}
                  sub={`${Math.max(0, meso.deloadWeek - meso.currentWeek)} weeks away`}
                />
              </div>
              {/* week progress strip */}
              <div className="mt-5 flex gap-1.5">
                {Array.from({ length: meso.durationWeeks }, (_, i) => i + 1).map((w) => (
                  <div
                    key={w}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      w < meso.currentWeek
                        ? "bg-accent/60"
                        : w === meso.currentWeek
                          ? "bg-accent"
                          : w >= meso.deloadWeek
                            ? "bg-warn/30"
                            : "bg-overlay"
                    )}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-text-secondary">No active mesocycle.</p>
              <LinkButton href="/mesocycles/new" variant="primary" className="mt-4">
                Create a mesocycle
              </LinkButton>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle icon={<ReadinessIcon size={16} />}>Readiness</CardTitle>
          <div className="flex items-center gap-5">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-overlay)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={`var(--color-${readinessTone})`}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(engine.readiness / 100) * 264} 264`}
                  className="transition-[stroke-dasharray] duration-700 ease-out"
                />
              </svg>
              <div className="tnum absolute inset-0 flex items-center justify-center text-2xl font-bold">
                {engine.readiness}
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div
                className={cn(
                  "font-semibold",
                  readinessTone === "good" && "text-good",
                  readinessTone === "warn" && "text-warn",
                  readinessTone === "danger" && "text-danger"
                )}
              >
                {engine.readiness >= 70
                  ? "Ready to push"
                  : engine.readiness >= 45
                    ? "Train, but manage effort"
                    : "Recovery day advised"}
              </div>
              <p className="text-xs leading-relaxed text-muted">
                {engine.readiness >= 70
                  ? "Recent energy, soreness, and joint signals look good. Full intensity is on the table."
                  : engine.readiness >= 45
                    ? "Some fatigue is accumulating. Hit your targets but skip the hero sets."
                    : "Multiple recovery signals are low. Light technique work or rest today."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: weekly volume by muscle */}
      <Card>
        <CardTitle
          icon={<VolumeLandmarksIcon size={16} />}
          action={
            <Link href="/progress" className="text-xs text-muted hover:text-text">
              Full analytics →
            </Link>
          }
        >
          Weekly volume by muscle
        </CardTitle>
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {muscleGroups
            .filter((mg) => (weekSets[mg.id] ?? 0) > 0)
            .sort((a, b) => (weekSets[b.id] ?? 0) - (weekSets[a.id] ?? 0))
            .map((mg) => {
              const sets = weekSets[mg.id] ?? 0;
              const lm = meso?.landmarkOverrides[mg.id] ?? mg.landmarks;
              return (
                <div key={mg.id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0">
                    <MuscleChip muscle={mg.id} />
                  </span>
                  <div className="flex-1">
                    <VolumeMeter sets={sets} mev={lm.mev} mav={lm.mav} mrv={lm.mrv} />
                  </div>
                  <span className="tnum w-12 shrink-0 text-right text-sm text-text-secondary">
                    {sets}
                  </span>
                  <span className="hidden w-28 shrink-0 text-right sm:block">
                    <VolumeZoneBadge zone={classifyVolume(sets, lm)} />
                  </span>
                </div>
              );
            })}
          {Object.keys(weekSets).length === 0 && (
            <p className="text-sm text-muted md:col-span-2">
              No completed sets in the last 7 days yet.
            </p>
          )}
        </div>
      </Card>

      {/* Row 3: strength + hypertrophy + actions */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardTitle icon={<StrengthIcon size={16} />}>Strength progress</CardTitle>
          <div className="space-y-3">
            {keyLifts.map((lift) => (
              <div key={lift.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-text-secondary" title={lift.name}>
                  {lift.name}
                </span>
                <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                  <span className="tnum text-sm font-semibold">{lift.latest} kg</span>
                  <span
                    className={cn(
                      "tnum text-xs",
                      lift.deltaPct >= 0 ? "text-good" : "text-danger"
                    )}
                  >
                    {lift.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(lift.deltaPct).toFixed(1)}%
                  </span>
                </span>
              </div>
            ))}
            {keyLifts.length === 0 && (
              <p className="text-sm text-muted">Log strength work to see e1RM trends.</p>
            )}
          </div>
          {prs.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                <PrIcon size={14} /> Recent PRs
              </div>
              <div className="space-y-1.5">
                {prs.map((pr, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-text-secondary" title={pr.exerciseName}>
                      {pr.exerciseName}
                    </span>
                    <span className="tnum shrink-0 whitespace-nowrap text-muted">
                      {pr.weight}kg × {pr.reps} · {formatDate(pr.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle icon={<HypertrophyIcon size={16} />}>Hypertrophy progress</CardTitle>
          <div className="space-y-4">
            {volumeTrend.map((w) => {
              const maxSets = Math.max(...volumeTrend.map((x) => x.sets), 1);
              return (
                <div key={w.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{w.label}</span>
                    <span className="tnum text-muted">
                      {w.sets} sets · {(w.tonnage / 1000).toFixed(1)}t
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-overlay">
                    <div
                      className="h-2 rounded-full bg-violet"
                      style={{ width: `${(w.sets / maxSets) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs leading-relaxed text-muted">
              Working volume across all muscle groups. Aim for a gentle ramp
              across the block, then a clear dip on deload week.
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle icon={<TrendIcon size={16} />}>Next recommended actions</CardTitle>
          <div className="space-y-3">
            {topActions.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-border bg-raised p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    {rec.muscleGroup ? (
                      <MuscleChip muscle={rec.muscleGroup} />
                    ) : (
                      <span className="text-sm font-medium">General</span>
                    )}
                  </span>
                  <Badge
                    tone={
                      rec.action === "increase"
                        ? "good"
                        : rec.action === "maintain"
                          ? "neutral"
                          : rec.action === "deload"
                            ? "danger"
                            : "warn"
                    }
                  >
                    {rec.action === "substituteExercise"
                      ? "substitute"
                      : rec.action}
                    {rec.setChange
                      ? ` ${rec.setChange > 0 ? "+" : ""}${rec.setChange}`
                      : ""}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                  {rec.reason}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted">
                    Confidence: {rec.confidence}
                  </span>
                  {rec.muscleGroup &&
                    rec.setChange !== undefined &&
                    rec.setChange !== 0 &&
                    meso &&
                    nextWeekHasMuscle(rec.muscleGroup) &&
                    (appliedRecs.has(rec.muscleGroup) ? (
                      <span className="text-[11px] font-medium text-good">
                        Applied to week {meso.currentWeek + 1} ✓
                      </span>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => applyRec(rec)}>
                        Apply {rec.setChange > 0 ? "+" : ""}
                        {rec.setChange} to next week
                      </Button>
                    ))}
                </div>
              </div>
            ))}
            {topActions.length === 0 && (
              <p className="text-sm text-muted">
                Complete a few workouts and the engine will start making calls.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Upcoming */}
      <Card>
        <CardTitle icon={<WorkoutIcon size={16} />}>Upcoming workouts</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workouts
            .filter((w) => w.status === "planned")
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 4)
            .map((w) => (
              <Link
                key={w.id}
                href={`/workouts/${w.id}`}
                className="min-w-0 rounded-lg border border-border bg-raised p-3 transition-colors hover:border-accent/50"
              >
                <div className="truncate text-sm font-semibold" title={w.name}>
                  {w.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  {formatDate(w.date)} · {w.prescriptions.length} exercises
                </div>
              </Link>
            ))}
        </div>
        {workouts.filter((w) => w.status === "planned").length === 0 && (
          <p className="text-sm text-muted">
            Nothing planned. <Link href="/workouts/new" className="text-accent hover:underline">Create a workout</Link>.
          </p>
        )}
      </Card>
    </div>
  );
}
