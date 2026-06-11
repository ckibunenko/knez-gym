import { Wordmark, LogoMark } from "@/components/icons/brand";
import {
  RirIcon,
  OverloadIcon,
  VolumeLandmarksIcon,
  RecoveryIcon,
  DeloadIcon,
  StrengthIcon,
  HypertrophyIcon,
  TrendIcon,
  ReadinessIcon,
} from "@/components/icons/training";
import {
  MesocycleIcon,
  WorkoutIcon,
  LibraryIcon,
  ProgressIcon,
} from "@/components/icons/navigation";
import { MuscleIcon } from "@/components/icons/muscles";
import { Badge, LinkButton } from "@/components/ui";

const METHOD = [
  {
    icon: <RirIcon size={22} />,
    title: "RIR-based effort",
    text: "Every set has a reps-in-reserve target. Effort ramps week to week — from comfortable to hard — so stimulus rises while technique holds.",
  },
  {
    icon: <VolumeLandmarksIcon size={22} />,
    title: "Volume landmarks",
    text: "Weekly sets per muscle are managed between your minimum effective and maximum recoverable volume, so every set you do actually earns something.",
  },
  {
    icon: <RecoveryIcon size={22} />,
    title: "Recovery-driven adjustment",
    text: "Pump, soreness, joint comfort, and performance feedback flow into next week's plan. Train harder when you're fresh, pull back before you stall.",
  },
  {
    icon: <TrendIcon size={22} />,
    title: "Strength & hypertrophy tracking",
    text: "Estimated 1RM trends for the big lifts, rep-quality and volume trends for size — both visible at a glance.",
  },
  {
    icon: <DeloadIcon size={22} />,
    title: "Deload logic",
    text: "When several fatigue signals fire at once, the system recommends a deload with a concrete volume cut, RIR target, and duration.",
  },
];

const FEATURES = [
  {
    icon: <MesocycleIcon size={20} />,
    title: "Mesocycle builder",
    text: "Plan 4-8 week blocks with custom splits, RIR progression, and per-muscle volume targets.",
  },
  {
    icon: <WorkoutIcon size={20} />,
    title: "Workout logger",
    text: "Fast set-by-set logging built for the gym floor: weight, reps, RIR, technique, pain flags.",
  },
  {
    icon: <ReadinessIcon size={20} />,
    title: "Adaptive volume recommendations",
    text: "Clear, explainable suggestions: add, hold, reduce, substitute, or deload — with reasons.",
  },
  {
    icon: <LibraryIcon size={20} />,
    title: "Exercise library",
    text: "Curated movements tagged by muscle, equipment, pattern, fatigue cost, and joint stress.",
  },
  {
    icon: <StrengthIcon size={20} />,
    title: "Strength analytics",
    text: "Estimated 1RM trends, PR detection, and load progression on every main lift.",
  },
  {
    icon: <HypertrophyIcon size={20} />,
    title: "Hypertrophy analytics",
    text: "Weekly volume vs landmarks, pump and soreness trends, muscle-group consistency.",
  },
];

function MockDashboard() {
  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-4 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Week 3 · Foundation Block
        </div>
        <Badge tone="accent">Accumulation</Badge>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-raised p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Readiness</div>
          <div className="tnum mt-1 text-xl font-bold text-good">82</div>
          <div className="mt-2 h-1.5 rounded-full bg-overlay">
            <div className="h-1.5 w-4/5 rounded-full bg-good" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-raised p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Bench e1RM</div>
          <div className="tnum mt-1 text-xl font-bold">121<span className="text-xs text-muted"> kg</span></div>
          <div className="mt-1 text-[10px] text-good">▲ +2.4% this block</div>
        </div>
        <div className="rounded-xl border border-border bg-raised p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Sets this week</div>
          <div className="tnum mt-1 text-xl font-bold text-accent">38<span className="text-xs text-muted"> / 64</span></div>
          <div className="mt-1 text-[10px] text-muted">2 sessions left</div>
        </div>
      </div>
      <div className="mt-3 space-y-2 rounded-xl border border-border bg-raised p-3">
        {(
          [
            ["chest", "Chest", 12, "good", "Productive"],
            ["back", "Back", 16, "warn", "Near MRV"],
            ["quads", "Quads", 9, "good", "Productive"],
          ] as const
        ).map(([muscle, label, sets, tone, zone]) => (
          <div key={muscle} className="flex items-center gap-3">
            <span className="text-text-secondary">
              <MuscleIcon muscle={muscle} size={18} />
            </span>
            <span className="w-14 text-xs text-text-secondary">{label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-overlay">
              <div
                className={`h-1.5 rounded-full ${tone === "good" ? "bg-good" : "bg-warn"}`}
                style={{ width: `${(sets / 20) * 100}%` }}
              />
            </div>
            <span className="tnum text-xs text-muted">{sets} sets</span>
            <Badge tone={tone === "good" ? "good" : "warn"} className="hidden sm:inline-flex">
              {zone}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <LinkButton href="/dashboard" variant="primary">
          Open Dashboard
        </LinkButton>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-14 md:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(closest-side, #e3b341, transparent)" }}
        />
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <LogoMark size={44} />
              <Badge tone="accent">Evidence-based · Autoregulated</Badge>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Train hard.
              <br />
              <span className="text-accent">Recover smarter.</span>
              <br />
              Progress on purpose.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-text-secondary">
              An adaptive strength and hypertrophy system built on RIR-based
              effort, volume landmarks, and fatigue-managed progression. Plan
              mesocycles, log every set, and let your own feedback steer next
              week&apos;s plan.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <LinkButton href="/dashboard" variant="primary" size="lg">
                Open Dashboard
              </LinkButton>
              <a
                href="#method"
                className="text-sm font-medium text-text-secondary hover:text-text"
              >
                How it works ↓
              </a>
            </div>
          </div>
          <MockDashboard />
        </div>
      </section>

      {/* Method */}
      <section id="method" className="border-t border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">The method</h2>
          <p className="mt-2 max-w-xl text-sm text-text-secondary">
            Public, well-established training science — turned into a system
            that adjusts itself around your recovery.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {METHOD.map((m) => (
              <div key={m.title} className="rounded-card border border-border bg-surface p-5">
                <div className="mb-3 inline-flex rounded-lg bg-accent-soft p-2 text-accent">
                  {m.icon}
                </div>
                <h3 className="font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{m.text}</p>
              </div>
            ))}
            <div className="rounded-card border border-accent/30 bg-accent-soft p-5">
              <div className="mb-3 inline-flex rounded-lg bg-accent/20 p-2 text-accent">
                <OverloadIcon size={22} />
              </div>
              <h3 className="font-semibold text-accent">Progressive overload, autoregulated</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Load goes up when you earn it, volume rises while you recover
                from it, and the system tells you which lever to pull next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Everything a serious block needs
          </h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-border bg-raised p-2 text-accent">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview band */}
      <section className="border-y border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Your training, as data you can act on
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary">
            Readiness, per-muscle volume status, estimated 1RM trends, and one
            clear recommended action — every time you open the app.
          </p>
          <div className="mx-auto mt-10 max-w-3xl">
            <MockDashboard />
          </div>
          <LinkButton
            href="/dashboard"
            variant="primary"
            size="lg"
            className="mt-10 px-8"
          >
            Open Dashboard
          </LinkButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <LogoMark size={24} />
            <span className="text-sm text-text-secondary">
              KNEZ PUMP — adaptive strength &amp; hypertrophy
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <ProgressIcon size={14} />
            Single-user · All data stays on your device
          </div>
        </div>
        <p className="mt-8 max-w-2xl text-[11px] leading-relaxed text-muted">
          This app provides training organization and educational guidance
          only. It is not medical advice. Adjust training based on your health
          status and consult a qualified professional when needed.
        </p>
      </footer>
    </div>
  );
}
