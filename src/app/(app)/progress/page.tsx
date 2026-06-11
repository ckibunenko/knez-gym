"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useActiveMesocycle, useHydrated, useTrainingStore } from "@/lib/store";
import { EXERCISES, getExercise } from "@/lib/data/exercises";
import {
  bestRecords,
  e1rmHistory,
  personalRecords,
  rirAccuracy,
  weeklySetsPerMuscle,
  workoutTonnage,
  type BestRecord,
} from "@/lib/logic/analytics";
import { MUSCLE_COLORS, type MuscleGroupId, type Workout } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardTitle,
  PageHeader,
  PageSkeleton,
  Select,
  Stat,
} from "@/components/ui";
import { MuscleIcon } from "@/components/icons/muscles";
import {
  DeloadIcon,
  HypertrophyIcon,
  RirIcon,
  StrengthIcon,
  TrendIcon,
  VolumeLandmarksIcon,
} from "@/components/icons/training";
import { PrIcon } from "@/components/icons/feedback";

const GRID = "var(--color-border)";
const TICK = "var(--color-muted)";
const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-raised)",
  border: "1px solid var(--color-border-strong)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-text)",
} as const;

function mondayKey(dateIso: string): string {
  // Noon avoids DST edges; local getters avoid the UTC off-by-one of toISOString.
  const d = new Date(dateIso + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isRecentPr(dateIso: string): boolean {
  // Noon avoids DST/UTC off-by-one (same trick as mondayKey).
  return Date.now() - new Date(dateIso + "T12:00:00").getTime() < 14 * 86_400_000;
}

function weeklyBuckets(workouts: Workout[]) {
  const map = new Map<string, Workout[]>();
  for (const w of workouts) {
    const key = mondayKey(w.date);
    map.set(key, [...(map.get(key) ?? []), w]);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export default function ProgressPage() {
  const hydrated = useHydrated();
  const workouts = useTrainingStore((s) => s.workouts);
  const muscleGroups = useTrainingStore((s) => s.muscleGroups);
  const meso = useActiveMesocycle();

  const completed = useMemo(
    () => workouts.filter((w) => w.status === "completed"),
    [workouts]
  );

  const trackedLifts = useMemo(
    () =>
      EXERCISES.filter(
        (e) => e1rmHistory(completed, e.id).length >= 2
      ).map((e) => e.id),
    [completed]
  );

  const [lift, setLift] = useState<string>("");
  const [muscle, setMuscle] = useState<MuscleGroupId>("chest");
  const activeLift = lift || trackedLifts[0] || "";

  const e1rmData = useMemo(
    () =>
      activeLift
        ? e1rmHistory(completed, activeLift).map((p) => ({
            date: formatDate(p.date),
            e1rm: p.e1rm,
          }))
        : [],
    [completed, activeLift]
  );

  const buckets = useMemo(() => weeklyBuckets(completed), [completed]);

  const workloadData = useMemo(
    () =>
      buckets.map(([key, ws], i) => ({
        week: `W${i + 1}`,
        sets: ws.reduce(
          (s, w) => s + w.loggedSets.filter((x) => x.completed).length,
          0
        ),
        tonnage: Math.round(ws.reduce((s, w) => s + workoutTonnage(w), 0) / 100) / 10,
        key,
      })),
    [buckets]
  );

  // Per-bucket muscle volume, computed once and shared by the chart + consistency.
  const bucketMuscleSets = useMemo(
    () => buckets.map(([key, ws]) => ({ key, sets: weeklySetsPerMuscle(ws) })),
    [buckets]
  );

  const muscleWeekly = useMemo(
    () =>
      bucketMuscleSets.map((b, i) => ({
        week: `W${i + 1}`,
        sets: b.sets[muscle] ?? 0,
        key: b.key,
      })),
    [bucketMuscleSets, muscle]
  );

  const fatigueData = useMemo(
    () =>
      buckets.map(([key, ws], i) => {
        const fbs = ws.filter((w) => w.workoutFeedback);
        const avg = (pick: (f: NonNullable<Workout["workoutFeedback"]>) => number) =>
          fbs.length
            ? Math.round(
                (fbs.reduce((s, w) => s + pick(w.workoutFeedback!), 0) / fbs.length) * 10
              ) / 10
            : 0;
        let jointSum = 0;
        let jointCount = 0;
        for (const w of ws) {
          for (const f of w.exerciseFeedback) {
            jointSum += f.jointDiscomfort;
            jointCount += 1;
          }
        }
        const joints = jointCount > 0 ? Math.round((jointSum / jointCount) * 10) / 10 : 0;
        return {
          week: `W${i + 1}`,
          soreness: avg((f) => f.soreness),
          difficulty: avg((f) => f.overallDifficulty) / 3.33,
          joints,
          key,
        };
      }),
    [buckets]
  );

  const consistency = useMemo(() => {
    const totalWeeks = Math.max(bucketMuscleSets.length, 1);
    return muscleGroups
      .map((mg) => {
        const weeks = bucketMuscleSets.filter((b) => (b.sets[mg.id] ?? 0) > 0).length;
        return { muscle: mg.id, name: mg.name, pct: Math.round((weeks / totalWeeks) * 100) };
      })
      .filter((c) => c.pct > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [bucketMuscleSets, muscleGroups]);

  const prs = useMemo(() => personalRecords(completed), [completed]);
  const accuracy = useMemo(() => rirAccuracy(completed), [completed]);

  // All-time best per exercise, bucketed by primary muscle (store order);
  // within each group the most-trained exercise comes first.
  const recordGroups = useMemo(() => {
    const byMuscle = new Map<MuscleGroupId, BestRecord[]>();
    for (const r of bestRecords(completed)) {
      byMuscle.set(r.muscle, [...(byMuscle.get(r.muscle) ?? []), r]);
    }
    return muscleGroups
      .map((mg) => ({ id: mg.id, name: mg.name, records: byMuscle.get(mg.id) ?? [] }))
      .filter((g) => g.records.length > 0);
  }, [completed, muscleGroups]);

  const deloadHistory = useMemo(
    () =>
      workouts.filter(
        (w) => w.name.toLowerCase().includes("deload") && w.status === "completed"
      ),
    [workouts]
  );

  if (!hydrated) return <PageSkeleton />;

  const landmarks =
    meso?.landmarkOverrides[muscle] ??
    muscleGroups.find((m) => m.id === muscle)?.landmarks;

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title="Progress"
        description="Strength, volume, and recovery — across the whole block."
      />

      {/* Headline stats */}
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Sessions completed" value={completed.length} />
          <Stat
            label="Total sets"
            value={completed.reduce(
              (s, w) => s + w.loggedSets.filter((x) => x.completed).length,
              0
            )}
          />
          <Stat
            label="RIR accuracy"
            value={accuracy === null ? "—" : `±${accuracy}`}
            sub="avg distance from target"
            tone={accuracy !== null && accuracy <= 1 ? "good" : undefined}
          />
          <Stat label="PRs set" value={prs.length} tone="accent" />
        </div>
      </Card>

      {/* Personal records — all-time best per exercise, by muscle group */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <div className="pointer-events-none absolute -top-28 right-10 h-56 w-[28rem] rounded-full bg-accent/[0.06] blur-3xl" />
        <CardTitle icon={<PrIcon size={16} />}>Personal records</CardTitle>
        {recordGroups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recordGroups.map((g) => {
              const color = MUSCLE_COLORS[g.id];
              return (
                <div key={g.id} className="rounded-xl border border-border bg-raised p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${color}1f`, color }}
                    >
                      <MuscleIcon muscle={g.id} size={15} />
                    </span>
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className="ml-auto text-[11px] text-muted">
                      {g.records.length} {g.records.length === 1 ? "lift" : "lifts"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {g.records.map((r, i) => (
                      <div
                        key={r.exerciseId}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2",
                          i === 0 && "bg-overlay ring-1 ring-accent/20"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">{r.exerciseName}</div>
                          <div className="text-[11px] text-muted">
                            {formatDate(r.date)} · {r.setsLogged} {r.setsLogged === 1 ? "set" : "sets"} logged
                            {isRecentPr(r.date) && (
                              <span className="ml-1.5 rounded border border-accent/40 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-accent">
                                new
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="tnum text-sm font-semibold text-accent">
                            {r.weight} kg × {r.reps}
                          </div>
                          <div className="tnum text-[10px] text-muted">e1RM {r.e1rm} kg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">Complete a workout to start the record board.</p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* e1RM trend */}
        <Card>
          <CardTitle
            icon={<StrengthIcon size={16} />}
            action={
              <Select
                value={activeLift}
                onChange={(e) => setLift(e.target.value)}
                className="w-auto py-1 text-xs"
              >
                {trackedLifts.map((id) => (
                  <option key={id} value={id}>
                    {getExercise(id)?.name ?? id}
                  </option>
                ))}
              </Select>
            }
          >
            Estimated 1RM trend
          </CardTitle>
          {e1rmData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={e1rmData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "e1RM"]} />
                <Line type="monotone" dataKey="e1rm" stroke="#e3b341" strokeWidth={2.5} dot={{ fill: "#e3b341", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted">
              Log at least two sessions of a lift to see its trend.
            </p>
          )}
        </Card>

        {/* Weekly volume vs landmarks */}
        <Card>
          <CardTitle
            icon={<VolumeLandmarksIcon size={16} />}
            action={
              <Select
                value={muscle}
                onChange={(e) => setMuscle(e.target.value as MuscleGroupId)}
                className="w-auto py-1 text-xs"
              >
                {muscleGroups.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            }
          >
            Weekly sets vs landmarks
          </CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={muscleWeekly} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#1f253055" }} />
              <Bar dataKey="sets" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={42} />
              {landmarks && (
                <>
                  <ReferenceLine y={landmarks.mev} stroke="#60a5fa" strokeDasharray="4 4" label={{ value: "MEV", fill: "#60a5fa", fontSize: 10, position: "right" }} />
                  <ReferenceLine y={landmarks.mav} stroke="#34d399" strokeDasharray="4 4" label={{ value: "MAV", fill: "#34d399", fontSize: 10, position: "right" }} />
                  <ReferenceLine y={landmarks.mrv} stroke="#f87171" strokeDasharray="4 4" label={{ value: "MRV", fill: "#f87171", fontSize: 10, position: "right" }} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Weekly workload */}
        <Card>
          <CardTitle icon={<HypertrophyIcon size={16} />}>Total weekly workload</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workloadData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: "#1f253055" }}
                formatter={(v, name) => [name === "tonnage" ? `${v} t` : v, name === "tonnage" ? "Tonnage" : "Sets"]}
              />
              <Bar dataKey="sets" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="tonnage" fill="#e3b341" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Fatigue trend */}
        <Card>
          <CardTitle icon={<TrendIcon size={16} />}>Soreness & fatigue trend</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={fatigueData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis domain={[0, 3]} tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="soreness" stroke="#fbbf24" strokeWidth={2} dot={false} name="Soreness (0-3)" />
              <Line type="monotone" dataKey="difficulty" stroke="#f87171" strokeWidth={2} dot={false} name="Difficulty (scaled)" />
              <Line type="monotone" dataKey="joints" stroke="#60a5fa" strokeWidth={2} dot={false} name="Joint discomfort (0-3)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Consistency */}
        <Card>
          <CardTitle icon={<RirIcon size={16} />}>Muscle consistency</CardTitle>
          <div className="space-y-2.5">
            {consistency.map((c) => (
              <div key={c.muscle} className="flex items-center gap-3">
                <MuscleIcon muscle={c.muscle} size={17} className="shrink-0 text-text-secondary" />
                <span className="w-24 text-sm">{c.name}</span>
                <div className="h-2 flex-1 rounded-full bg-overlay">
                  <div
                    className="h-2 rounded-full bg-good"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <span className="tnum w-10 text-right text-xs text-muted">{c.pct}%</span>
              </div>
            ))}
            {consistency.length === 0 && (
              <p className="text-sm text-muted">No training history yet.</p>
            )}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Share of training weeks in which each muscle received at least one set.
          </p>
        </Card>

        {/* Deload history */}
        <Card>
          <CardTitle icon={<DeloadIcon size={16} />}>Deload history</CardTitle>
          <div className="space-y-2">
            {deloadHistory.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-border bg-raised px-3 py-2"
              >
                <span className="text-sm">{w.name}</span>
                <Badge tone="warn">{formatDate(w.date)}</Badge>
              </div>
            ))}
            {deloadHistory.length === 0 && (
              <p className="text-sm text-muted">
                No deloads completed yet. The first one is scheduled at the end
                of your current block — or earlier if fatigue signals demand it.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
