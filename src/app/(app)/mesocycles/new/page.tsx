"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrainingStore } from "@/lib/store";
import { EXERCISES, getExercise } from "@/lib/data/exercises";
import { DEFAULT_DELOAD } from "@/lib/data/defaults";
import { MESO_TEMPLATES, type MesoTemplate } from "@/lib/data/templates";
import {
  LOAD_TARGET_LABELS,
  MESO_COLORS,
  MUSCLE_COLORS,
  MUSCLE_GROUP_IDS,
  MUSCLE_LABELS,
  type Goal,
  type LoadTarget,
  type MesoDayPlan,
  type Mesocycle,
  type MuscleGroupId,
  type RirWeekTarget,
  type SplitType,
  type Workout,
} from "@/lib/types";
import { uid, isoDate, DAY_NAMES, cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Input,
  Label,
  MuscleChip,
  NumberInput,
  PageHeader,
  Select,
} from "@/components/ui";
import { MuscleIcon } from "@/components/icons/muscles";

// A session in the program's sequence (Day 1, Day 2, …). Which weekday a
// draft lands on is derived from the start date — see orderedSlots.
interface DayDraft {
  id: string;
  name: string;
  exercises: { exerciseId: string; sets: number; loadTarget?: LoadTarget }[];
}

const LOAD_TARGET_TONE: Record<LoadTarget, "accent" | "info" | "neutral"> = {
  emphasis: "accent",
  grow: "info",
  maintain: "neutral",
};

const SPLIT_LABELS: Record<SplitType, string> = {
  custom: "Fully custom",
  upperLower: "Upper / Lower",
  pushPullLegs: "Push / Pull / Legs",
  fullBody: "Full Body",
  bodyPart: "Body Part",
};

function splitDayNames(split: SplitType, count: number): string[] {
  const cycle = (names: string[]) =>
    Array.from({ length: count }, (_, i) => {
      const base = names[i % names.length];
      const round = Math.floor(i / names.length);
      return round > 0 ? `${base} ${String.fromCharCode(65 + round)}` : base;
    });
  switch (split) {
    case "upperLower":
      return cycle(["Upper", "Lower"]);
    case "pushPullLegs":
      return cycle(["Push", "Pull", "Legs"]);
    case "fullBody":
      return Array.from({ length: count }, (_, i) => `Full Body ${String.fromCharCode(65 + i)}`);
    case "bodyPart":
      return cycle(["Chest", "Back", "Legs", "Shoulders & Arms", "Weak Points"]);
    default:
      return Array.from({ length: count }, (_, i) => `Day ${i + 1}`);
  }
}

function defaultRirProgression(weeks: number, deloadWeek: number): RirWeekTarget[] {
  const working = deloadWeek - 1;
  const targets: RirWeekTarget[] = [];
  for (let w = 1; w <= working; w++) {
    // Ramp from 3 RIR down to ~0-1 across the working weeks.
    const t = working === 1 ? 1 : (w - 1) / (working - 1);
    const rir = Math.round(3 - t * 3);
    targets.push({ week: w, rirMin: Math.max(0, rir), rirMax: Math.max(1, rir + (w >= working ? 1 : 0)) });
  }
  return targets;
}

export default function NewMesocyclePage() {
  const router = useRouter();
  const addMesocycle = useTrainingStore((s) => s.addMesocycle);
  const addWorkout = useTrainingStore((s) => s.addWorkout);
  const muscleGroups = useTrainingStore((s) => s.muscleGroups);
  const hasActive = useTrainingStore((s) =>
    s.mesocycles.some((m) => m.status === "active")
  );
  const mesoCount = useTrainingStore((s) => s.mesocycles.length);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal>("hybrid");
  const [duration, setDuration] = useState(5);
  const [startDate, setStartDate] = useState(isoDate(new Date()));
  const [split, setSplit] = useState<SplitType>("upperLower");
  const [trainingDays, setTrainingDays] = useState<number[]>([0, 1, 3, 4]);
  const [primary, setPrimary] = useState<MuscleGroupId[]>(["chest", "back", "quads"]);
  const [secondary, setSecondary] = useState<MuscleGroupId[]>(["shoulders", "biceps", "triceps", "hamstrings"]);
  const [startSets, setStartSets] = useState<Partial<Record<MuscleGroupId, number>>>({});
  const [deloadPct, setDeloadPct] = useState(DEFAULT_DELOAD.volumeReductionPercent);
  const [deloadRir, setDeloadRir] = useState(DEFAULT_DELOAD.targetRir);
  const [makeActive, setMakeActive] = useState(!hasActive);
  const [days, setDays] = useState<DayDraft[]>(() =>
    [0, 1, 3, 4].map((_, i) => ({
      id: uid("day"),
      name: splitDayNames("upperLower", 4)[i],
      exercises: [],
    }))
  );
  const [rirOverrides, setRirOverrides] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  // The weekly cycle is anchored to the start date, not the calendar week:
  // Day 1 lands on the start date (or the first selected weekday after it),
  // so no session is ever scheduled in the past.
  const startDow = (new Date(startDate + "T12:00:00").getDay() + 6) % 7; // 0=Mon
  const offsetFromStart = (dow: number) => (dow - startDow + 7) % 7;
  const orderedSlots = useMemo(
    () => [...trainingDays].sort((a, b) => offsetFromStart(a) - offsetFromStart(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trainingDays, startDow]
  );

  function applyTemplate(t: MesoTemplate) {
    setTemplateId(t.id);
    if (!name.trim()) setName(t.name);
    setGoal(t.goal);
    setSplit(t.split);
    setTrainingDays(t.days.map((d) => d.dayOfWeek));
    setPrimary(t.primaryMuscles);
    setSecondary(t.secondaryMuscles);
    setDays(
      t.days.map((d) => ({
        id: uid("day"),
        name: d.name,
        exercises: d.slots.map((s) => ({
          exerciseId: s.exerciseId,
          sets: s.sets,
          loadTarget: s.loadTarget,
        })),
      }))
    );
  }

  const deloadWeek = duration; // final week is the deload
  const rirProgression = useMemo(() => {
    const base = defaultRirProgression(duration, deloadWeek);
    return base.map((t) =>
      rirOverrides[t.week] !== undefined
        ? { ...t, rirMin: rirOverrides[t.week], rirMax: rirOverrides[t.week] + 1 }
        : t
    );
  }, [duration, deloadWeek, rirOverrides]);

  function toggleDay(dow: number) {
    const removing = trainingDays.includes(dow);
    const next = removing
      ? trainingDays.filter((d) => d !== dow)
      : [...trainingDays, dow].sort((a, b) => a - b);
    const sortByOffset = (list: number[]) =>
      [...list].sort((a, b) => offsetFromStart(a) - offsetFromStart(b));
    // The draft list mirrors the slot list in cycle order — splice at the
    // toggled weekday's position so the other sessions keep their plans.
    const idx = sortByOffset(removing ? trainingDays : next).indexOf(dow);
    setTrainingDays(next);
    const names = splitDayNames(split, next.length);
    setDays((prev) => {
      const copy = [...prev];
      if (removing) copy.splice(idx, 1);
      else copy.splice(idx, 0, { id: uid("day"), name: "", exercises: [] });
      return copy.map((d, i) =>
        d.exercises.length > 0 && d.name ? d : { ...d, name: names[i] ?? d.name }
      );
    });
  }

  function changeSplit(s: SplitType) {
    setSplit(s);
    const names = splitDayNames(s, trainingDays.length);
    setDays((prev) => prev.map((d, i) => ({ ...d, name: names[i] ?? d.name })));
  }

  function toggleMuscle(list: MuscleGroupId[], setList: (m: MuscleGroupId[]) => void, m: MuscleGroupId) {
    setList(list.includes(m) ? list.filter((x) => x !== m) : [...list, m]);
  }

  function addExercise(dayId: string, exerciseId: string) {
    if (!exerciseId) return;
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, exercises: [...d.exercises, { exerciseId, sets: 3 }] }
          : d
      )
    );
  }

  const selectedMuscles = useMemo(
    () => [...primary, ...secondary.filter((m) => !primary.includes(m))],
    [primary, secondary]
  );

  function defaultStartSets(m: MuscleGroupId): number {
    const lm = muscleGroups.find((g) => g.id === m)?.landmarks;
    if (!lm) return 8;
    return primary.includes(m) ? lm.mev + 2 : lm.mev;
  }

  function create() {
    if (!name.trim()) return setError("Give the mesocycle a name.");
    if (trainingDays.length === 0) return setError("Pick at least one training day.");
    if (days.every((d) => d.exercises.length === 0))
      return setError("Add at least one exercise to a training day.");

    const dayPlans: MesoDayPlan[] = days.map((d, i) => ({
      id: d.id,
      name: d.name,
      dayOfWeek: orderedSlots[i],
      focus: d.name,
      prescriptions: d.exercises.map(({ exerciseId, sets, loadTarget }) => {
        const ex = getExercise(exerciseId)!;
        const strengthLift =
          (goal === "strength" || goal === "hybrid") &&
          ex.category === "compound" &&
          ex.goalSuitability !== "hypertrophy";
        return {
          id: uid("presc"),
          exerciseId,
          targetSets: sets,
          targetRepMin: strengthLift ? 4 : ex.category === "isolation" ? 10 : 8,
          targetRepMax: strengthLift ? 6 : ex.category === "isolation" ? 15 : 12,
          targetRir: rirProgression[0]?.rirMin ?? 3,
          restSeconds: strengthLift ? 180 : ex.category === "compound" ? 120 : 75,
          goalType: strengthLift ? ("strength" as const) : ("hypertrophy" as const),
          loadTarget,
        };
      }),
    }));

    const meso: Mesocycle = {
      id: uid("meso"),
      name: name.trim(),
      goal,
      startDate,
      durationWeeks: duration,
      currentWeek: 1,
      status: makeActive ? "active" : "planned",
      split,
      primaryMuscles: primary,
      secondaryMuscles: secondary,
      days: dayPlans,
      startingWeeklySets: Object.fromEntries(
        selectedMuscles.map((m) => [m, startSets[m] ?? defaultStartSets(m)])
      ),
      landmarkOverrides: {},
      rirProgression,
      deload: {
        volumeReductionPercent: deloadPct,
        targetRir: deloadRir,
        durationDays: 7,
      },
      deloadWeek,
      color: MESO_COLORS[mesoCount % MESO_COLORS.length],
    };

    addMesocycle(meso);

    // Generate the full calendar of planned workouts. Each week is a 7-day
    // cycle from the start date, so the first session is on day one and
    // nothing lands in the past.
    const start = new Date(startDate + "T12:00:00");
    for (let week = 1; week <= duration; week++) {
      const isDeload = week >= deloadWeek;
      const rir = isDeload
        ? deloadRir
        : (rirProgression.find((t) => t.week === week)?.rirMin ?? 2);
      for (const day of dayPlans) {
        const date = new Date(start);
        date.setDate(date.getDate() + (week - 1) * 7 + offsetFromStart(day.dayOfWeek));
        const workout: Workout = {
          id: uid("workout"),
          mesocycleId: meso.id,
          mesoDayId: day.id,
          name: isDeload ? `${day.name} (Deload)` : day.name,
          date: isoDate(date),
          week,
          focus: day.focus,
          prescriptions: day.prescriptions.map((p) => ({
            ...p,
            id: uid("presc"),
            targetSets: isDeload
              ? Math.max(1, Math.round(p.targetSets * (1 - deloadPct / 100)))
              : p.targetSets,
            targetRir: rir,
          })),
          loggedSets: [],
          exerciseFeedback: [],
          status: "planned",
        };
        addWorkout(workout);
      }
    }

    router.push(`/mesocycles/${meso.id}`);
  }

  const exercisesByMuscle = useMemo(() => {
    const groups: { muscle: MuscleGroupId; list: typeof EXERCISES }[] = [];
    for (const m of MUSCLE_GROUP_IDS) {
      const list = EXERCISES.filter((e) => e.primaryMuscle === m);
      if (list.length) groups.push({ muscle: m, list });
    }
    return groups;
  }, []);

  return (
    <div className="animate-fade-up max-w-3xl">
      <PageHeader
        title="New mesocycle"
        description="Plan a 4-8 week block. The system handles weekly volume and effort targets from here."
      />

      <div className="space-y-5">
        <Card>
          <CardTitle>Start from a template (optional)</CardTitle>
          <p className="mb-3 text-xs text-muted">
            Presets, not your data — nothing exists until you hit “Create
            mesocycle”. Applying one prefills days, exercises, and load
            targets; everything stays editable below.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {MESO_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  templateId === t.id
                    ? "border-accent/60 bg-accent-soft"
                    : "border-border bg-raised hover:border-border-strong"
                )}
              >
                <div className={cn("text-sm font-semibold", templateId === t.id && "text-accent")}>
                  {t.name}
                </div>
                <div className="mt-0.5 text-[11px] capitalize text-muted">
                  {t.goal} · {t.days.length} days/week
                </div>
              </button>
            ))}
          </div>
          {(() => {
            const selected = MESO_TEMPLATES.find((t) => t.id === templateId);
            return selected ? (
              <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
                <p className="text-xs leading-relaxed text-text-secondary">
                  {selected.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selected.primaryMuscles.map((m) => (
                    <MuscleChip key={m} muscle={m} />
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </Card>

        <Card>
          <CardTitle>Basics</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Mesocycle name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring Strength Block"
              />
            </div>
            <div>
              <Label>Goal</Label>
              <Select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                <option value="hypertrophy">Hypertrophy</option>
                <option value="strength">Strength</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </div>
            <div>
              <Label>Duration (incl. deload week)</Label>
              <Select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {[4, 5, 6, 7, 8].map((w) => (
                  <option key={w} value={w}>{w} weeks</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="mt-1.5 text-[11px] text-muted">
                Day 1 is scheduled on this date — the weekly cycle runs from
                here, never behind it.
              </p>
            </div>
            <div>
              <Label>Split</Label>
              <Select value={split} onChange={(e) => changeSplit(e.target.value as SplitType)}>
                {Object.entries(SPLIT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Training days</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      trainingDays.includes(i)
                        ? "border-accent/60 bg-accent-soft text-accent"
                        : "border-border bg-raised text-text-secondary hover:text-text"
                    )}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
              {orderedSlots.length > 0 && (
                <p className="mt-2 text-[11px] text-muted">
                  Cycle order from your start date:{" "}
                  {orderedSlots.map((d) => DAY_NAMES[d].slice(0, 3)).join(" → ")}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary sm:col-span-2">
              <input
                type="checkbox"
                checked={makeActive}
                onChange={(e) => setMakeActive(e.target.checked)}
                className="accent-[#e3b341]"
              />
              Set as active mesocycle{hasActive && " (completes the current one)"}
            </label>
          </div>
        </Card>

        <Card>
          <CardTitle>Muscle emphasis</CardTitle>
          <Label>Primary muscles</Label>
          <div className="mb-4 flex flex-wrap gap-2">
            {MUSCLE_GROUP_IDS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMuscle(primary, setPrimary, m)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  !primary.includes(m) && "border-border bg-raised text-text-secondary hover:text-text"
                )}
                style={
                  primary.includes(m)
                    ? {
                        color: MUSCLE_COLORS[m],
                        borderColor: `${MUSCLE_COLORS[m]}99`,
                        backgroundColor: `${MUSCLE_COLORS[m]}1f`,
                      }
                    : undefined
                }
              >
                <MuscleIcon muscle={m} size={15} />
                {MUSCLE_LABELS[m]}
              </button>
            ))}
          </div>
          <Label>Secondary muscles</Label>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUP_IDS.filter((m) => !primary.includes(m)).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMuscle(secondary, setSecondary, m)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  !secondary.includes(m) && "border-border bg-raised text-text-secondary hover:text-text"
                )}
                style={
                  secondary.includes(m)
                    ? {
                        color: MUSCLE_COLORS[m],
                        borderColor: `${MUSCLE_COLORS[m]}66`,
                        backgroundColor: `${MUSCLE_COLORS[m]}14`,
                      }
                    : undefined
                }
              >
                <MuscleIcon muscle={m} size={15} />
                {MUSCLE_LABELS[m]}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Starting weekly sets</CardTitle>
          <p className="mb-4 text-xs text-muted">
            Where each muscle begins in week 1. The engine recommends weekly
            adjustments between your MEV and MRV from there. Landmarks are
            editable in Settings.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedMuscles.map((m) => {
              const lm = muscleGroups.find((g) => g.id === m)?.landmarks;
              return (
                <div key={m} className="flex items-center gap-3">
                  <span className="flex w-32 items-center gap-2 text-sm">
                    <MuscleIcon muscle={m} size={16} />
                    {MUSCLE_LABELS[m]}
                  </span>
                  <NumberInput
                    className="w-20"
                    value={startSets[m] ?? defaultStartSets(m)}
                    onCommit={(v) =>
                      setStartSets((s) => ({ ...s, [m]: Math.round(v) }))
                    }
                  />
                  {lm && (
                    <span className="tnum text-[11px] text-muted">
                      MEV {lm.mev} · MAV {lm.mav} · MRV {lm.mrv}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>Effort & deload model</CardTitle>
          <Label>RIR progression (working weeks)</Label>
          <div className="mb-5 flex flex-wrap gap-2">
            {rirProgression.map((t) => (
              <div key={t.week} className="rounded-lg border border-border bg-raised px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted">Week {t.week}</div>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <NumberInput
                    className="w-12 px-1 py-0.5 text-center text-sm"
                    value={rirOverrides[t.week] ?? t.rirMin}
                    onCommit={(v) =>
                      setRirOverrides((o) => ({ ...o, [t.week]: Math.round(v) }))
                    }
                  />
                  <span className="text-xs text-muted">RIR</span>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-warn">Week {deloadWeek}</div>
              <div className="mt-1 text-sm font-medium text-warn">Deload</div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Deload volume reduction (%)</Label>
              <NumberInput
                value={deloadPct}
                onCommit={(v) => setDeloadPct(v)}
              />
            </div>
            <div>
              <Label>Deload target RIR</Label>
              <NumberInput
                value={deloadRir}
                onCommit={(v) => setDeloadRir(Math.round(v))}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Deload week keeps the movement patterns at moderate loads — no
            failure training, no PR attempts.
          </p>
        </Card>

        {days.map((day, dayIdx) => (
          <Card key={day.id}>
            <CardTitle>
              Day {dayIdx + 1} · {DAY_NAMES[orderedSlots[dayIdx]] ?? ""} —{" "}
              <span className="normal-case">{day.name}</span>
            </CardTitle>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Day name</Label>
                <Input
                  value={day.name}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((d) => (d.id === day.id ? { ...d, name: e.target.value } : d))
                    )
                  }
                />
              </div>
              <div>
                <Label>Add exercise</Label>
                <Select value="" onChange={(e) => addExercise(day.id, e.target.value)}>
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
            </div>
            {day.exercises.length === 0 ? (
              <p className="text-xs text-muted">No exercises yet.</p>
            ) : (
              <div className="space-y-2">
                {day.exercises.map((e, idx) => {
                  const ex = getExercise(e.exerciseId)!;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border border-border bg-raised px-3 py-2"
                    >
                      <MuscleChip muscle={ex.primaryMuscle} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-sm" title={ex.name}>
                        {ex.name}
                      </span>
                      {e.loadTarget && (
                        <Badge tone={LOAD_TARGET_TONE[e.loadTarget]} className="hidden shrink-0 lg:inline-flex">
                          {LOAD_TARGET_LABELS[e.loadTarget]}
                        </Badge>
                      )}
                      <Badge tone="neutral" className="capitalize hidden shrink-0 lg:inline-flex">
                        {ex.equipment}
                      </Badge>
                      <NumberInput
                        className="w-14 shrink-0 px-1 py-1 text-center"
                        value={e.sets}
                        onCommit={(v) =>
                          setDays((prev) =>
                            prev.map((d) =>
                              d.id === day.id
                                ? {
                                    ...d,
                                    exercises: d.exercises.map((x, i) =>
                                      i === idx ? { ...x, sets: Math.round(v) } : x
                                    ),
                                  }
                                : d
                            )
                          )
                        }
                      />
                      <span className="text-xs text-muted">sets</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDays((prev) =>
                            prev.map((d) =>
                              d.id === day.id
                                ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) }
                                : d
                            )
                          )
                        }
                        className="text-muted hover:text-danger"
                        aria-label="Remove exercise"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pb-10">
          <Button variant="primary" size="lg" onClick={create}>
            Create mesocycle
          </Button>
          <Button variant="ghost" onClick={() => router.push("/mesocycles")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
