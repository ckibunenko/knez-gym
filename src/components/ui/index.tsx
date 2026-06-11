"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { VolumeZone } from "@/lib/logic/analytics";
import { VOLUME_ZONE_LABELS } from "@/lib/logic/analytics";
import { MUSCLE_COLORS, MUSCLE_LABELS, type MuscleGroupId } from "@/lib/types";
import { MuscleIcon } from "@/components/icons/muscles";

export function Card({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface p-5 shadow-[var(--shadow-card)]",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  icon,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between", className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">
        {icon && <span className="text-accent">{icon}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}

type BadgeTone = "neutral" | "good" | "warn" | "danger" | "info" | "accent" | "violet";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-overlay text-text-secondary border-border-strong",
  good: "bg-good-soft text-good border-good/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  info: "bg-info-soft text-info border-info/30",
  accent: "bg-accent-soft text-accent border-accent/30",
  violet: "bg-violet-soft text-violet border-violet/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Solid muscle-group chip: full muscle color with dark text, the same
 * visual language as the user's reference app (BACK/CHEST section chips).
 */
export function MuscleChip({
  muscle,
  className,
  size = "sm",
}: {
  muscle: MuscleGroupId;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-bold uppercase tracking-wider whitespace-nowrap",
        size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]",
        className
      )}
      style={{ backgroundColor: MUSCLE_COLORS[muscle], color: "#0b0d12" }}
    >
      <MuscleIcon muscle={muscle} size={size === "md" ? 13 : 11} colored={false} />
      {MUSCLE_LABELS[muscle]}
    </span>
  );
}

const ZONE_TONES: Record<VolumeZone, BadgeTone> = {
  belowMev: "info",
  productive: "good",
  nearMrv: "warn",
  exceedingMrv: "danger",
};

export function VolumeZoneBadge({ zone }: { zone: VolumeZone }) {
  return <Badge tone={ZONE_TONES[zone]}>{VOLUME_ZONE_LABELS[zone]}</Badge>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-accent-strong to-accent text-bg font-semibold shadow-sm shadow-accent/20 hover:from-accent hover:to-accent active:scale-[0.98]",
  secondary:
    "border border-border-strong bg-raised text-text hover:bg-overlay active:scale-[0.98]",
  ghost: "text-text-secondary hover:bg-raised hover:text-text",
  danger: "bg-danger-soft border border-danger/30 text-danger hover:bg-danger/25",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-all disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        size === "sm" && "px-2.5 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        BUTTON_VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        size === "sm" && "px-2.5 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  // Callers passing their own width (w-16 etc.) must win — Tailwind's
  // stylesheet order would otherwise let the base w-full override it.
  const hasWidth = /(^|\s)w-/.test(className ?? "");
  return (
    <input
      className={cn(
        !hasWidth && "w-full",
        "rounded-lg border border-border bg-raised px-3 py-2 text-sm text-text placeholder:text-muted",
        "focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40",
        className
      )}
      {...props}
    />
  );
}

export function NumberInput({
  value,
  onCommit,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onCommit: (v: number) => void;
}) {
  // Local draft lets intermediate states ("", "12.") exist while typing —
  // a controlled type="number" would snap "" back to 0 and lock it in.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={draft ?? String(value)}
      onChange={(e) => {
        const text = e.target.value.replace(",", ".");
        if (!/^\d*\.?\d*$/.test(text)) return;
        setDraft(text);
        const n = Number(text);
        if (text !== "" && !Number.isNaN(n)) onCommit(n);
      }}
      onBlur={() => setDraft(null)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-text",
        "focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40",
        className
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("mb-1.5 block text-xs font-medium text-text-secondary", className)}>
      {children}
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "good" | "warn" | "danger" | "accent";
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </div>
      <div
        className={cn(
          "tnum mt-1 text-2xl font-semibold",
          tone === "good" && "text-good",
          tone === "warn" && "text-warn",
          tone === "danger" && "text-danger",
          tone === "accent" && "text-accent"
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Horizontal meter with MEV/MAV/MRV tick marks. */
export function VolumeMeter({
  sets,
  mev,
  mav,
  mrv,
}: {
  sets: number;
  mev: number;
  mav: number;
  mrv: number;
}) {
  const max = mrv * 1.2;
  const pct = Math.min(100, (sets / max) * 100);
  const color =
    sets > mrv
      ? "bg-danger"
      : sets >= mav
        ? "bg-warn"
        : sets >= mev
          ? "bg-good"
          : "bg-info";
  return (
    <div className="relative h-2 w-full rounded-full bg-overlay">
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out",
          color
        )}
        style={{ width: `${pct}%` }}
      />
      {[mev, mav, mrv].map((mark, i) => (
        <div
          key={i}
          className="absolute top-[-2px] h-3 w-px bg-border-strong"
          style={{ left: `${(mark / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-card border border-dashed border-border-strong py-14 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-accent/[0.05] blur-3xl"
      />
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-raised text-muted">
          {icon}
        </div>
      )}
      <div className="text-sm font-medium text-text-secondary">{title}</div>
      {description && (
        <div className="mt-1 max-w-sm text-xs text-muted">{description}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-raised bg-[linear-gradient(100deg,transparent_30%,var(--color-overlay)_50%,transparent_70%)] bg-[length:200%_100%]",
        className
      )}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
