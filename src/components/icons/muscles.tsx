import { MUSCLE_COLORS, type MuscleGroupId } from "@/lib/types";
import type { IconProps } from "./base";

/**
 * Muscle groups render as a clean two-tone color token (halo ring + solid
 * core) instead of pictorial anatomy: the signature color carries identity,
 * the label next to it carries meaning. Reads perfectly at any size.
 */
export function MuscleIcon({
  muscle,
  colored = true,
  size = 20,
  style,
  ...props
}: IconProps & { muscle: MuscleGroupId; colored?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden
      style={colored ? { color: MUSCLE_COLORS[muscle], ...style } : style}
      {...props}
    >
      <circle cx="12" cy="12" r="9" opacity="0.22" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
      <circle cx="12" cy="12" r="4.6" />
    </svg>
  );
}
