"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  ExerciseFeedback,
  LoggedSet,
  Mesocycle,
  MuscleGroup,
  Recommendation,
  UserProfile,
  VolumeLandmarks,
  Workout,
  WorkoutFeedback,
  MuscleGroupId,
} from "@/lib/types";
import { buildSeedState } from "@/lib/data/seed";
import { defaultMuscleGroups } from "@/lib/data/defaults";
import { getActiveProfile } from "@/lib/profiles";
import { uid } from "@/lib/utils";

/** The five persisted data slices — the shape of a JSON backup. */
export interface ExportedData {
  profile: UserProfile;
  muscleGroups: MuscleGroup[];
  mesocycles: Mesocycle[];
  workouts: Workout[];
  recommendations: Recommendation[];
}

interface TrainingState extends ExportedData {
  // Profile / settings
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateLandmarks: (muscle: MuscleGroupId, landmarks: VolumeLandmarks) => void;
  resetAllData: () => void;
  loadExampleData: () => void;
  /** Replaces all data with a backup. Caller is responsible for confirming. */
  importData: (data: ExportedData) => void;

  // Mesocycles
  addMesocycle: (meso: Mesocycle) => void;
  updateMesocycle: (id: string, patch: Partial<Mesocycle>) => void;
  deleteMesocycle: (id: string) => void;
  setActiveMesocycle: (id: string) => void;

  // Workouts
  addWorkout: (workout: Workout) => void;
  clearWorkouts: () => void;
  updateWorkout: (id: string, patch: Partial<Workout>) => void;
  deleteWorkout: (id: string) => void;
  logSet: (workoutId: string, set: Omit<LoggedSet, "id">) => void;
  updateSet: (workoutId: string, setId: string, patch: Partial<LoggedSet>) => void;
  removeSet: (workoutId: string, setId: string) => void;
  saveExerciseFeedback: (workoutId: string, feedback: ExerciseFeedback) => void;
  saveWorkoutFeedback: (workoutId: string, feedback: WorkoutFeedback) => void;
  completeWorkout: (workoutId: string) => void;

  // Recommendations
  addRecommendations: (recs: Recommendation[]) => void;
  dismissRecommendation: (id: string) => void;
}

// Demo data lives behind an explicit "Load example data" action; a fresh
// install starts empty so analytics and PRs only ever reflect real training.
function seeded(): ExportedData {
  const seed = buildSeedState();
  return {
    profile: seed.profile,
    muscleGroups: defaultMuscleGroups(),
    mesocycles: seed.mesocycles,
    workouts: seed.workouts,
    recommendations: seed.recommendations,
  };
}

function empty(): ExportedData {
  const active = getActiveProfile();
  return {
    profile: {
      id: active,
      name: active === "milana" ? "Milana" : "Aleksandar",
      bodyWeight: 0,
      height: 0,
      trainingExperience: "intermediate",
      preferredUnits: "metric",
      defaultGoal: "hybrid",
    },
    muscleGroups: defaultMuscleGroups(),
    mesocycles: [],
    workouts: [],
    recommendations: [],
  };
}

// --- IndexedDB persistence ---------------------------------------------
// localStorage caps at ~5 MB and writes synchronously on the main thread;
// IndexedDB does neither. Existing localStorage data migrates over on the
// first read and the old key is left in place as a one-time fallback.
// NOTE: must be defined before the store — createJSONStorage resolves its
// getter eagerly when the store is created.

const LEGACY_KEY = "apex-train-store";

// Aleksandar keeps the original unscoped key (his pre-profiles data lives
// there); every other profile gets its own suffixed key and no legacy
// localStorage fallback.
function scopedKey(name: string): string {
  const active = getActiveProfile();
  return active === "aleksandar" ? name : `${name}:${active}`;
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    const open = indexedDB.open("knez-pump", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("kv");
    dbPromise = idbRequest(open as IDBRequest<IDBDatabase>);
  }
  return dbPromise;
}

const idbStorage: StateStorage = {
  async getItem(name) {
    if (typeof indexedDB === "undefined") return null;
    const key = scopedKey(name);
    try {
      const db = await openDb();
      const stored = await idbRequest<string | undefined>(
        db.transaction("kv").objectStore("kv").get(key)
      );
      if (stored !== undefined) return stored;
      if (key !== name) return null; // scoped profiles start fresh
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy !== null) await idbStorage.setItem(name, legacy);
      return legacy;
    } catch {
      // IndexedDB unavailable (private mode etc.) — fall back to localStorage.
      return key === name ? localStorage.getItem(LEGACY_KEY) : null;
    }
  },
  async setItem(name, value) {
    if (typeof indexedDB === "undefined") return;
    const key = scopedKey(name);
    try {
      const db = await openDb();
      await idbRequest(
        db.transaction("kv", "readwrite").objectStore("kv").put(value, key)
      );
    } catch {
      localStorage.setItem(key, value);
    }
  },
  async removeItem(name) {
    if (typeof indexedDB === "undefined") return;
    const key = scopedKey(name);
    try {
      const db = await openDb();
      await idbRequest(
        db.transaction("kv", "readwrite").objectStore("kv").delete(key)
      );
    } catch {
      localStorage.removeItem(key);
    }
  },
};

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      ...empty(),

      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      updateLandmarks: (muscle, landmarks) =>
        set((s) => ({
          muscleGroups: s.muscleGroups.map((m) =>
            m.id === muscle ? { ...m, landmarks } : m
          ),
        })),

      resetAllData: () => set(() => empty()),

      loadExampleData: () => set(() => seeded()),

      importData: (data) => set(() => data),

      addMesocycle: (meso) =>
        set((s) => ({
          mesocycles: [
            ...s.mesocycles.map((m) =>
              meso.status === "active" && m.status === "active"
                ? { ...m, status: "completed" as const }
                : m
            ),
            meso,
          ],
        })),

      updateMesocycle: (id, patch) =>
        set((s) => ({
          mesocycles: s.mesocycles.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        })),

      deleteMesocycle: (id) =>
        set((s) => ({
          mesocycles: s.mesocycles.filter((m) => m.id !== id),
          workouts: s.workouts.filter((w) => w.mesocycleId !== id),
        })),

      setActiveMesocycle: (id) =>
        set((s) => ({
          mesocycles: s.mesocycles.map((m) =>
            m.id === id
              ? { ...m, status: "active" as const }
              : m.status === "active"
                ? { ...m, status: "completed" as const }
                : m
          ),
        })),

      addWorkout: (workout) =>
        set((s) => ({ workouts: [...s.workouts, workout] })),

      clearWorkouts: () => set(() => ({ workouts: [] })),

      updateWorkout: (id, patch) =>
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),

      deleteWorkout: (id) =>
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      logSet: (workoutId, newSet) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  status: w.status === "planned" ? "inProgress" : w.status,
                  loggedSets: [...w.loggedSets, { ...newSet, id: uid("set") }],
                }
              : w
          ),
        })),

      updateSet: (workoutId, setId, patch) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  loggedSets: w.loggedSets.map((ls) =>
                    ls.id === setId ? { ...ls, ...patch } : ls
                  ),
                }
              : w
          ),
        })),

      removeSet: (workoutId, setId) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId
              ? { ...w, loggedSets: w.loggedSets.filter((ls) => ls.id !== setId) }
              : w
          ),
        })),

      saveExerciseFeedback: (workoutId, feedback) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId
              ? {
                  ...w,
                  exerciseFeedback: [
                    ...w.exerciseFeedback.filter(
                      (f) => f.exerciseId !== feedback.exerciseId
                    ),
                    feedback,
                  ],
                }
              : w
          ),
        })),

      saveWorkoutFeedback: (workoutId, feedback) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId ? { ...w, workoutFeedback: feedback } : w
          ),
        })),

      completeWorkout: (workoutId) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === workoutId ? { ...w, status: "completed" as const } : w
          ),
        })),

      addRecommendations: (recs) =>
        set((s) => ({ recommendations: [...recs, ...s.recommendations] })),

      dismissRecommendation: (id) =>
        set((s) => ({
          recommendations: s.recommendations.map((r) =>
            r.id === id ? { ...r, dismissed: true } : r
          ),
        })),
    }),
    {
      name: "apex-train-store",
      storage: createJSONStorage(() => idbStorage),
    }
  )
);

/**
 * SSR-safe gate: false until the store has actually rehydrated from
 * IndexedDB (async, unlike localStorage), so pages never render with the
 * empty initial state and mistake it for "no data".
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const p = useTrainingStore.persist;
    // No persist API means storage failed to initialize — don't brick the UI.
    if (!p || p.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return p.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

export function useActiveMesocycle(): Mesocycle | undefined {
  return useTrainingStore((s) =>
    s.mesocycles.find((m) => m.status === "active")
  );
}
