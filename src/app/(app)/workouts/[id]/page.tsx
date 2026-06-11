"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useTrainingStore } from "@/lib/store";
import { getExercise } from "@/lib/data/exercises";
import { formatDateLong, uid } from "@/lib/utils";
import { LOAD_TARGET_LABELS, type LoggedSet } from "@/lib/types";
import { workoutTonnage } from "@/lib/logic/analytics";
import { analyzeWorkout } from "@/lib/logic/analyzeWorkout";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Input,
  LinkButton,
  NumberInput,
  PageHeader,
  PageSkeleton,
  Stat,
} from "@/components/ui";
import { MuscleIcon } from "@/components/icons/muscles";
import { WorkoutIcon } from "@/components/icons/navigation";
import { PainIcon, PrIcon } from "@/components/icons/feedback";
import { TrendIcon } from "@/components/icons/training";

export default function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const hydrated = useHydrated();
  const workout = useTrainingStore((s) => s.workouts.find((w) => w.id === id));
  const deleteWorkout = useTrainingStore((s) => s.deleteWorkout);
  const updateWorkout = useTrainingStore((s) => s.updateWorkout);
  // Per-exercise set editing (weight/reps, add/remove sets).
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const allWorkouts = useTrainingStore((s) => s.workouts);

  const analysis = useMemo(
    () =>
      showAnalysis && workout ? analyzeWorkout(workout, allWorkouts) : null,
    [showAnalysis, workout, allWorkouts]
  );

  const setsByExercise = useMemo(() => {
    const map = new Map<string, NonNullable<typeof workout>["loggedSets"]>();
    for (const s of workout?.loggedSets ?? []) {
      map.set(s.exerciseId, [...(map.get(s.exerciseId) ?? []), s]);
    }
    return map;
  }, [workout]);

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

  const completedSets = workout.loggedSets.filter((s) => s.completed).length;

  function patchSets(updater: (sets: LoggedSet[]) => LoggedSet[]) {
    updateWorkout(workout!.id, { loggedSets: updater(workout!.loggedSets) });
  }

  function patchSet(setId: string, patch: Partial<LoggedSet>) {
    patchSets((sets) => sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)));
  }

  function deleteSet(setId: string) {
    patchSets((sets) => {
      const removed = sets.find((s) => s.id === setId);
      let n = 0;
      return sets
        .filter((s) => s.id !== setId)
        .map((s) =>
          s.exerciseId === removed?.exerciseId ? { ...s, setNumber: ++n } : s
        );
    });
  }

  function addSet(exerciseId: string) {
    patchSets((sets) => {
      const exSets = sets.filter((s) => s.exerciseId === exerciseId);
      const last = exSets[exSets.length - 1];
      return [
        ...sets,
        {
          id: uid("set"),
          exerciseId,
          setNumber: exSets.length + 1,
          weight: last?.weight ?? 0,
          reps: last?.reps ?? 10,
          rir: last?.rir ?? 2,
          completed: true,
          skipped: false,
          painFlag: false,
          techniqueQuality: "good",
        },
      ];
    });
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title={workout.name}
        description={`${formatDateLong(workout.date)}${workout.focus ? ` · ${workout.focus}` : ""}`}
        action={
          <div className="flex gap-2">
            {workout.status !== "completed" && (
              <LinkButton href={`/workouts/${workout.id}/log`} variant="primary">
                {workout.status === "inProgress" ? "Continue logging" : "Start workout"}
              </LinkButton>
            )}
            {workout.status === "completed" && (
              <Button
                variant={showAnalysis ? "primary" : "secondary"}
                onClick={() => setShowAnalysis((v) => !v)}
              >
                Analyze
              </Button>
            )}
            <LinkButton href={`/workouts/${workout.id}/edit`} variant="secondary">
              Edit
            </LinkButton>
            {workout.status === "planned" && (
              <Button
                variant="ghost"
                onClick={() => {
                  updateWorkout(workout.id, { status: "skipped" });
                }}
              >
                Skip
              </Button>
            )}
            {confirmDelete ? (
              <>
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteWorkout(workout.id);
                    router.push("/workouts");
                  }}
                >
                  Confirm delete
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat
            label="Date"
            value={
              <Input
                type="date"
                value={workout.date}
                onChange={(e) => {
                  if (e.target.value) updateWorkout(workout.id, { date: e.target.value });
                }}
                className="h-8 max-w-40 px-2 py-1 text-xs"
                aria-label="Workout date"
              />
            }
          />
          <Stat
            label="Status"
            value={
              <Badge
                tone={
                  workout.status === "completed"
                    ? "good"
                    : workout.status === "inProgress"
                      ? "accent"
                      : workout.status === "skipped"
                        ? "neutral"
                        : "info"
                }
                className="capitalize"
              >
                {workout.status === "inProgress" ? "in progress" : workout.status}
              </Badge>
            }
          />
          <Stat label="Exercises" value={workout.prescriptions.length} />
          <Stat label="Sets logged" value={completedSets} />
          <Stat
            label="Tonnage"
            value={
              <>
                {(workoutTonnage(workout) / 1000).toFixed(1)}
                <span className="text-sm text-muted"> t</span>
              </>
            }
          />
        </div>
        {workout.workoutFeedback && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4 text-xs">
            <Badge tone="neutral">Energy {workout.workoutFeedback.energy}/5</Badge>
            <Badge tone="neutral">Motivation {workout.workoutFeedback.motivation}/5</Badge>
            <Badge tone="neutral">Soreness {workout.workoutFeedback.soreness}/3</Badge>
            <Badge tone="neutral">Difficulty {workout.workoutFeedback.overallDifficulty}/10</Badge>
          </div>
        )}
      </Card>

      {analysis && (
        <Card className="border-accent/30">
          <CardTitle icon={<TrendIcon size={16} />}>Session analysis</CardTitle>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {analysis.prCount > 0 && (
              <Badge tone="accent">
                <PrIcon size={12} /> {analysis.prCount} PR{analysis.prCount > 1 ? "s" : ""}
              </Badge>
            )}
            <Badge tone="neutral">{analysis.totalSets} sets</Badge>
            <Badge tone="neutral">
              {(analysis.tonnage / 1000).toFixed(1)} t
            </Badge>
            {analysis.avgPrevTonnage !== null && analysis.avgPrevTonnage > 0 && (
              <Badge
                tone={analysis.tonnage >= analysis.avgPrevTonnage ? "good" : "warn"}
              >
                {analysis.tonnage >= analysis.avgPrevTonnage ? "▲" : "▼"}{" "}
                {Math.abs(
                  Math.round(
                    ((analysis.tonnage - analysis.avgPrevTonnage) /
                      analysis.avgPrevTonnage) *
                      100
                  )
                )}
                % vs recent same-day sessions
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {analysis.exercises.map((a) => (
              <div
                key={a.exerciseId}
                className="rounded-lg border border-border bg-raised px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <MuscleIcon muscle={a.muscle} size={15} />
                    {a.exerciseName}
                    {a.isPr && (
                      <Badge tone="accent">
                        <PrIcon size={11} /> PR
                      </Badge>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge tone={a.setsDone >= a.targetSets ? "good" : "warn"}>
                      {a.setsDone}/{a.targetSets} sets
                    </Badge>
                    {a.setsDone > 0 && (
                      <Badge tone={a.repRangeHits === a.setsDone ? "good" : "neutral"}>
                        {a.repRangeHits}/{a.setsDone} in range
                      </Badge>
                    )}
                    {a.e1rmDeltaPct !== null && (
                      <Badge
                        tone={
                          a.e1rmDeltaPct > 0
                            ? "good"
                            : a.e1rmDeltaPct < 0
                              ? "danger"
                              : "neutral"
                        }
                      >
                        e1RM {a.e1rmDeltaPct > 0 ? "▲" : a.e1rmDeltaPct < 0 ? "▼" : ""}{" "}
                        {Math.abs(a.e1rmDeltaPct)}%
                      </Badge>
                    )}
                    {a.repDropOffPct !== null && a.repDropOffPct >= 25 && (
                      <Badge tone="warn">−{a.repDropOffPct}% reps by last set</Badge>
                    )}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted">{a.suggestion}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Plan {workout.status === "completed" && "& results"}</CardTitle>
        <div className="space-y-4">
          {workout.prescriptions.map((p) => {
            const ex = getExercise(p.exerciseId);
            const logged = setsByExercise.get(p.exerciseId) ?? [];
            const feedback = workout.exerciseFeedback.find(
              (f) => f.exerciseId === p.exerciseId
            );
            const isEditing = editingExercise === p.exerciseId;
            return (
              <div key={p.id} className="rounded-lg border border-border bg-raised p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    {ex && <MuscleIcon muscle={ex.primaryMuscle} size={17} />}
                    {ex?.name ?? p.exerciseId}
                    {p.loadTarget && (
                      <Badge tone={p.loadTarget === "emphasis" ? "accent" : p.loadTarget === "grow" ? "info" : "neutral"}>
                        {LOAD_TARGET_LABELS[p.loadTarget]}
                      </Badge>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tnum text-xs text-muted">
                      Target: {p.targetSets} × {p.targetRepMin}-{p.targetRepMax} @ {p.targetRir} RIR
                      {p.targetLoad ? ` · ${p.targetLoad} kg` : ""} · rest {p.restSeconds}s
                    </span>
                    <Button
                      size="sm"
                      variant={isEditing ? "primary" : "ghost"}
                      onClick={() =>
                        setEditingExercise(isEditing ? null : p.exerciseId)
                      }
                    >
                      {isEditing ? "Done" : "✎ Edit"}
                    </Button>
                  </span>
                </div>
                {p.notes && <p className="mt-1 text-xs text-muted">{p.notes}</p>}
                {(logged.length > 0 || isEditing) && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-muted">
                          <th className="py-1 pr-4 font-medium">Set</th>
                          <th className="py-1 pr-4 font-medium">Weight</th>
                          <th className="py-1 pr-4 font-medium">Reps</th>
                          <th className="py-1 pr-4 font-medium">RIR</th>
                          <th className="py-1 font-medium">Flags</th>
                          {isEditing && <th className="py-1 font-medium" />}
                        </tr>
                      </thead>
                      <tbody className="tnum">
                        {logged
                          .sort((a, b) => a.setNumber - b.setNumber)
                          .map((s) => (
                            <tr key={s.id} className="border-t border-border/60">
                              <td className="py-1.5 pr-4">{s.setNumber}</td>
                              <td className="py-1.5 pr-4">
                                {isEditing ? (
                                  <NumberInput
                                    className="w-20 px-2 py-1 text-xs"
                                    value={s.weight}
                                    onCommit={(v) => patchSet(s.id, { weight: v })}
                                  />
                                ) : (
                                  `${s.weight} kg`
                                )}
                              </td>
                              <td className="py-1.5 pr-4">
                                {isEditing ? (
                                  <NumberInput
                                    className="w-16 px-2 py-1 text-xs"
                                    value={s.reps}
                                    onCommit={(v) => patchSet(s.id, { reps: Math.round(v) })}
                                  />
                                ) : (
                                  s.reps
                                )}
                              </td>
                              <td className="py-1.5 pr-4">{s.rir}</td>
                              <td className="py-1.5">
                                {s.skipped && <Badge tone="neutral">skipped</Badge>}
                                {s.painFlag && (
                                  <span className="inline-flex items-center gap-1 text-danger">
                                    <PainIcon size={13} /> pain
                                  </span>
                                )}
                              </td>
                              {isEditing && (
                                <td className="py-1.5 text-right">
                                  <button
                                    onClick={() => deleteSet(s.id)}
                                    className="rounded px-1.5 text-muted hover:bg-overlay hover:text-danger"
                                    aria-label={`Delete set ${s.setNumber}`}
                                    title="Delete set"
                                  >
                                    ✕
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => addSet(p.exerciseId)}
                      >
                        + Add set
                      </Button>
                    )}
                  </div>
                )}
                {feedback && (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <Badge tone="violet">Pump {feedback.pump}/3</Badge>
                    <Badge tone="warn">Fatigue {feedback.localFatigue}/3</Badge>
                    <Badge tone={feedback.jointDiscomfort >= 2 ? "danger" : "neutral"}>
                      Joints {feedback.jointDiscomfort}/3
                    </Badge>
                    <Badge
                      tone={
                        feedback.performanceComparison === "better"
                          ? "good"
                          : feedback.performanceComparison === "worse"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      vs last: {feedback.performanceComparison}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {workout.notes && (
        <Card>
          <CardTitle>Notes</CardTitle>
          <p className="text-sm text-text-secondary">{workout.notes}</p>
        </Card>
      )}
    </div>
  );
}
