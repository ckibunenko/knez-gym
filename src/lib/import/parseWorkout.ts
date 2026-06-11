import type {
  Equipment,
  ExercisePrescription,
  LoggedSet,
  MuscleGroupId,
  Workout,
} from "@/lib/types";
import { EXERCISES } from "@/lib/data/exercises";
import { uid, isoDate } from "@/lib/utils";

// Parses OCR text from workout-app screenshots: a "WEEK x DAY y" header,
// a date badge, muscle-group chips, exercise titles with an equipment
// subtitle, and weight/reps set rows.

export interface ParsedSet {
  weight: number;
  reps: number;
}

export interface ParsedExercise {
  rawName: string;
  muscleHint?: MuscleGroupId;
  equipmentHint?: Equipment;
  sets: ParsedSet[];
}

export interface ParsedWorkout {
  name: string;
  date: string | null;
  exercises: ParsedExercise[];
}

const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const MUSCLE_CHIPS: Record<string, MuscleGroupId> = {
  BACK: "back",
  CHEST: "chest",
  BICEPS: "biceps",
  TRICEPS: "triceps",
  SHOULDERS: "shoulders",
  HAMSTRINGS: "hamstrings",
  QUADS: "quads",
  GLUTES: "glutes",
  CALVES: "calves",
  ABS: "abs",
  FOREARMS: "forearms",
  TRAPS: "traps",
  "LOWER BACK": "lowerBack",
};

const WEEKDAYS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
// Whole line is just an equipment label ("Cable", "Machine") — names like
// "Cable Flexion Row" must NOT match.
const EQUIPMENT_LINE = /^(cable|dumbbell|machine|barbell|bodyweight|band|smith machine|kettlebell)s?$/i;
const BODYWEIGHT_LINE = /^bodyweight\b|\b\d+(\.\d+)?\s*kg\b/i;
const TABLE_HEADER = /\b(weight|reps|log)\b/i;
// "MAR 14, 2026" and OCR-mangled variants; also day-first "14 MAR 2026".
// No trailing \b: OCR often glues the badge checkmark to the year ("2026v").
const DATE_RE = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?,?\s*(\d{1,2})[,.]?\s*(\d{4})/i;
const DATE_RE_DAY_FIRST = /\b(\d{1,2})[,.]?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?,?\s*(\d{4})/i;
// At low resolution OCR fuses a tiny "11"/"1" day into vertical-stroke
// letters: "APR NM, 2026". Only days 1 and 11 render as pure strokes.
const STROKE_DAY_RE = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\.?\s+([ILMNUH]{1,3})[,.]?\s*(\d{4})/i;

/** Map an equipment subtitle line to a library equipment value. */
function equipmentFromLine(line: string): Equipment | undefined {
  const l = line.toLowerCase();
  if (l.startsWith("bodyweight")) return "bodyweight";
  if (l.includes("smith machine") || l.startsWith("machine")) return "machine";
  if (l.startsWith("cable")) return "cable";
  if (l.startsWith("dumbbell") || l.startsWith("kettlebell")) return "dumbbell";
  if (l.startsWith("barbell")) return "barbell";
  return undefined;
}

function buildIso(month: number, day: number, year: number): string | null {
  if (!month || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Pull a calendar date out of OCR text; exported for the badge-strip OCR pass. */
export function extractDate(text: string): string | null {
  const m = text.match(DATE_RE);
  if (m) {
    const iso = buildIso(MONTHS[m[1].toUpperCase().slice(0, 3)], Number(m[2]), Number(m[3]));
    if (iso) return iso;
  }
  const d = text.match(DATE_RE_DAY_FIRST);
  if (d) {
    const iso = buildIso(MONTHS[d[2].toUpperCase().slice(0, 3)], Number(d[1]), Number(d[3]));
    if (iso) return iso;
  }
  const s = text.match(STROKE_DAY_RE);
  if (s) {
    const day = /^[IL]$/i.test(s[2]) ? 1 : 11;
    return buildIso(MONTHS[s[1].toUpperCase().slice(0, 3)], day, Number(s[3]));
  }
  return null;
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

/** Numbers in a line that has no real words (set rows like "25 30"). */
function numericTokens(line: string): number[] | null {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.some((t) => /[a-z]{3,}/i.test(t))) return null;
  const nums = tokens
    .filter((t) => /^[\d.,]+$/.test(t))
    .map((t) => Number(t.replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 999);
  return nums.length > 0 ? nums : null;
}

export function parseWorkoutText(text: string): ParsedWorkout {
  const lines = text.split("\n").map(cleanLine).filter(Boolean);

  let name = "Imported workout";
  let planName = "";
  const date = extractDate(text);
  const exercises: ParsedExercise[] = [];

  let currentMuscle: MuscleGroupId | undefined;
  let current: (ParsedExercise & { pending: number[]; bodyweight?: number }) | null = null;

  function flush() {
    if (current) {
      // An odd leftover number with a known bodyweight is a bodyweight set.
      if (current.pending.length === 1 && current.bodyweight) {
        current.sets.push({ weight: current.bodyweight, reps: current.pending[0] });
      }
      if (current.sets.length > 0) {
        exercises.push({
          rawName: current.rawName,
          muscleHint: current.muscleHint,
          equipmentHint: current.equipmentHint,
          sets: current.sets,
        });
      }
    }
    current = null;
  }

  for (const line of lines) {
    // Workout title
    const week = line.match(/^week\s*(\d+)\s*[·\-—]?\s*day\s*(\d+)/i);
    if (week) {
      name = `Week ${week[1]} · Day ${week[2]}`;
      continue;
    }
    if (WEEKDAYS.test(line) && line.length < 40) {
      // "Wednesday · Sesti po redu" — the tail is the plan name, useful
      // for telling identical week/day numbers from different plans apart.
      const tail = line.replace(WEEKDAYS, "").replace(/^[\s·•\-—.,:+*]+/, "").trim();
      if (tail.length > 2 && !planName) planName = tail;
      continue;
    }
    if ((DATE_RE.test(line) || DATE_RE_DAY_FIRST.test(line)) && line.length < 30) continue;

    // Muscle-group chip — also a section boundary: a pending exercise
    // without sets (skipped/no program) must not merge into what follows.
    const chipKey = line.toUpperCase().replace(/[^A-Z ]/g, "").trim();
    if (MUSCLE_CHIPS[chipKey]) {
      flush();
      currentMuscle = MUSCLE_CHIPS[chipKey];
      continue;
    }

    // Table header rows
    if (TABLE_HEADER.test(line) && line.length < 40) continue;

    // Skipped sets show "n/a" reps — drop the whole row so its weight
    // can't pair with a number from the next line.
    if (/\bn\s*\/\s*a\b/i.test(line)) continue;

    // In-app notice, not an exercise title.
    if (/no sets programmed/i.test(line)) continue;

    // Equipment subtitle (may carry the bodyweight value)
    if (EQUIPMENT_LINE.test(line) || line.includes("@") || BODYWEIGHT_LINE.test(line)) {
      if (current) {
        const bw = line.match(/@?\s*([\d.]+)\s*kg/i);
        if (bw) current.bodyweight = Number(bw[1]);
        current.equipmentHint = equipmentFromLine(line) ?? current.equipmentHint;
      }
      continue;
    }

    // Set row
    const nums = numericTokens(line);
    if (nums) {
      if (!current) continue;
      current.pending.push(...nums);
      while (current.pending.length >= 2) {
        const weight = current.pending.shift()!;
        const reps = current.pending.shift()!;
        if (reps >= 1 && reps <= 100 && weight <= 500) {
          current.sets.push({ weight, reps });
        }
      }
      continue;
    }

    // Anything else with letters: a new exercise title (or a wrapped one).
    // Merge only while the previous title is still incomplete — once its
    // equipment subtitle was seen, a new title means a new exercise (the
    // previous one simply logged no sets).
    const title = line.replace(/^[^a-zA-Z(]+|[^a-zA-Z)]+$/g, "");
    if (title.length < 3) continue;
    if (
      current &&
      current.sets.length === 0 &&
      current.pending.length === 0 &&
      !current.equipmentHint &&
      !current.bodyweight
    ) {
      current.rawName = `${current.rawName} ${title}`;
      continue;
    }
    flush();
    current = { rawName: title, muscleHint: currentMuscle, sets: [], pending: [] };
  }
  flush();

  return { name: planName ? `${name} · ${planName}` : name, date, exercises };
}

// ── Exercise matching ───────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** App-specific names → library ids, checked before fuzzy matching. */
const SYNONYMS: Record<string, string> = {
  "pulldown narrow grip": "pulldown-narrow-grip",
  "pulldown normal grip": "pulldown-normal-grip",
  "pulldown": "pulldown-normal-grip",
  "push up": "pushup",
  "dumbbell curl": "dumbbell-curl-2-arm",
  "back raise": "back-raise-45-degree",
  "bench press incline medium grip": "bench-press-incline-medium-grip",
  "incline bench press": "bench-press-incline-medium-grip",
  "bench press wide grip": "bench-press-wide-grip",
  "bench press": "bench-press-wide-grip",
  "cable overhead triceps extension rope": "cable-overhead-triceps-extension-rope",
  "cable triceps pushdown bar": "cable-triceps-pushdown-bar",
  "cable triceps pushdown rope": "cable-triceps-pushdown-rope",
  "pulldown underhand grip": "pulldown-underhand-grip",
  "dip machine": "dip-machine",
  "machine dip": "dip-machine",
  "machine hip thrust": "machine-hip-thrust",
  "dumbbell preacher curl single arm": "dumbbell-preacher-curl-single-arm",
  "front raise": "cable-front-raise-underhand",
  "dumbbell row": "dumbbell-row-2-arm",
  "lat pulldown": "pulldown-normal-grip",
  "seated cable row": "cable-flexion-row",
  "face pull": "cable-rope-facepull",
  "facepull": "cable-rope-facepull",
  "chinup": "chin-up",
  "pullup": "pull-up",
  "deadlift": "deadlift",
  "rdl": "romanian-deadlift",
  "ohp": "overhead-press",
};

function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length > 1));
}

/**
 * Map a raw exercise name from the image to a library exercise id.
 * Returns null when nothing matches confidently. The muscle chip and
 * equipment subtitle from the screenshot disambiguate near-identical
 * names (e.g. barbell vs dumbbell Romanian Deadlift).
 */
export function matchExerciseId(
  rawName: string,
  muscleHint?: MuscleGroupId,
  equipmentHint?: Equipment
): string | null {
  const norm = normalize(rawName);
  if (SYNONYMS[norm]) return SYNONYMS[norm];

  const tokens = tokenSet(rawName);
  let bestId: string | null = null;
  let bestScore = 0;
  for (const ex of EXERCISES) {
    const exTokens = tokenSet(ex.name);
    let overlap = 0;
    for (const t of tokens) if (exTokens.has(t)) overlap += 1;
    const union = new Set([...tokens, ...exTokens]).size;
    let score = union > 0 ? overlap / union : 0;
    const exNorm = normalize(ex.name);
    if (norm.includes(exNorm) || exNorm.includes(norm)) score += 0.3;
    if (muscleHint && ex.primaryMuscle === muscleHint) score += 0.1;
    if (equipmentHint) score += ex.equipment === equipmentHint ? 0.2 : -0.2;
    if (score > bestScore) {
      bestScore = score;
      bestId = ex.id;
    }
  }
  if (bestScore >= 0.45) return bestId;

  // Last resort: synonym keys as substrings ("pushup" inside an
  // OCR-mangled "pushup wide grip xx"). After fuzzy so that a key like
  // "deadlift" can't hijack names fuzzy already resolves better.
  for (const [key, id] of Object.entries(SYNONYMS)) {
    if (norm.includes(key)) return id;
  }
  return null;
}

// ── Workout assembly ────────────────────────────────────────────────

export interface ImportResult {
  workout: Workout;
  matched: number;
  skipped: string[];
}

/** Build a completed Workout from a parsed screenshot. */
export function buildWorkoutFromParsed(parsed: ParsedWorkout): ImportResult {
  const prescriptions: ExercisePrescription[] = [];
  const loggedSets: LoggedSet[] = [];
  const skipped: string[] = [];

  for (const ex of parsed.exercises) {
    const exerciseId = matchExerciseId(ex.rawName, ex.muscleHint, ex.equipmentHint);
    if (!exerciseId) {
      skipped.push(ex.rawName);
      continue;
    }
    const reps = ex.sets.map((s) => s.reps);
    prescriptions.push({
      id: uid("presc"),
      exerciseId,
      targetSets: ex.sets.length,
      targetRepMin: Math.min(...reps),
      targetRepMax: Math.max(...reps),
      targetRir: 2,
      targetLoad: ex.sets[0]?.weight || undefined,
      restSeconds: 120,
      goalType: "hypertrophy",
      notes: `Imported as "${ex.rawName}"`,
    });
    ex.sets.forEach((s, i) =>
      loggedSets.push({
        id: uid("set"),
        exerciseId,
        setNumber: i + 1,
        weight: s.weight,
        reps: s.reps,
        rir: 2,
        completed: true,
        skipped: false,
        painFlag: false,
        techniqueQuality: "good",
      })
    );
  }

  return {
    workout: {
      id: uid("workout"),
      name: parsed.name,
      date: parsed.date ?? isoDate(new Date()),
      focus: "Imported from photo",
      prescriptions,
      loggedSets,
      exerciseFeedback: [],
      status: "completed",
    },
    matched: prescriptions.length,
    skipped,
  };
}
