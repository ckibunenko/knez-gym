"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useHydrated, useTrainingStore } from "@/lib/store";
import { formatDate, isoDate } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  PageSkeleton,
} from "@/components/ui";
import { WorkoutIcon } from "@/components/icons/navigation";
import { CompletedIcon, SkippedIcon } from "@/components/icons/feedback";
import { workoutTonnage } from "@/lib/logic/analytics";
import type { Workout } from "@/lib/types";

function WorkoutRow({ workout }: { workout: Workout }) {
  const tonnage = workoutTonnage(workout);
  return (
    <div className="group relative flex items-center gap-4 rounded-lg border border-border bg-raised px-4 py-3 transition-colors hover:border-accent/50">
      {/* Stretched link keeps the whole row clickable without nesting anchors. */}
      <Link
        href={`/workouts/${workout.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`${workout.name} — open`}
      />
      <div className="w-24 shrink-0">
        <div className="text-xs text-muted">{formatDate(workout.date)}</div>
        {workout.week && (
          <div className="text-[10px] uppercase tracking-wider text-muted">
            Week {workout.week}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{workout.name}</div>
        <div className="text-xs text-muted">
          {workout.prescriptions.length} exercises
          {workout.status === "completed" && (
            <>
              {" "}· {workout.loggedSets.filter((s) => s.completed).length} sets ·{" "}
              <span className="tnum">{(tonnage / 1000).toFixed(1)}t lifted</span>
            </>
          )}
        </div>
      </div>
      {workout.status === "completed" && <CompletedIcon size={18} className="shrink-0 text-good" />}
      {workout.status === "skipped" && <SkippedIcon size={18} className="shrink-0 text-muted" />}
      {workout.status === "inProgress" && <Badge tone="accent">in progress</Badge>}
      {workout.status === "planned" && <Badge tone="info">planned</Badge>}
      <Link
        href={`/workouts/${workout.id}/edit`}
        aria-label={`Edit ${workout.name}`}
        title="Edit workout"
        className="relative z-10 shrink-0 rounded-md px-1.5 py-0.5 text-sm text-muted opacity-60 transition-opacity hover:bg-overlay hover:text-text group-hover:opacity-100"
      >
        ✎
      </Link>
    </div>
  );
}

export default function WorkoutsPage() {
  const hydrated = useHydrated();
  const workouts = useTrainingStore((s) => s.workouts);

  const { upcoming, past } = useMemo(() => {
    const today = isoDate(new Date());
    const upcoming = workouts
      .filter((w) => (w.status === "planned" || w.status === "inProgress") && w.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    const past = workouts
      .filter((w) => !upcoming.includes(w))
      .sort((a, b) => b.date.localeCompare(a.date));
    return { upcoming, past };
  }, [workouts]);

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title="Workouts"
        description="Your full session timeline."
        action={
          <LinkButton href="/workouts/new" variant="primary">
            + New workout
          </LinkButton>
        }
      />

      {workouts.length === 0 ? (
        <EmptyState
          icon={<WorkoutIcon size={36} />}
          title="No workouts yet"
          description="Plan a one-off session or create a mesocycle to generate your training calendar."
          action={
            <LinkButton href="/workouts/new" variant="primary">
              Plan a workout
            </LinkButton>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <Card>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Upcoming
              </div>
              <div className="space-y-2">
                {upcoming.map((w) => (
                  <WorkoutRow key={w.id} workout={w} />
                ))}
              </div>
            </Card>
          )}
          <Card>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              History
            </div>
            <div className="space-y-2">
              {past.slice(0, 30).map((w) => (
                <WorkoutRow key={w.id} workout={w} />
              ))}
              {past.length > 30 && (
                <p className="pt-1 text-center text-xs text-muted">
                  Showing 30 of {past.length} — older sessions are in the calendar.
                </p>
              )}
              {past.length === 0 && (
                <p className="text-sm text-muted">No sessions logged yet.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
