"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useTrainingStore } from "@/lib/store";
import { EXERCISES, getExercise } from "@/lib/data/exercises";
import { MUSCLE_GROUP_IDS, MUSCLE_LABELS, type ExercisePrescription } from "@/lib/types";
import { uid, formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Input,
  Label,
  LinkButton,
  MuscleChip,
  NumberInput,
  PageHeader,
  PageSkeleton,
  Select,
} from "@/components/ui";
import { WorkoutIcon } from "@/components/icons/navigation";

export default function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const hydrated = useHydrated();
  const workout = useTrainingStore((s) => s.workouts.find((w) => w.id === id));
  const updateWorkout = useTrainingStore((s) => s.updateWorkout);

  const [name, setName] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<ExercisePrescription[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Drafts initialize lazily from the store once it hydrates.
  const draftName = name ?? workout?.name ?? "";
  const draftDate = date ?? workout?.date ?? "";
  const draftFocus = focus ?? workout?.focus ?? "";
  const draftPrescriptions = prescriptions ?? workout?.prescriptions ?? [];

  const exercisesByMuscle = useMemo(
    () =>
      MUSCLE_GROUP_IDS.map((m) => ({
        muscle: m,
        list: EXERCISES.filter((e) => e.primaryMuscle === m),
      })).filter((g) => g.list.length > 0),
    []
  );

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

  function patch(pid: string, p: Partial<ExercisePrescription>) {
    setPrescriptions(
      draftPrescriptions.map((x) => (x.id === pid ? { ...x, ...p } : x))
    );
  }

  function addExercise(exerciseId: string) {
    if (!exerciseId) return;
    const ex = getExercise(exerciseId)!;
    const isolation = ex.category === "isolation";
    setPrescriptions([
      ...draftPrescriptions,
      {
        id: uid("presc"),
        exerciseId,
        targetSets: 3,
        targetRepMin: isolation ? 10 : 8,
        targetRepMax: isolation ? 15 : 12,
        targetRir: 2,
        restSeconds: isolation ? 75 : 120,
        goalType: "hypertrophy",
      },
    ]);
  }

  function save() {
    if (!draftName.trim()) return setError("Give the workout a name.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) return setError("Pick a valid date.");
    if (draftPrescriptions.length === 0)
      return setError("Keep at least one exercise.");
    updateWorkout(workout!.id, {
      name: draftName.trim(),
      date: draftDate,
      focus: draftFocus || undefined,
      prescriptions: draftPrescriptions,
    });
    router.push(`/workouts/${workout!.id}`);
  }

  return (
    <div className="animate-fade-up max-w-3xl">
      <PageHeader
        title={`Edit — ${workout.name}`}
        description={`${formatDate(workout.date)} · ${workout.status}`}
      />
      <div className="space-y-5">
        <Card>
          <CardTitle>Session</CardTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Workout name</Label>
              <Input value={draftName} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={draftDate} onChange={(e) => setDate(e.target.value)} />
              {draftDate && <p className="mt-1 text-xs text-muted">{formatDate(draftDate)}</p>}
            </div>
            <div className="sm:col-span-3">
              <Label>Focus (optional)</Label>
              <Input
                value={draftFocus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. Chest & shoulders volume"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Exercises</CardTitle>
          <div className="mb-4 max-w-sm">
            <Label>Add exercise</Label>
            <Select value="" onChange={(e) => addExercise(e.target.value)}>
              <option value="">Select an exercise…</option>
              {exercisesByMuscle.map((g) => (
                <optgroup key={g.muscle} label={MUSCLE_LABELS[g.muscle]}>
                  {g.list.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          <div className="space-y-3">
            {draftPrescriptions.map((p) => {
              const ex = getExercise(p.exerciseId);
              return (
                <div key={p.id} className="rounded-lg border border-border bg-raised p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      {ex && <MuscleChip muscle={ex.primaryMuscle} className="shrink-0" />}
                      <span className="truncate text-sm">{ex?.name ?? p.exerciseId}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {ex && (
                        <Badge tone="neutral" className="hidden capitalize sm:inline-flex">
                          {ex.equipment}
                        </Badge>
                      )}
                      <button
                        onClick={() =>
                          setPrescriptions(draftPrescriptions.filter((x) => x.id !== p.id))
                        }
                        className="text-muted hover:text-danger"
                        aria-label="Remove exercise"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <div>
                      <Label>Sets</Label>
                      <NumberInput
                        value={p.targetSets}
                        onCommit={(v) => patch(p.id, { targetSets: Math.round(v) })}
                      />
                    </div>
                    <div>
                      <Label>Reps min</Label>
                      <NumberInput
                        value={p.targetRepMin}
                        onCommit={(v) => patch(p.id, { targetRepMin: Math.round(v) })}
                      />
                    </div>
                    <div>
                      <Label>Reps max</Label>
                      <NumberInput
                        value={p.targetRepMax}
                        onCommit={(v) => patch(p.id, { targetRepMax: Math.round(v) })}
                      />
                    </div>
                    <div>
                      <Label>Target RIR</Label>
                      <NumberInput
                        value={p.targetRir}
                        onCommit={(v) => patch(p.id, { targetRir: Math.round(v) })}
                      />
                    </div>
                    <div>
                      <Label>Load (kg)</Label>
                      <NumberInput
                        value={p.targetLoad ?? 0}
                        placeholder="—"
                        onCommit={(v) =>
                          patch(p.id, { targetLoad: v === 0 ? undefined : v })
                        }
                      />
                    </div>
                    <div>
                      <Label>Rest (s)</Label>
                      <NumberInput
                        value={p.restSeconds}
                        onCommit={(v) => patch(p.id, { restSeconds: Math.round(v) })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {draftPrescriptions.length === 0 && (
              <p className="text-sm text-muted">No exercises — add one above.</p>
            )}
          </div>
        </Card>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pb-10">
          <Button variant="primary" size="lg" onClick={save}>
            Save changes
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/workouts/${workout.id}`)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
