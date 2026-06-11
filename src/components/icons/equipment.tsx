import type { Equipment, MovementPattern } from "@/lib/types";
import { createIcon, type IconProps } from "./base";

export const BarbellIcon = createIcon(
  "BarbellIcon",
  <>
    <path d="M8 12h8" />
    <rect x="4.5" y="8" width="3" height="8" rx="1" />
    <rect x="16.5" y="8" width="3" height="8" rx="1" />
    <path d="M2 10.5v3M22 10.5v3" />
  </>
);

export const DumbbellIcon = createIcon(
  "DumbbellIcon",
  <>
    <path d="M9.5 12h5" />
    <rect x="5.5" y="8.5" width="3" height="7" rx="1" />
    <rect x="15.5" y="8.5" width="3" height="7" rx="1" />
  </>
);

export const MachineIcon = createIcon(
  "MachineIcon",
  <>
    <path d="M5 20.5V5a1.5 1.5 0 0 1 3 0v15.5" />
    <path d="M8 8h8l3 6" />
    <rect x="16" y="14" width="5" height="6.5" rx="1" />
    <path d="M3 20.5h18" />
  </>
);

export const CableIcon = createIcon(
  "CableIcon",
  <>
    <circle cx="12" cy="6" r="2.5" />
    <path d="M5 3.5h14" />
    <path d="M12 8.5V15" />
    <path d="M9 15h6l-1 5.5h-4Z" />
  </>
);

export const BodyweightIcon = createIcon(
  "BodyweightIcon",
  <>
    <circle cx="12" cy="5" r="2.5" />
    <path d="M4.5 10.5c5 1.5 10 1.5 15 0" />
    <path d="M12 11.5V16l-3 4.5M12 16l3 4.5" />
  </>
);

export const CompoundIcon = createIcon(
  "CompoundIcon",
  <>
    <circle cx="9" cy="9" r="5" />
    <circle cx="15" cy="15" r="5" />
  </>
);

export const IsolationIcon = createIcon(
  "IsolationIcon",
  <>
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
  </>
);

export const PushIcon = createIcon(
  "PushIcon",
  <>
    <path d="M5 4.5v15" />
    <path d="M9 12h10.5M16 8.5l3.5 3.5-3.5 3.5" />
  </>
);

export const PullIcon = createIcon(
  "PullIcon",
  <>
    <path d="M19 4.5v15" />
    <path d="M15.5 12H4.5M8 8.5 4.5 12 8 15.5" />
  </>
);

export const SquatPatternIcon = createIcon(
  "SquatPatternIcon",
  <>
    <path d="m5 8 7-4 7 4" />
    <path d="m5 14.5 7 4 7-4" />
    <path d="M12 4v4M12 14.5v4" opacity="0.5" />
  </>
);

export const HingePatternIcon = createIcon(
  "HingePatternIcon",
  <>
    <path d="M5 19.5 15.5 9" />
    <path d="M15.5 9 19 5.5" opacity="0.5" />
    <circle cx="15.5" cy="9" r="2" />
    <path d="M5 19.5h14" opacity="0.5" />
  </>
);

export const CorePatternIcon = createIcon(
  "CorePatternIcon",
  <>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 7.5a4.5 4.5 0 0 0 0 9" opacity="0.55" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
  </>
);

export const EQUIPMENT_ICONS: Record<
  Equipment,
  (props: IconProps) => React.ReactElement
> = {
  barbell: BarbellIcon,
  dumbbell: DumbbellIcon,
  machine: MachineIcon,
  cable: CableIcon,
  bodyweight: BodyweightIcon,
};

export function EquipmentIcon({
  equipment,
  ...props
}: IconProps & { equipment: Equipment }) {
  const Cmp = EQUIPMENT_ICONS[equipment];
  return <Cmp {...props} />;
}

const PATTERN_ICON_MAP: Partial<
  Record<MovementPattern, (props: IconProps) => React.ReactElement>
> = {
  squat: SquatPatternIcon,
  hinge: HingePatternIcon,
  horizontalPush: PushIcon,
  verticalPush: PushIcon,
  horizontalPull: PullIcon,
  verticalPull: PullIcon,
  core: CorePatternIcon,
};

export function MovementPatternIcon({
  pattern,
  ...props
}: IconProps & { pattern: MovementPattern }) {
  const Cmp = PATTERN_ICON_MAP[pattern] ?? IsolationIcon;
  return <Cmp {...props} />;
}
