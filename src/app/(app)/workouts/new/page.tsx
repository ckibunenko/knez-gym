"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveMesocycle, useTrainingStore } from "@/lib/store";
import { EXERCISES, getExercise } from "@/lib/data/exercises";
import {
  MUSCLE_GROUP_IDS,
  MUSCLE_LABELS,
  type ExercisePrescription,
  type Workout,
} from "@/lib/types";
import { uid, isoDate, formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Input,
  Label,
  NumberInput,
  PageHeader,
  Select,
} from "@/components/ui";
import { MuscleIcon } from "@/components/icons/muscles";

export default function NewWorkoutPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <NewWorkoutForm />
    </Suspense>
  );
}

function NewWorkoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addWorkout = useTrainingStore((s) => s.addWorkout);
  const activeMeso = useActiveMesocycle();

  // Calendar quick-add passes ?date=YYYY-MM-DD.
  const presetDate = searchParams.get("date");
  const [name, setName] = useState("");
  const [date, setDate] = useState(
    presetDate && /^\d{4}-\d{2}-\d{2}$/.test(presetDate) ? presetDate : isoDate(new Date())
  );
  const [focus, setFocus] = useState("");
  const [linkToMeso, setLinkToMeso] = useState(true);
  const [prescriptions, setPrescriptions] = useState<ExercisePrescription[]>([]);
  const [error, setError] = useState<string | null>(null);

  const exercisesByMuscle = useMemo(() => {
    return MUSCLE_GROUP_IDS.map((m) => ({
      muscle: m,
      list: EXERCISES.filter((e) => e.primaryMuscle === m),
    })).filter((g) => g.list.length > 0);
  }, []);

  function addExercise(exerciseId: string) {
    if (!exerciseId) return;
    const ex = getExercise(exerciseId)!;
    const isolation = ex.category === "isolation";
    setPrescriptions((prev) => [
      ...prev,
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

  function patch(id: string, p: Partial<ExercisePrescription>) {
    setPrescriptions((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  function create() {
    if (!name.trim()) return setError("Give the workout a name.");
    if (prescriptions.length === 0) return setError("Add at least one exercise.");
    const workout: Workout = {
      id: uid("workout"),
      mesocycleId: linkToMeso ? activeMeso?.id : undefined,
      name: name.trim(),
      date,
      week: linkToMeso ? activeMeso?.currentWeek : undefined,
      focus: focus || undefined,
      prescriptions,
      loggedSets: [],
      exerciseFeedback: [],
      status: "planned",
    };
    addWorkout(workout);
    router.push(`/workouts/${workout.id}`);
  }

  return (
    <div className="animate-fade-up max-w-3xl">
      <PageHeader title="New workout" description="Plan a fully custom session." />
      <div className="space-y-5">
        <Card>
          <CardTitle>Session</CardTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Workout name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Push Day"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {date && (
                <p className="mt-1 text-xs text-muted">{formatDate(date)}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label>Focus (optional)</Label>
              <Input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. Chest & shoulders volume"
              />
            </div>
            {activeMeso && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={linkToMeso}
                  onChange={(e) => setLinkToMeso(e.target.checked)}
                  className="accent-[#e3b341]"
                />
                Part of “{activeMeso.name}”
              </label>
            )}
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

          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted">Nothing added yet.</p>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((p) => {
                const ex = getExercise(p.exerciseId)!;
                return (
                  <div key={p.id} className="rounded-lg border border-border bg-raised p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <MuscleIcon muscle={ex.primaryMuscle} size={17} className="text-text-secondary" />
                        {ex.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone="neutral" className="capitalize">{ex.equipment}</Badge>
                        {ex.secondaryMuscles.length > 0 && (
                          <span className="hidden text-[11px] text-muted sm:inline">
                            +{ex.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")}
                          </span>
                        )}
                        <button
                          onClick={() =>
                            setPrescriptions((prev) => prev.filter((x) => x.id !== p.id))
                          }
                          className="ml-2 text-muted hover:text-danger"
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
                      <div className="col-span-2">
                        <Label>Goal</Label>
                        <Select
                          value={p.goalType}
                          onChange={(e) =>
                            patch(p.id, { goalType: e.target.value as "strength" | "hypertrophy" })
                          }
                        >
                          <option value="hypertrophy">Hypertrophy</option>
                          <option value="strength">Strength</option>
                        </Select>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <Label>Notes</Label>
                        <Input
                          value={p.notes ?? ""}
                          placeholder="Cues, setup, tempo…"
                          onChange={(e) => patch(p.id, { notes: e.target.value || undefined })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pb-10">
          <Button variant="primary" size="lg" onClick={create}>
            Create workout
          </Button>
          <Button variant="ghost" onClick={() => router.push("/workouts")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
