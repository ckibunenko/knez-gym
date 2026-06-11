"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useTrainingStore } from "@/lib/store";
import { getExercise } from "@/lib/data/exercises";
import {
  lastPerformance,
  recommendHypertrophyProgression,
  recommendStrengthProgression,
  sessionCall,
  suggestNextLoad,
} from "@/lib/logic";
import type {
  ExercisePrescription,
  LoggedSet,
  PerformanceComparison,
  Recommendation,
  TechniqueQuality,
  Workout,
} from "@/lib/types";
import { uid, cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Input,
  Label,
  LinkButton,
  PageSkeleton,
} from "@/components/ui";
import { MuscleIcon } from "@/components/icons/muscles";
import { WorkoutIcon } from "@/components/icons/navigation";
import { CompletedIcon, PainIcon } from "@/components/icons/feedback";

/** Big-touch-target stepper for one numeric field. */
function Stepper({
  label,
  value,
  step,
  min = 0,
  onChange,
  format = (v: number) => `${v}`,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="flex items-center overflow-hidden rounded-lg border border-border bg-overlay">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="px-3 py-2.5 text-lg leading-none text-text-secondary transition-colors hover:bg-raised active:bg-border"
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
        >
          −
        </button>
        <span className="tnum min-w-[3.25rem] text-center text-sm font-semibold">
          {format(value)}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="px-3 py-2.5 text-lg leading-none text-text-secondary transition-colors hover:bg-raised active:bg-border"
          onClick={() => onChange(Math.round((value + step) * 100) / 100)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Score({
  label,
  value,
  max,
  min = 0,
  onChange,
}: {
  label: string;
  value: number | undefined;
  max: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "tnum h-9 min-w-9 flex-1 rounded-lg border text-sm font-medium transition-colors",
              value === v
                ? "border-accent/70 bg-accent-soft text-accent"
                : "border-border bg-raised text-text-secondary hover:text-text"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

const TECHNIQUE_OPTIONS: TechniqueQuality[] = ["good", "acceptable", "poor"];

export default function LogWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const hydrated = useHydrated();
  const workout = useTrainingStore((s) => s.workouts.find((w) => w.id === id));
  const allWorkouts = useTrainingStore((s) => s.workouts);
  const updateWorkout = useTrainingStore((s) => s.updateWorkout);
  const saveExerciseFeedback = useTrainingStore((s) => s.saveExerciseFeedback);
  const saveWorkoutFeedback = useTrainingStore((s) => s.saveWorkoutFeedback);
  const completeWorkout = useTrainingStore((s) => s.completeWorkout);
  const addRecommendations = useTrainingStore((s) => s.addRecommendations);

  const [rows, setRows] = useState<LoggedSet[]>([]);
  const [openTechnique, setOpenTechnique] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<number>();
  const [energy, setEnergy] = useState<number>();
  const [motivation, setMotivation] = useState<number>();
  const [soreness, setSoreness] = useState<number>();
  const [sessionNotes, setSessionNotes] = useState("");
  const [callApplied, setCallApplied] = useState(false);
  const initialized = useRef(false);

  const call = useMemo(
    () => (workout ? sessionCall(allWorkouts, workout) : null),
    [allWorkouts, workout]
  );

  /** Caution-day trim: drop one pending set per exercise, +1 RIR the rest. */
  function applySessionCall() {
    if (!call?.adjust || !workout) return;
    let next = [...rows];
    for (const p of workout.prescriptions) {
      const exRows = next.filter((r) => r.exerciseId === p.exerciseId);
      const removable = [...exRows]
        .reverse()
        .find((r) => !r.completed && !r.skipped);
      if (removable && exRows.length > 1) {
        next = next.filter((r) => r.id !== removable.id);
      }
    }
    next = next.map((r) =>
      r.completed || r.skipped ? r : { ...r, rir: r.rir + call.adjust!.rirDelta }
    );
    persist(next);
    setCallApplied(true);
  }

  // Build editable rows once: existing logged sets, padded to target count.
  useEffect(() => {
    if (!workout || initialized.current) return;
    initialized.current = true;
    const next: LoggedSet[] = [];
    for (const p of workout.prescriptions) {
      const existing = workout.loggedSets
        .filter((s) => s.exerciseId === p.exerciseId)
        .sort((a, b) => a.setNumber - b.setNumber);
      const last = lastPerformance(allWorkouts, workout, p.exerciseId);
      // Coach-suggested load (progression model over the last session)
      // beats the static plan, which beats simply repeating last time.
      const suggested = suggestNextLoad(allWorkouts, workout, p);
      const count = Math.max(p.targetSets, existing.length);
      for (let i = 0; i < count; i++) {
        const found = existing[i];
        if (found) {
          next.push(found);
        } else {
          const lastSet = last?.sets[Math.min(i, (last?.sets.length ?? 1) - 1)];
          next.push({
            id: uid("set"),
            exerciseId: p.exerciseId,
            setNumber: i + 1,
            weight: suggested?.weight ?? p.targetLoad ?? lastSet?.weight ?? 0,
            reps: lastSet?.reps ?? p.targetRepMin,
            rir: p.targetRir,
            completed: false,
            skipped: false,
            painFlag: false,
            techniqueQuality: "good",
          });
        }
      }
    }
    setRows(next);
    const f = workout.workoutFeedback;
    if (f) {
      setDifficulty(f.overallDifficulty);
      setEnergy(f.energy);
      setMotivation(f.motivation);
      setSoreness(f.soreness);
      setSessionNotes(f.notes ?? "");
    }
  }, [workout, allWorkouts]);

  function persist(nextRows: LoggedSet[]) {
    setRows(nextRows);
    if (!workout) return;
    updateWorkout(workout.id, {
      loggedSets: nextRows.filter((r) => r.completed || r.skipped),
      status: workout.status === "planned" ? "inProgress" : workout.status,
    });
  }

  function patchRow(rowId: string, patch: Partial<LoggedSet>) {
    persist(rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  }

  function addSet(p: ExercisePrescription) {
    const forExercise = rows.filter((r) => r.exerciseId === p.exerciseId);
    const template = forExercise[forExercise.length - 1];
    persist([
      ...rows,
      {
        id: uid("set"),
        exerciseId: p.exerciseId,
        setNumber: forExercise.length + 1,
        weight: template?.weight ?? p.targetLoad ?? 0,
        reps: template?.reps ?? p.targetRepMin,
        rir: p.targetRir,
        completed: false,
        skipped: false,
        painFlag: false,
        techniqueQuality: "good",
      },
    ]);
  }

  const doneCount = rows.filter((r) => r.completed).length;

  const exerciseDone = (exerciseId: string) =>
    rows.filter((r) => r.exerciseId === exerciseId).every((r) => r.completed || r.skipped) &&
    rows.some((r) => r.exerciseId === exerciseId && r.completed);

  function finish() {
    if (!workout) return;
    saveWorkoutFeedback(workout.id, {
      overallDifficulty: difficulty ?? 5,
      energy: energy ?? 3,
      motivation: motivation ?? 3,
      soreness: soreness ?? 0,
      notes: sessionNotes || undefined,
    });

    // Per-exercise load recommendations for next time.
    const recs: Recommendation[] = [];
    for (const p of workout.prescriptions) {
      const sets = rows.filter((r) => r.exerciseId === p.exerciseId && r.completed);
      if (sets.length === 0) continue;
      const ex = getExercise(p.exerciseId);
      if (p.goalType === "strength") {
        const result = recommendStrengthProgression({
          targetRir: p.targetRir,
          consecutiveFailures: 0,
          loadIncrement: 2.5,
          sets: sets.map((s) => ({
            weight: s.weight,
            targetReps: p.targetRepMin,
            actualReps: s.reps,
            rir: s.rir,
          })),
        });
        recs.push({
          id: uid("rec"),
          type: "load",
          exerciseId: p.exerciseId,
          action:
            result.action === "increaseLoad"
              ? "increase"
              : result.action === "repeatLoad"
                ? "maintain"
                : "reduce",
          reason: `${ex?.name ?? p.exerciseId}: ${result.reason}`,
          confidence: "high",
          createdAt: new Date().toISOString(),
        });
      } else {
        const result = recommendHypertrophyProgression({
          targetRepMin: p.targetRepMin,
          targetRepMax: p.targetRepMax,
          targetRir: p.targetRir,
          sets: sets.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
        });
        recs.push({
          id: uid("rec"),
          type: "load",
          exerciseId: p.exerciseId,
          action:
            result.action === "increaseLoad" || result.action === "addVolume"
              ? "increase"
              : result.action === "keepLoad"
                ? "maintain"
                : "reduce",
          reason: `${ex?.name ?? p.exerciseId}: ${result.reason}`,
          confidence: "medium",
          createdAt: new Date().toISOString(),
        });
      }
    }
    if (recs.length > 0) addRecommendations(recs);
    completeWorkout(workout.id);
    router.push(`/workouts/${workout.id}`);
  }

  if (!hydrated) return <PageSkeleton />;
  if (!workout) {
    return (
      <EmptyState
        icon={<WorkoutIcon size={36} />}
        title="Workout not found"
        action={<LinkButton href="/workouts">Back to workouts</LinkButton>}
      />
    );
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      {/* Sticky progress header */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur md:top-0 md:mx-0 md:rounded-xl md:border md:px-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{workout.name}</div>
            <div className="tnum text-xs text-muted">
              {doneCount} / {rows.length} sets done
            </div>
          </div>
          <Badge tone={workout.status === "inProgress" ? "accent" : "info"}>
            {workout.status === "inProgress" ? "in progress" : "ready"}
          </Badge>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-overlay">
          <div
            className="h-1.5 rounded-full bg-accent transition-all"
            style={{ width: `${rows.length ? (doneCount / rows.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Coach's pre-session call */}
      {call && workout.status !== "completed" && (
        <Card
          className={cn(
            call.mode === "caution" && "border-warn/40",
            call.mode === "push" && "border-good/40"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "tnum flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                  call.mode === "push" && "border-good/50 text-good",
                  call.mode === "standard" && "border-border-strong text-text-secondary",
                  call.mode === "caution" && "border-warn/50 text-warn"
                )}
              >
                {call.readiness}
              </span>
              <div>
                <div className="text-sm font-semibold">{call.title}</div>
                <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted">
                  {call.detail}
                </p>
              </div>
            </div>
            {call.adjust &&
              (callApplied ? (
                <span className="text-xs font-medium text-good">
                  Session trimmed ✓
                </span>
              ) : (
                <Button size="sm" variant="secondary" onClick={applySessionCall}>
                  Apply: −1 set · +1 RIR
                </Button>
              ))}
          </div>
        </Card>
      )}

      {workout.prescriptions.length === 0 && (
        <EmptyState
          icon={<WorkoutIcon size={36} />}
          title="Nothing to log"
          description="This workout has no exercises yet. Add some before logging sets."
          action={
            <LinkButton href={`/workouts/${workout.id}/edit`}>
              Edit workout
            </LinkButton>
          }
        />
      )}

      {workout.prescriptions.map((p) => {
        const ex = getExercise(p.exerciseId);
        const exRows = rows.filter((r) => r.exerciseId === p.exerciseId);
        const last = lastPerformance(allWorkouts, workout, p.exerciseId);
        const suggested = suggestNextLoad(allWorkouts, workout, p);
        const feedback = workout.exerciseFeedback.find(
          (f) => f.exerciseId === p.exerciseId
        );
        const done = exerciseDone(p.exerciseId);
        return (
          <Card key={p.id} className={cn(done && "border-good/30")}>
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">
                {ex && <MuscleIcon muscle={ex.primaryMuscle} size={18} className="text-text-secondary" />}
                {ex?.name ?? p.exerciseId}
              </span>
              {done && <CompletedIcon size={18} className="text-good" />}
            </div>
            <div className="tnum text-xs text-muted">
              Target: {p.targetSets} × {p.targetRepMin}-{p.targetRepMax} @ {p.targetRir} RIR
              {p.targetLoad ? ` · ${p.targetLoad} kg` : ""} · rest {p.restSeconds}s
            </div>
            {last && (
              <div className="tnum mt-1 text-xs text-info">
                Last time: {last.sets[0]?.weight} kg ×{" "}
                {last.sets.map((s) => s.reps).join(", ")} @{" "}
                {last.sets[last.sets.length - 1]?.rir} RIR
              </div>
            )}
            {suggested && !done && (
              <div className="tnum mt-1 text-xs font-medium text-accent" title={suggested.reason}>
                Coach: {suggested.weight} kg
                {suggested.delta !== 0 &&
                  ` (${suggested.delta > 0 ? "+" : ""}${suggested.delta})`}{" "}
                · {suggested.action === "hold" ? "hold the load" : `${suggested.action} today`}
              </div>
            )}
            {p.notes && <div className="mt-1 text-xs text-muted">{p.notes}</div>}

            <div className="mt-4 space-y-3">
              {exRows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    row.completed
                      ? "border-good/40 bg-good-soft/40"
                      : row.skipped
                        ? "border-border bg-overlay opacity-60"
                        : "border-border bg-raised"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="tnum w-8 text-sm font-semibold text-muted">
                      #{row.setNumber}
                    </span>
                    <div className="flex flex-1 items-start justify-center gap-2 sm:gap-4">
                      <Stepper
                        label="kg"
                        value={row.weight}
                        step={2.5}
                        onChange={(v) => patchRow(row.id, { weight: v })}
                      />
                      <Stepper
                        label="reps"
                        value={row.reps}
                        step={1}
                        min={0}
                        onChange={(v) => patchRow(row.id, { reps: v })}
                      />
                      <Stepper
                        label="RIR"
                        value={row.rir}
                        step={1}
                        min={0}
                        onChange={(v) => patchRow(row.id, { rir: v })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        patchRow(row.id, { completed: !row.completed, skipped: false })
                      }
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl transition-all active:scale-95",
                        row.completed
                          ? "border-good bg-good text-bg"
                          : "border-border-strong bg-overlay text-muted hover:border-good/60 hover:text-good"
                      )}
                      aria-label={row.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      ✓
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-8 text-xs">
                    <button
                      type="button"
                      onClick={() => patchRow(row.id, { painFlag: !row.painFlag })}
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-2 py-1 transition-colors",
                        row.painFlag
                          ? "border-danger/60 bg-danger-soft text-danger"
                          : "border-border text-muted hover:text-text"
                      )}
                    >
                      <PainIcon size={12} /> pain
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patchRow(row.id, { skipped: !row.skipped, completed: false })
                      }
                      className={cn(
                        "rounded-md border px-2 py-1 transition-colors",
                        row.skipped
                          ? "border-border-strong bg-overlay text-text-secondary"
                          : "border-border text-muted hover:text-text"
                      )}
                    >
                      skip
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenTechnique(openTechnique === row.id ? null : row.id)
                        }
                        className={cn(
                          "rounded-md border px-2 py-1 capitalize transition-colors",
                          row.techniqueQuality === "poor"
                            ? "border-warn/60 bg-warn-soft text-warn"
                            : "border-border text-muted hover:text-text"
                        )}
                      >
                        form: {row.techniqueQuality}
                      </button>
                      {openTechnique === row.id && (
                        <div className="absolute z-10 mt-1 flex overflow-hidden rounded-lg border border-border-strong bg-overlay shadow-xl">
                          {TECHNIQUE_OPTIONS.map((t) => (
                            <button
                              key={t}
                              type="button"
                              className={cn(
                                "px-3 py-1.5 capitalize transition-colors hover:bg-raised",
                                t === row.techniqueQuality && "text-accent"
                              )}
                              onClick={() => {
                                patchRow(row.id, { techniqueQuality: t });
                                setOpenTechnique(null);
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addSet(p)}>
                + Add set
              </Button>
            </div>

            {/* Post-exercise feedback */}
            {done && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-raised p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  How did it feel?
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Score
                    label="Pump"
                    value={feedback?.pump}
                    max={3}
                    onChange={(v) =>
                      saveExerciseFeedback(workout.id, {
                        exerciseId: p.exerciseId,
                        pump: v,
                        localFatigue: feedback?.localFatigue ?? 0,
                        jointDiscomfort: feedback?.jointDiscomfort ?? 0,
                        performanceComparison: feedback?.performanceComparison ?? "same",
                      })
                    }
                  />
                  <Score
                    label="Local fatigue"
                    value={feedback?.localFatigue}
                    max={3}
                    onChange={(v) =>
                      saveExerciseFeedback(workout.id, {
                        exerciseId: p.exerciseId,
                        pump: feedback?.pump ?? 0,
                        localFatigue: v,
                        jointDiscomfort: feedback?.jointDiscomfort ?? 0,
                        performanceComparison: feedback?.performanceComparison ?? "same",
                      })
                    }
                  />
                  <Score
                    label="Joint discomfort"
                    value={feedback?.jointDiscomfort}
                    max={3}
                    onChange={(v) =>
                      saveExerciseFeedback(workout.id, {
                        exerciseId: p.exerciseId,
                        pump: feedback?.pump ?? 0,
                        localFatigue: feedback?.localFatigue ?? 0,
                        jointDiscomfort: v,
                        performanceComparison: feedback?.performanceComparison ?? "same",
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Compared to last time</Label>
                  <div className="flex gap-1.5">
                    {(["worse", "same", "better"] as PerformanceComparison[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          saveExerciseFeedback(workout.id, {
                            exerciseId: p.exerciseId,
                            pump: feedback?.pump ?? 0,
                            localFatigue: feedback?.localFatigue ?? 0,
                            jointDiscomfort: feedback?.jointDiscomfort ?? 0,
                            performanceComparison: c,
                          })
                        }
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
                          feedback?.performanceComparison === c
                            ? c === "better"
                              ? "border-good/70 bg-good-soft text-good"
                              : c === "worse"
                                ? "border-danger/70 bg-danger-soft text-danger"
                                : "border-accent/70 bg-accent-soft text-accent"
                            : "border-border bg-overlay text-text-secondary"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Session wrap-up */}
      <Card>
        <CardTitle>Session wrap-up</CardTitle>
        <div className="space-y-4">
          <Score label="Overall difficulty (1-10)" value={difficulty} min={1} max={10} onChange={setDifficulty} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Score label="Energy (1-5)" value={energy} min={1} max={5} onChange={setEnergy} />
            <Score label="Motivation (1-5)" value={motivation} min={1} max={5} onChange={setMotivation} />
            <Score label="Soreness entering (0-3)" value={soreness} max={3} onChange={setSoreness} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Anything worth remembering…"
            />
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={finish}>
            Finish workout
          </Button>
        </div>
      </Card>
    </div>
  );
}
