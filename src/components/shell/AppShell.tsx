"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getActiveProfile, switchProfile, PROFILES, type ProfileId } from "@/lib/profiles";
import { Wordmark } from "@/components/icons/brand";
import {
  DashboardIcon,
  MesocycleIcon,
  WorkoutIcon,
  CalendarIcon,
  LibraryIcon,
  ProgressIcon,
  SettingsIcon,
} from "@/components/icons/navigation";
import type { IconProps } from "@/components/icons/base";

const NAV_ITEMS: {
  href: string;
  label: string;
  /** Compact label for the mobile bottom bar. */
  short: string;
  icon: (props: IconProps) => React.ReactElement;
}[] = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: DashboardIcon },
  { href: "/mesocycles", label: "Mesocycles", short: "Mesos", icon: MesocycleIcon },
  { href: "/workouts", label: "Workouts", short: "Workouts", icon: WorkoutIcon },
  { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarIcon },
  { href: "/exercises", label: "Exercise Library", short: "Library", icon: LibraryIcon },
  { href: "/progress", label: "Progress", short: "Progress", icon: ProgressIcon },
  { href: "/settings", label: "Settings", short: "Settings", icon: SettingsIcon },
];

function ProfileSwitcher({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  // Server renders the default; the effect syncs to the saved profile.
  const [active, setActive] = useState<ProfileId>("aleksandar");
  useEffect(() => setActive(getActiveProfile()), []);

  return (
    <div
      className={cn(
        "flex rounded-lg border border-border bg-raised p-0.5",
        className
      )}
      role="group"
      aria-label="Active profile"
    >
      {PROFILES.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => p.id !== active && switchProfile(p.id)}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            active === p.id
              ? "bg-accent-soft text-accent"
              : "text-muted hover:text-text"
          )}
          aria-pressed={active === p.id}
          title={`Switch to ${p.label}`}
        >
          {compact ? p.label[0] : p.label}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ className }: { className?: string }) {
  // Server renders "dark"; the effect syncs to whatever the pre-paint
  // script in the root layout applied from localStorage.
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("apex-theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-raised hover:text-text",
        className
      )}
    >
      {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Ask the browser to treat our storage as persistent (years of training
  // logs live in IndexedDB) — best effort, ignored where unsupported.
  // The service worker caches the app shell so it boots without network.
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker?.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface/60 backdrop-blur md:flex">
        <div className="px-5 py-5">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-text-secondary hover:bg-raised hover:text-text"
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
                  />
                )}
                <item.icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 px-3 pb-2">
          <ProfileSwitcher />
          <ThemeToggle className="w-full justify-center" />
        </div>
        <div className="px-5 pb-4 text-[11px] leading-relaxed text-muted">
          Training organization and educational guidance only — not medical
          advice.
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur md:hidden">
        <Link href="/">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <ProfileSwitcher compact />
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile bottom nav (safe-area aware for home-indicator phones) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-accent" : "text-muted"
              )}
            >
              <span
                className={cn(
                  "rounded-full px-3 py-0.5 transition-colors",
                  active && "bg-accent-soft"
                )}
              >
                <item.icon size={20} />
              </span>
              {item.short}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 px-4 pb-24 pt-20 md:ml-60 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
