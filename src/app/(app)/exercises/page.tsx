"use client";

import { useMemo, useState } from "react";
import { EXERCISES } from "@/lib/data/exercises";
import {
  MUSCLE_GROUP_IDS,
  MUSCLE_LABELS,
  type Equipment,
  type MuscleGroupId,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, Card, Input, MuscleChip, PageHeader, Select } from "@/components/ui";
import { EquipmentIcon } from "@/components/icons/equipment";
import { StrengthIcon, HypertrophyIcon } from "@/components/icons/training";

const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight"];

export default function ExercisesPage() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroupId | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(
      (e) =>
        (muscle === "all" || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle)) &&
        (equipment === "all" || e.equipment === equipment) &&
        (q === "" || e.name.toLowerCase().includes(q))
    );
  }, [query, muscle, equipment]);

  // One section per muscle group, in the canonical order.
  const grouped = useMemo(
    () =>
      MUSCLE_GROUP_IDS.map((m) => ({
        muscle: m,
        list: filtered.filter((e) => e.primaryMuscle === m),
      })).filter((g) => g.list.length > 0),
    [filtered]
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Exercise Library"
        description={`${EXERCISES.length} movements, tagged by muscle, equipment, pattern, and cost.`}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          className="sm:max-w-xs"
        />
        <Select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleGroupId | "all")}
          className="sm:max-w-44"
          aria-label="Filter by muscle"
        >
          <option value="all">All muscles</option>
          {MUSCLE_GROUP_IDS.map((m) => (
            <option key={m} value={m}>{MUSCLE_LABELS[m]}</option>
          ))}
        </Select>
        <Select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment | "all")}
          className="sm:max-w-44"
          aria-label="Filter by equipment"
        >
          <option value="all">All equipment</option>
          {EQUIPMENT.map((eq) => (
            <option key={eq} value={eq} className="capitalize">
              {eq[0].toUpperCase() + eq.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-6">
        {grouped.map((g) => (
          <section key={g.muscle}>
            <div className="mb-2 flex items-center gap-2">
              <MuscleChip muscle={g.muscle} size="md" />
              <span className="tnum text-xs text-muted">{g.list.length}</span>
            </div>
            <Card className="divide-y divide-border p-0">
              {g.list.map((ex) => (
                <div
                  key={ex.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1 basis-52">
                    <div className="truncate text-sm font-semibold" title={ex.name}>
                      {ex.name}
                    </div>
                    {ex.secondaryMuscles.length > 0 && (
                      <div className="truncate text-[11px] text-muted">
                        + {ex.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")}
                      </div>
                    )}
                  </div>
                  <Badge tone="neutral">
                    <EquipmentIcon equipment={ex.equipment} size={12} />
                    <span className="capitalize">{ex.equipment}</span>
                  </Badge>
                  <Badge tone="neutral" className="hidden capitalize lg:inline-flex">
                    {ex.category}
                  </Badge>
                  <span
                    className={cn(
                      "shrink-0 text-text-secondary",
                      ex.goalSuitability === "both" && "text-accent"
                    )}
                    title={`Suited for ${ex.goalSuitability}`}
                  >
                    {ex.goalSuitability === "strength" ? (
                      <StrengthIcon size={16} />
                    ) : ex.goalSuitability === "hypertrophy" ? (
                      <HypertrophyIcon size={16} />
                    ) : (
                      <span className="flex gap-1">
                        <StrengthIcon size={16} />
                        <HypertrophyIcon size={16} />
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          No exercises match those filters.
        </p>
      )}
    </div>
  );
}
