"use client";

import { useRef, useState } from "react";
import { useHydrated, useTrainingStore, type ExportedData } from "@/lib/store";
import { formatDate, isoDate } from "@/lib/utils";
import type { ExperienceLevel, Goal, Units, VolumeLandmarks } from "@/lib/types";
import {
  Button,
  Card,
  CardTitle,
  Input,
  Label,
  NumberInput,
  PageHeader,
  PageSkeleton,
  Select,
} from "@/components/ui";
import { MuscleIcon } from "@/components/icons/muscles";
import { SettingsIcon } from "@/components/icons/navigation";
import { VolumeLandmarksIcon } from "@/components/icons/training";

interface BackupFile {
  /** "apex-train" is the pre-rebrand name; old backups stay importable. */
  app: "knez-pump" | "apex-train";
  version: 1;
  exportedAt: string;
  data: ExportedData;
}

/** Parses and shape-checks a backup file; returns null when it isn't one. */
function parseBackup(text: string): BackupFile | null {
  try {
    const obj = JSON.parse(text);
    if (
      (obj?.app !== "knez-pump" && obj?.app !== "apex-train") ||
      typeof obj.data !== "object" ||
      obj.data === null ||
      typeof obj.data.profile !== "object" ||
      !Array.isArray(obj.data.muscleGroups) ||
      !Array.isArray(obj.data.mesocycles) ||
      !Array.isArray(obj.data.workouts) ||
      !Array.isArray(obj.data.recommendations)
    ) {
      return null;
    }
    return obj as BackupFile;
  } catch {
    return null;
  }
}

export default function SettingsPage() {
  const hydrated = useHydrated();
  const profile = useTrainingStore((s) => s.profile);
  const muscleGroups = useTrainingStore((s) => s.muscleGroups);
  const updateProfile = useTrainingStore((s) => s.updateProfile);
  const updateLandmarks = useTrainingStore((s) => s.updateLandmarks);
  const resetAllData = useTrainingStore((s) => s.resetAllData);
  const loadExampleData = useTrainingStore((s) => s.loadExampleData);
  const workoutCount = useTrainingStore((s) => s.workouts.length);
  const importData = useTrainingStore((s) => s.importData);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null);
  const [importError, setImportError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hydrated) return <PageSkeleton />;

  function exportData() {
    const { profile, muscleGroups, mesocycles, workouts, recommendations } =
      useTrainingStore.getState();
    const backup: BackupFile = {
      app: "knez-pump",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { profile, muscleGroups, mesocycles, workouts, recommendations },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `knez-pump-backup-${isoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return;
    const backup = parseBackup(await file.text());
    setImportError(!backup);
    setPendingImport(backup);
    // Allow re-selecting the same file after cancel.
    if (fileRef.current) fileRef.current.value = "";
  }

  function patchLandmark(
    muscleId: (typeof muscleGroups)[number]["id"],
    current: VolumeLandmarks,
    key: keyof VolumeLandmarks,
    value: number
  ) {
    updateLandmarks(muscleId, { ...current, [key]: value });
  }

  return (
    <div className="animate-fade-up max-w-3xl space-y-5">
      <PageHeader title="Settings" description="Profile, units, and volume landmarks." />

      <Card>
        <CardTitle icon={<SettingsIcon size={16} />}>Profile</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </div>
          <div>
            <Label>Training experience</Label>
            <Select
              value={profile.trainingExperience}
              onChange={(e) =>
                updateProfile({ trainingExperience: e.target.value as ExperienceLevel })
              }
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>
          <div>
            <Label>Height ({profile.preferredUnits === "metric" ? "cm" : "in"})</Label>
            <NumberInput
              value={profile.height}
              onCommit={(v) => updateProfile({ height: Math.round(v) })}
            />
          </div>
          <div>
            <Label>Body weight ({profile.preferredUnits === "metric" ? "kg" : "lb"})</Label>
            <NumberInput
              value={profile.bodyWeight}
              onCommit={(v) => updateProfile({ bodyWeight: v })}
            />
          </div>
          <div>
            <Label>Units</Label>
            <Select
              value={profile.preferredUnits}
              onChange={(e) => updateProfile({ preferredUnits: e.target.value as Units })}
            >
              <option value="metric">Metric (kg, cm)</option>
              <option value="imperial">Imperial (lb, in)</option>
            </Select>
          </div>
          <div>
            <Label>Default goal</Label>
            <Select
              value={profile.defaultGoal}
              onChange={(e) => updateProfile({ defaultGoal: e.target.value as Goal })}
            >
              <option value="hypertrophy">Hypertrophy</option>
              <option value="strength">Strength</option>
              <option value="hybrid">Hybrid</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle icon={<VolumeLandmarksIcon size={16} />}>
          Volume landmarks (weekly sets)
        </CardTitle>
        <p className="mb-4 text-xs leading-relaxed text-muted">
          MV: maintenance · MEV: minimum effective · MAV: maximum adaptive ·
          MRV: maximum recoverable. The recommendation engine keeps each muscle
          between MEV and MRV and treats MAV as the productive ceiling.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-2 font-medium">Muscle</th>
                <th className="pb-2 font-medium">MV</th>
                <th className="pb-2 font-medium">MEV</th>
                <th className="pb-2 font-medium">MAV</th>
                <th className="pb-2 font-medium">MRV</th>
              </tr>
            </thead>
            <tbody>
              {muscleGroups.map((mg) => (
                <tr key={mg.id} className="border-t border-border">
                  <td className="flex items-center gap-2 py-2 pr-4">
                    <MuscleIcon muscle={mg.id} size={16} className="text-text-secondary" />
                    {mg.name}
                  </td>
                  {(["mv", "mev", "mav", "mrv"] as const).map((key) => (
                    <td key={key} className="py-2 pr-3">
                      <NumberInput
                        className="w-16 px-2 py-1 text-center"
                        value={mg.landmarks[key]}
                        onCommit={(v) =>
                          patchLandmark(mg.id, mg.landmarks, key, Math.round(v))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle>Data</CardTitle>
        <p className="mb-3 text-sm text-text-secondary">
          All data lives in this browser&apos;s local storage. Export a JSON
          backup regularly — importing one replaces everything currently here.
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={exportData}>
            Export backup (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import backup…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import backup file"
            onChange={(e) => onImportFile(e.target.files?.[0])}
          />
        </div>
        {importError && (
          <p className="mb-4 text-sm text-danger">
            That file is not a KNEZ PUMP backup.
          </p>
        )}
        {pendingImport && (
          <div className="mb-4 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm">
            <p className="text-text-secondary">
              Backup from {formatDate(pendingImport.exportedAt.slice(0, 10))} ·{" "}
              {pendingImport.data.workouts.length} workouts,{" "}
              {pendingImport.data.mesocycles.length} mesocycles. Importing
              replaces all current data.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  importData(pendingImport.data);
                  setPendingImport(null);
                }}
              >
                Replace & import
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPendingImport(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <p className="mb-3 text-sm text-text-secondary">
          Resetting erases everything and starts blank. Example data loads a
          demo block to explore the app — it also replaces what is here now.
        </p>
        {confirmReset ? (
          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              onClick={() => {
                resetAllData();
                setConfirmReset(false);
              }}
            >
              Yes, erase everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              Reset all data
            </Button>
            {workoutCount === 0 && (
              <Button variant="ghost" onClick={loadExampleData}>
                Load example data
              </Button>
            )}
          </div>
        )}
      </Card>

      <p className="pb-8 text-[11px] leading-relaxed text-muted">
        This app provides training organization and educational guidance only.
        It is not medical advice. Adjust training based on your health status
        and consult a qualified professional when needed.
      </p>
    </div>
  );
}
