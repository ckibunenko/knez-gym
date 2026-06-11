"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHydrated, useTrainingStore } from "@/lib/store";
import { getExercise } from "@/lib/data/exercises";
import { MUSCLE_LABELS } from "@/lib/types";
import { formatDate, DAY_NAMES, cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  LinkButton,
  PageHeader,
  PageSkeleton,
  Stat,
} from "@/components/ui";
import { MuscleIcon } from "@/components/icons/muscles";
import { CompletedIcon, SkippedIcon } from "@/components/icons/feedback";
import { MesocycleIcon } from "@/components/icons/navigation";

export default function MesocycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const hydrated = useHydrated();
  const meso = useTrainingStore((s) => s.mesocycles.find((m) => m.id === id));
  const workouts = useTrainingStore((s) => s.workouts);
  const updateMesocycle = useTrainingStore((s) => s.updateMesocycle);
  const setActiveMesocycle = useTrainingStore((s) => s.setActiveMesocycle);
  const deleteMesocycle = useTrainingStore((s) => s.deleteMesocycle);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mesoWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => w.mesocycleId === id)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [workouts, id]
  );

  const byWeek = useMemo(() => {
    const map = new Map<number, typeof mesoWorkouts>();
    for (const w of mesoWorkouts) {
      const week = w.week ?? 1;
      map.set(week, [...(map.get(week) ?? []), w]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [mesoWorkouts]);

  if (!hydrated) return <PageSkeleton />;

  if (!meso) {
    return (
      <EmptyState
        icon={<MesocycleIcon size={36} />}
        title="Mesocycle not found"
        action={<LinkButton href="/mesocycles">Back to mesocycles</LinkButton>}
      />
    );
  }

  const done = mesoWorkouts.filter((w) => w.status === "completed").length;

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title={meso.name}
        description={`${meso.durationWeeks}-week ${meso.goal} block · started ${formatDate(meso.startDate)}`}
        action={
          <div className="flex gap-2">
            {meso.status !== "active" && (
              <Button variant="primary" onClick={() => setActiveMesocycle(meso.id)}>
                Set active
              </Button>
            )}
            {confirmDelete ? (
              <>
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteMesocycle(meso.id);
                    router.push("/mesocycles");
                  }}
                >
                  Delete block & workouts
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
            label="Status"
            value={
              <Badge
                tone={meso.status === "active" ? "good" : meso.status === "planned" ? "info" : "neutral"}
                className="capitalize"
              >
                {meso.status}
              </Badge>
            }
          />
          <Stat
            label="Week"
            value={
              <span className="flex items-center gap-2">
                {meso.currentWeek}
                <span className="text-sm text-muted">/ {meso.durationWeeks}</span>
              </span>
            }
            sub={
              meso.status === "active" ? (
                <span className="flex gap-2">
                  <button
                    className="text-accent hover:underline disabled:opacity-40"
                    disabled={meso.currentWeek <= 1}
                    aria-label="Go back one week"
                    onClick={() => updateMesocycle(meso.id, { currentWeek: meso.currentWeek - 1 })}
                  >
                    −1
                  </button>
                  <button
                    className="text-accent hover:underline disabled:opacity-40"
                    disabled={meso.currentWeek >= meso.durationWeeks}
                    aria-label="Advance one week"
                    onClick={() => updateMesocycle(meso.id, { currentWeek: meso.currentWeek + 1 })}
                  >
                    +1
                  </button>
                </span>
              ) : undefined
            }
          />
          <Stat label="Sessions done" value={done} sub={`of ${mesoWorkouts.length} planned`} />
          <Stat label="Split" value={<span className="text-base capitalize">{meso.split.replace(/([A-Z])/g, " $1")}</span>} />
          <Stat label="Deload" value={<span className="text-base">Week {meso.deloadWeek}</span>} sub={`−${meso.deload.volumeReductionPercent}% volume · ${meso.deload.targetRir} RIR`} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>Muscle emphasis</CardTitle>
          <div className="mb-3 flex flex-wrap gap-2">
            {meso.primaryMuscles.map((m) => (
              <Badge key={m} tone="accent">
                <MuscleIcon muscle={m} size={13} /> {MUSCLE_LABELS[m]}
              </Badge>
            ))}
            {meso.secondaryMuscles.map((m) => (
              <Badge key={m} tone="info">
                <MuscleIcon muscle={m} size={13} /> {MUSCLE_LABELS[m]}
              </Badge>
            ))}
          </div>
          {meso.notes && <p className="text-sm text-text-secondary">{meso.notes}</p>}
        </Card>

        <Card>
          <CardTitle>RIR progression</CardTitle>
          <div className="flex flex-wrap gap-2">
            {meso.rirProgression.map((t) => (
              <div
                key={t.week}
                className={cn(
                  "rounded-lg border px-3 py-2 text-center",
                  t.week === meso.currentWeek
                    ? "border-accent/60 bg-accent-soft"
                    : "border-border bg-raised"
                )}
              >
                <div className="text-[10px] uppercase tracking-wider text-muted">W{t.week}</div>
                <div className="tnum mt-0.5 text-sm font-semibold">
                  {t.rirMin === t.rirMax ? t.rirMin : `${t.rirMin}-${t.rirMax}`}{" "}
                  <span className="text-[10px] font-normal text-muted">RIR</span>
                </div>
              </div>
            ))}
            <div
              className={cn(
                "rounded-lg border border-warn/30 px-3 py-2 text-center",
                meso.currentWeek >= meso.deloadWeek ? "bg-warn-soft" : "bg-raised"
              )}
            >
              <div className="text-[10px] uppercase tracking-wider text-warn">W{meso.deloadWeek}</div>
              <div className="mt-0.5 text-sm font-semibold text-warn">Deload</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Weekly plan</CardTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {meso.days.map((day) => (
            <div key={day.id} className="rounded-lg border border-border bg-raised p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{day.name}</span>
                <span className="text-xs text-muted">{DAY_NAMES[day.dayOfWeek]}</span>
              </div>
              <div className="space-y-1.5">
                {day.prescriptions.map((p) => {
                  const ex = getExercise(p.exerciseId);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-text-secondary">
                        {ex && <MuscleIcon muscle={ex.primaryMuscle} size={14} />}
                        {ex?.name ?? p.exerciseId}
                      </span>
                      <span className="tnum text-xs text-muted">
                        {p.targetSets} × {p.targetRepMin}-{p.targetRepMax}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Workouts</CardTitle>
        {byWeek.length === 0 && (
          <p className="text-sm text-muted">
            No workouts in this block yet —{" "}
            <Link href="/workouts/new" className="text-accent hover:underline">
              plan one
            </Link>{" "}
            to get started.
          </p>
        )}
        <div className="space-y-5">
          {byWeek.map(([week, ws]) => (
            <div key={week}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Week {week}
                {week === meso.currentWeek && meso.status === "active" && (
                  <Badge tone="accent">current</Badge>
                )}
                {week >= meso.deloadWeek && <Badge tone="warn">deload</Badge>}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {ws.map((w) => (
                  <Link
                    key={w.id}
                    href={`/workouts/${w.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-raised px-3 py-2.5 transition-colors hover:border-accent/50"
                  >
                    <div>
                      <div className="text-sm font-medium">{w.name}</div>
                      <div className="text-[11px] text-muted">{formatDate(w.date)}</div>
                    </div>
                    {w.status === "completed" && <CompletedIcon size={17} className="text-good" />}
                    {w.status === "skipped" && <SkippedIcon size={17} className="text-muted" />}
                    {w.status === "inProgress" && <Badge tone="accent">live</Badge>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
