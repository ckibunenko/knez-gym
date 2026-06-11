let counter = 0;

export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

// All calendar math runs in Serbian time, regardless of device/UTC offset.
export const TIME_ZONE = "Europe/Belgrade";

// en-CA locale formats as YYYY-MM-DD.
const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date (YYYY-MM-DD) of the given instant in Serbian time. */
export function isoDate(d: Date): string {
  return isoFormatter.format(d);
}

export function daysAgo(n: number): string {
  const [y, m, d] = isoDate(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

export function daysFromNow(n: number): string {
  return daysAgo(-n);
}

/** Day-first short date ("Wed, 10 Jun"); the year appears only when it isn't the current one. */
export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatDateLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
