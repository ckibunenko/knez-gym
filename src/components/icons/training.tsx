import { createIcon } from "./base";

/** Reps in reserve: a capacity bar with segments left in the tank. */
export const RirIcon = createIcon(
  "RirIcon",
  <>
    <rect x="3" y="8.5" width="16" height="7" rx="2" />
    <path d="M21.5 11v2" />
    <path d="M6.5 11.5v1M10 11.5v1M13.5 11.5v1" />
  </>
);

export const OverloadIcon = createIcon(
  "OverloadIcon",
  <>
    <path d="M3.5 20.5h4v-4h4v-4h4v-4h4" />
    <path d="m16 5 3.5-1.5L21 7" />
  </>
);

export const VolumeLandmarksIcon = createIcon(
  "VolumeLandmarksIcon",
  <>
    <path d="M4.5 20v-5M9.5 20v-9M14.5 20V7M19.5 20V4" />
    <path d="M2.5 12.5h4M12.5 4.5h4" opacity="0.6" />
  </>
);

export const RecoveryIcon = createIcon(
  "RecoveryIcon",
  <>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 3.5V7h-3.5" />
    <path d="M9.5 12.5 11.5 14.5 15 10" />
  </>
);

export const FatigueIcon = createIcon(
  "FatigueIcon",
  <>
    <rect x="3" y="8.5" width="16" height="7" rx="2" />
    <path d="M21.5 11v2" />
    <rect x="5.5" y="10.75" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
  </>
);

export const DeloadIcon = createIcon(
  "DeloadIcon",
  <>
    <path d="M3.5 6.5h4v4h4v4h4v4h5" />
    <path d="M19 10.5v4M16.5 12.5 19 14.5l2.5-2" />
  </>
);

export const StrengthIcon = createIcon(
  "StrengthIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" opacity="0.6" />
  </>
);

export const HypertrophyIcon = createIcon(
  "HypertrophyIcon",
  <>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5M12 19.5A7.5 7.5 0 0 1 4.5 12" />
    <path d="M12 1.5A10.5 10.5 0 0 1 22.5 12" opacity="0.45" />
    <path d="M12 22.5A10.5 10.5 0 0 1 1.5 12" opacity="0.45" />
  </>
);

export const TrendIcon = createIcon(
  "TrendIcon",
  <>
    <path d="m3.5 17 4.5-5 3.5 3 6-7.5" />
    <path d="M14.5 7.5H18V11" />
  </>
);

export const ReadinessIcon = createIcon(
  "ReadinessIcon",
  <>
    <path d="M3.5 12h4l2-5 3.5 9 2-4h5.5" />
  </>
);
