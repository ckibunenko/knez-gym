import { createIcon } from "./base";

export const DashboardIcon = createIcon(
  "DashboardIcon",
  <>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
  </>
);

export const MesocycleIcon = createIcon(
  "MesocycleIcon",
  <>
    <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17" />
    <path d="M8 2.5v3.5M16 2.5v3.5" />
    <path d="M7 14.5c1.5-2.5 3 2.5 4.5 0s3 2.5 4.5 0" />
  </>
);

export const WorkoutIcon = createIcon(
  "WorkoutIcon",
  <>
    <path d="M7.5 8.5v7M16.5 8.5v7" />
    <rect x="4" y="9.75" width="3.5" height="4.5" rx="1" />
    <rect x="16.5" y="9.75" width="3.5" height="4.5" rx="1" />
    <path d="M7.5 12h9" />
    <path d="M2.5 10.75v2.5M21.5 10.75v2.5" />
  </>
);

export const CalendarIcon = createIcon(
  "CalendarIcon",
  <>
    <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17" />
    <path d="M8 2.5v3.5M16 2.5v3.5" />
    <circle cx="8" cy="13" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="16" cy="13" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="8" cy="17" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </>
);

export const LibraryIcon = createIcon(
  "LibraryIcon",
  <>
    <path d="M4.5 19.5V5a1.5 1.5 0 0 1 1.5-1.5h2.5V21H6a1.5 1.5 0 0 1-1.5-1.5Z" />
    <path d="M8.5 3.5H13a1.5 1.5 0 0 1 1.5 1.5v14.5A1.5 1.5 0 0 1 13 21H8.5" />
    <path d="m14.5 5.3 2.8-.7a1.5 1.5 0 0 1 1.8 1.1l3 12.6a1.5 1.5 0 0 1-1.1 1.8l-2.8.7" />
  </>
);

export const ProgressIcon = createIcon(
  "ProgressIcon",
  <>
    <path d="M3.5 3.5v15A2 2 0 0 0 5.5 20.5h15" />
    <path d="m7 14.5 3.5-4 3 2.5 4.5-6" />
    <circle cx="18" cy="7" r="1" fill="currentColor" stroke="none" />
  </>
);

export const SettingsIcon = createIcon(
  "SettingsIcon",
  <>
    <path d="M4 7.5h7M15 7.5h5" />
    <circle cx="13" cy="7.5" r="2" />
    <path d="M4 16.5h3M11 16.5h9" />
    <circle cx="9" cy="16.5" r="2" />
  </>
);
