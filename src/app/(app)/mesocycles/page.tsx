"use client";

import Link from "next/link";
import { useHydrated, useTrainingStore } from "@/lib/store";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  PageSkeleton,
} from "@/components/ui";
import { MesocycleIcon } from "@/components/icons/navigation";
import { formatDate } from "@/lib/utils";
import { mesoColor } from "@/lib/types";

const STATUS_TONE = {
  active: "good",
  planned: "info",
  completed: "neutral",
} as const;

export default function MesocyclesPage() {
  const hydrated = useHydrated();
  const mesocycles = useTrainingStore((s) => s.mesocycles);
  const workouts = useTrainingStore((s) => s.workouts);

  if (!hydrated) return <PageSkeleton />;

  const sorted = [...mesocycles].sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Mesocycles"
        description="Training blocks: plan, run, review."
        action={
          <LinkButton href="/mesocycles/new" variant="primary">
            + New mesocycle
          </LinkButton>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<MesocycleIcon size={36} />}
          title="No mesocycles yet"
          description="Create your first training block: pick a goal, a split, and let the system manage volume week to week."
          action={
            <LinkButton href="/mesocycles/new" variant="primary">
              Create mesocycle
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((m) => {
            const done = workouts.filter(
              (w) => w.mesocycleId === m.id && w.status === "completed"
            ).length;
            return (
              <Link key={m.id} href={`/mesocycles/${m.id}`}>
                <Card className="h-full transition-colors hover:border-accent/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: mesoColor(m) }}
                        />
                        {m.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        Started {formatDate(m.startDate)} · {m.durationWeeks} weeks ·{" "}
                        {m.days.length} days/week
                      </div>
                    </div>
                    <Badge tone={STATUS_TONE[m.status]} className="capitalize">
                      {m.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-text-secondary">
                    <Badge tone="accent" className="capitalize">{m.goal}</Badge>
                    <span className="tnum">
                      Week {m.currentWeek}/{m.durationWeeks}
                    </span>
                    <span className="tnum">{done} sessions done</span>
                  </div>
                  <div className="mt-4 flex gap-1">
                    {Array.from({ length: m.durationWeeks }, (_, i) => i + 1).map((w) => (
                      <div
                        key={w}
                        className={`h-1.5 flex-1 rounded-full ${
                          w < m.currentWeek
                            ? "bg-accent/60"
                            : w === m.currentWeek && m.status === "active"
                              ? "bg-accent"
                              : w >= m.deloadWeek
                                ? "bg-warn/30"
                                : "bg-overlay"
                        }`}
                      />
                    ))}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
