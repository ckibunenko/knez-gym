# Apex Train

A single-user, evidence-based strength and hypertrophy training web app:
RIR-driven progression, per-muscle volume landmarks (MV / MEV / MAV / MRV),
mesocycle planning, fast workout logging, and an explainable rule-based
recommendation engine.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm test         # vitest — unit tests for the training logic
npm run typecheck
npm run build && npm start
```

## Stack

- **Next.js 15 (App Router) + TypeScript** — type-safe, fast to extend
- **Tailwind CSS v4** — custom dark design system (gold accent, semantic zone colors)
- **Zustand + localStorage persistence** — single-user, no backend; swap the
  store layer for Supabase later without touching the UI
- **Recharts** — progress analytics
- **Vitest** — tests for the pure training-logic functions
- Custom SVG icon system (navigation, training concepts, muscle groups,
  equipment, feedback states) built on one shared 24px/1.75-stroke grammar

## Where things live

```
src/lib/types.ts           # domain model (mesocycles, workouts, sets, feedback)
src/lib/logic/             # pure, tested training logic
  volumeAdjustment.ts      #   weekly set recommendations per muscle
  deload.ts                #   multi-signal deload detection
  hypertrophyProgression.ts#   double progression (reps → load)
  strengthProgression.ts   #   linear progression with failure handling
  oneRepMax.ts             #   Epley e1RM (trend tracking)
  analytics.ts             #   volume zones, e1RM history, PRs, readiness
  engine.ts                #   glue: runs the rules against live data
src/lib/data/              # exercise library, default landmarks, seed data
src/lib/store.ts           # persisted Zustand store
src/components/icons/      # custom icon system + logo
src/components/ui/         # design-system primitives
src/app/                   # routes: /, /dashboard, /mesocycles[...], /workouts[...],
                           # /exercises, /progress, /settings
```

## Data

Everything is stored in the browser (`localStorage`, key `apex-train-store`).
The app seeds itself with a realistic in-progress hybrid mesocycle so every
screen is useful on first open. Settings → "Reset all data" restores the seed.

---

*This app provides training organization and educational guidance only. It is
not medical advice.*
