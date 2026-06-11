// Two-person household app: each profile gets its own persisted store
// (scoped IndexedDB key) and its own accent styling via data-profile.

export type ProfileId = "aleksandar" | "milana";

export const PROFILES: { id: ProfileId; label: string }[] = [
  { id: "aleksandar", label: "Aleksandar" },
  { id: "milana", label: "Milana" },
];

export const PROFILE_KEY = "knez-pump-profile";

export function getActiveProfile(): ProfileId {
  try {
    return localStorage.getItem(PROFILE_KEY) === "milana" ? "milana" : "aleksandar";
  } catch {
    return "aleksandar";
  }
}

export function switchProfile(id: ProfileId): void {
  try {
    localStorage.setItem(PROFILE_KEY, id);
  } catch {}
  // The store binds to one profile at module load — a reload is the
  // simplest correct way to rebind everything.
  location.reload();
}
