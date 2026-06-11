"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useHydrated, useTrainingStore } from "@/lib/store";
import { formatDate, isoDate, cn } from "@/lib/utils";
import { Badge, Button, Card, LinkButton, PageHeader, PageSkeleton } from "@/components/ui";
import { mesoColor, type Workout, type WorkoutStatus } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_STYLE: Record<WorkoutStatus, string> = {
  completed: "border-good/40 bg-good-soft text-good",
  planned: "border-info/40 bg-info-soft text-info",
  inProgress: "border-accent/50 bg-accent-soft text-accent",
  skipped: "border-border bg-overlay text-muted line-through",
};

interface DayCell {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
}

/** 6-week grid starting on the Monday on/before the 1st of the month. */
function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      date: isoDate(d),
      dayOfMonth: d.getDate(),
      inMonth: d.getMonth() === month,
    };
  });
}

export default function CalendarPage() {
  const hydrated = useHydrated();
  const workouts = useTrainingStore((s) => s.workouts);
  const mesocycles = useTrainingStore((s) => s.mesocycles);
  const addWorkout = useTrainingStore((s) => s.addWorkout);
  const clearWorkouts = useTrainingStore((s) => s.clearWorkouts);
  const deleteWorkout = useTrainingStore((s) => s.deleteWorkout);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [confirmReset, setConfirmReset] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ tone: "good" | "danger"; lines: string[] } | null>(null);
  // Ids added by the most recent import, so a bad batch can be undone.
  const [lastImportIds, setLastImportIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importProgress, setImportProgress] = useState("");

  async function handleImportFiles(files: File[]) {
    setImporting(true);
    setImportMessage(null);
    setImportProgress(`Reading ${files.length} image${files.length > 1 ? "s" : ""}…`);
    try {
      // Heavy WASM OCR + parser load on demand, fully in the browser.
      const [{ ocrImageFiles }, { parseWorkoutText, buildWorkoutFromParsed }] =
        await Promise.all([import("@/lib/import/ocr"), import("@/lib/import/parseWorkout")]);

      const ocrResults = await ocrImageFiles(files, (done, total) =>
        setImportProgress(`Reading image ${done}/${total}…`)
      );

      const lines: string[] = [];
      let lastDate: string | null = null;
      const existing = useTrainingStore.getState().workouts;
      // Same-batch duplicates aren't in `existing` yet — track them too.
      const seenInBatch = new Set<string>();
      const importedIds: string[] = [];

      for (const { text, date: badgeDate } of ocrResults) {
        const parsed = parseWorkoutText(text);
        // The dedicated badge pass reads the date far more reliably than
        // the full-page text; prefer it when present.
        if (badgeDate) parsed.date = badgeDate;
        const { workout, matched, skipped } = buildWorkoutFromParsed(parsed);
        if (matched === 0) {
          lines.push(`✗ ${parsed.name}: no recognizable exercises found.`);
          continue;
        }
        const key = `${workout.date}|${workout.name}`;
        const duplicate =
          seenInBatch.has(key) ||
          existing.some((w) => w.date === workout.date && w.name === workout.name);
        if (duplicate) {
          lines.push(`• ${workout.name} on ${formatDate(workout.date)} already exists — skipped.`);
          continue;
        }
        seenInBatch.add(key);
        addWorkout(workout);
        importedIds.push(workout.id);
        lastDate = workout.date;
        lines.push(
          `${parsed.date ? "✓" : "⚠"} ${workout.name} → ${formatDate(workout.date)} (${matched} exercises, ${workout.loggedSets.length} sets)` +
            (parsed.date ? "" : " — date not readable in the image, saved as today") +
            (skipped.length ? `; unrecognized: ${skipped.join(", ")}` : "")
        );
      }

      if (lastDate) {
        const d = new Date(lastDate + "T00:00:00");
        setYear(d.getFullYear());
        setMonth(d.getMonth());
      }
      setLastImportIds(importedIds);
      setImportMessage({
        tone: lastDate ? "good" : "danger",
        lines,
      });
    } catch (e) {
      setImportMessage({
        tone: "danger",
        lines: [e instanceof Error ? e.message : "Import failed."],
      });
    } finally {
      setImporting(false);
      setImportProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const cells = useMemo(() => monthGrid(year, month), [year, month]);

  // Each mesocycle gets its own accent; shown as the chip's left edge.
  const colorByMeso = useMemo(
    () => new Map(mesocycles.map((m) => [m.id, mesoColor(m)])),
    [mesocycles]
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      map.set(w.date, [...(map.get(w.date) ?? []), w]);
    }
    return map;
  }, [workouts]);

  const today = isoDate(now);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const inMonth = workouts.filter((w) => w.date.startsWith(prefix));
    return {
      completed: inMonth.filter((w) => w.status === "completed").length,
      planned: inMonth.filter((w) => w.status === "planned").length,
    };
  }, [workouts, year, month]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Calendar"
        description="Your training month at a glance."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) handleImportFiles(files);
              }}
            />
            <Button
              variant="secondary"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? importProgress || "Reading…" : "📷 Import from photos"}
            </Button>
            {confirmReset ? (
              <>
                <Button
                  variant="danger"
                  onClick={() => {
                    clearWorkouts();
                    setConfirmReset(false);
                  }}
                >
                  Delete all workouts
                </Button>
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => setConfirmReset(true)}>
                Reset calendar
              </Button>
            )}
            <LinkButton href="/workouts/new" variant="primary">
              + New workout
            </LinkButton>
          </div>
        }
      />

      {importMessage && (
        <div
          className={cn(
            "mb-4 rounded-lg border px-4 py-3 text-sm",
            importMessage.tone === "good"
              ? "border-good/40 bg-good-soft text-good"
              : "border-danger/40 bg-danger-soft text-danger"
          )}
        >
          <ul className="space-y-1">
            {importMessage.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {lastImportIds.length > 0 && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  lastImportIds.forEach(deleteWorkout);
                  setLastImportIds([]);
                  setImportMessage(null);
                }}
              >
                Undo this import ({lastImportIds.length})
              </Button>
            </div>
          )}
        </div>
      )}

      <Card className="p-0">
        {/* Month header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              ←
            </Button>
            <Button size="sm" onClick={() => shiftMonth(1)} aria-label="Next month">
              →
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth());
              }}
            >
              Today
            </Button>
            <h2 className="ml-2 text-base font-semibold">{monthLabel}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge tone="good">{monthStats.completed} completed</Badge>
            <Badge tone="info">{monthStats.planned} planned</Badge>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid -->  mobile: compact rows; desktop: tall cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayWorkouts = byDate.get(cell.date) ?? [];
            const isToday = cell.date === today;
            return (
              <div
                key={cell.date}
                className={cn(
                  "group relative min-h-[64px] border-border p-1.5 sm:min-h-[96px] sm:p-2",
                  i % 7 !== 0 && "border-l",
                  i >= 7 && "border-t",
                  !cell.inMonth && "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "tnum mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday ? "bg-accent font-bold text-bg" : "text-text-secondary"
                  )}
                >
                  {cell.dayOfMonth}
                </div>
                <Link
                  href={`/workouts/new?date=${cell.date}`}
                  aria-label={`Plan workout on ${formatDate(cell.date)}`}
                  title={`Plan workout on ${formatDate(cell.date)}`}
                  className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full text-sm text-muted opacity-0 transition-opacity hover:bg-raised hover:text-text focus-visible:opacity-100 group-hover:opacity-100 sm:flex"
                >
                  +
                </Link>
                <div className="space-y-1">
                  {dayWorkouts.slice(0, 3).map((w) => {
                    const accent = w.mesocycleId ? colorByMeso.get(w.mesocycleId) : undefined;
                    return (
                      <div key={w.id} className="group/chip flex items-stretch gap-0.5">
                        <Link
                          href={`/workouts/${w.id}`}
                          title={`${w.name} — ${w.status}`}
                          className={cn(
                            "min-w-0 flex-1 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:brightness-125 sm:text-[11px]",
                            STATUS_STYLE[w.status]
                          )}
                          style={
                            accent
                              ? { borderLeftWidth: 3, borderLeftColor: accent }
                              : undefined
                          }
                        >
                          <span className="hidden sm:inline">{w.name}</span>
                          <span className="sm:hidden">{w.name.slice(0, 6)}</span>
                        </Link>
                        <Link
                          href={`/workouts/${w.id}/edit`}
                          aria-label={`Edit ${w.name}`}
                          title="Edit workout"
                          className="hidden w-4 items-center justify-center rounded text-[10px] text-muted opacity-0 transition-opacity hover:bg-overlay hover:text-text group-hover/chip:opacity-100 sm:flex"
                        >
                          ✎
                        </Link>
                      </div>
                    );
                  })}
                  {dayWorkouts.length > 3 && (
                    <div
                      className="px-1.5 text-[10px] font-medium text-muted"
                      title={dayWorkouts.slice(3).map((w) => w.name).join("\n")}
                    >
                      +{dayWorkouts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="mr-1">Legend:</span>
        <Badge tone="good">completed</Badge>
        <Badge tone="info">planned</Badge>
        <Badge tone="accent">in progress</Badge>
        <Badge tone="neutral">skipped</Badge>
      </div>
      {mesocycles.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>Mesocycles:</span>
          {mesocycles.map((m) => (
            <Link key={m.id} href={`/mesocycles/${m.id}`} className="flex items-center gap-1.5 hover:text-text">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorByMeso.get(m.id) }}
              />
              {m.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
