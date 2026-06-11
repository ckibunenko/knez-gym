import { createIcon } from "./base";

export const PumpIcon = createIcon(
  "PumpIcon",
  <>
    <path d="M12 4.5c3.5 4 6 6.8 6 9.7a6 6 0 0 1-12 0c0-2.9 2.5-5.7 6-9.7Z" />
    <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" opacity="0.55" />
  </>
);

export const SorenessIcon = createIcon(
  "SorenessIcon",
  <>
    <circle cx="12" cy="12" r="6.5" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" opacity="0.7" />
  </>
);

export const JointIcon = createIcon(
  "JointIcon",
  <>
    <path d="M7 4.5a5 5 0 0 1 4 8" />
    <path d="M17 19.5a5 5 0 0 1-4-8" />
    <circle cx="12" cy="12" r="2" />
  </>
);

export const LocalFatigueIcon = createIcon(
  "LocalFatigueIcon",
  <>
    <path d="m13 3.5-7 9.5h5l-1 7.5 7-9.5h-5Z" opacity="0.4" />
    <path d="M4 20.5h16" />
  </>
);

export const EnergyIcon = createIcon(
  "EnergyIcon",
  <path d="m13 3.5-7 9.5h5l-1 7.5 7-9.5h-5Z" />
);

export const MotivationIcon = createIcon(
  "MotivationIcon",
  <>
    <path d="M12 3.5c1 2.5 3.5 4 3.5 7a3.5 3.5 0 0 1-7 0c0-3 2.5-4.5 3.5-7Z" />
    <path d="M8 14.5a4 4 0 1 0 8 0" />
  </>
);

export const TechniqueIcon = createIcon(
  "TechniqueIcon",
  <>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="3" opacity="0.55" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </>
);

export const PainIcon = createIcon(
  "PainIcon",
  <>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4.5" />
    <circle cx="12" cy="17.25" r="0.5" fill="currentColor" stroke="none" />
  </>
);

export const PrIcon = createIcon(
  "PrIcon",
  <>
    <path d="M8 4.5h8v5a4 4 0 0 1-8 0Z" />
    <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
    <path d="M12 13.5v3M9 19.5h6" />
  </>
);

export const CompletedIcon = createIcon(
  "CompletedIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
  </>
);

export const SkippedIcon = createIcon(
  "SkippedIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m7 17 10-10" />
  </>
);
