import type { ReactNode } from "react";
import { MUSCLE_COLORS, type MuscleGroupId } from "@/lib/types";
import type { IconProps } from "./base";

/**
 * Each muscle group renders as a small anatomical glyph: filled silhouettes
 * on the shared 24px grid, duotone (secondary masses at reduced opacity),
 * tinted via currentColor with the group's signature color. Seam lines are
 * cut out of the silhouette with evenodd so they stay crisp at any size.
 */
const MUSCLE_GLYPHS: Record<MuscleGroupId, ReactNode> = {
  // Two pectoral plates meeting at the sternum.
  chest: (
    <>
      <path d="M5.6 5.8 H10.9 C11.4 5.8 11.8 6.2 11.8 6.7 V13.2 C11.8 15.9 9.9 17.9 7.5 17.9 C5 17.9 3.2 15.9 3.2 13.4 V8.2 C3.2 6.9 4.2 5.8 5.6 5.8 Z" />
      <path
        opacity="0.6"
        d="M18.4 5.8 H13.1 C12.6 5.8 12.2 6.2 12.2 6.7 V13.2 C12.2 15.9 14.1 17.9 16.5 17.9 C19 17.9 20.8 15.9 20.8 13.4 V8.2 C20.8 6.9 19.8 5.8 18.4 5.8 Z"
      />
    </>
  ),
  // V-taper lat shield with a spine groove.
  back: (
    <path
      fillRule="evenodd"
      d="M5.2 4.6 C7.3 6.2 9.6 7 12 7 C14.4 7 16.7 6.2 18.8 4.6 C19.6 4.9 20 5.6 19.9 6.6 C19.8 8.9 19.4 11 18.5 13 C17.2 15.7 15 17.7 12 19.4 C9 17.7 6.8 15.7 5.5 13 C4.6 11 4.2 8.9 4.1 6.6 C4 5.6 4.4 4.9 5.2 4.6 Z M11.65 8.4 H12.35 V16.4 H11.65 Z"
    />
  ),
  // Deltoid cap split into three heads, over the upper-arm insertion.
  shoulders: (
    <>
      <path
        fillRule="evenodd"
        d="M12 4.8 C16.6 4.8 20.2 8.4 20.2 13 V13.4 C20.2 14.3 19.5 15 18.6 15 H5.4 C4.5 15 3.8 14.3 3.8 13.4 V13 C3.8 8.4 7.4 4.8 12 4.8 Z M9.7 15 L10.4 15 L7.9 8.2 L7.3 8.6 Z M14.3 15 L13.6 15 L16.1 8.2 L16.7 8.6 Z"
      />
      <path
        opacity="0.55"
        d="M8.7 16.4 H15.3 V16.9 C15.3 18.7 13.8 20.2 12 20.2 C10.2 20.2 8.7 18.7 8.7 16.9 Z"
      />
    </>
  ),
  // Classic flex: bicep mound with the forearm curled up to a fist.
  biceps: (
    <>
      <path d="M5 17.6 C3.9 17.6 3 16.7 3.2 15.6 C3.9 11.6 7.6 8.6 11.9 8.6 C16.1 8.6 19.7 11.6 20.4 15.6 C20.6 16.7 19.7 17.6 18.6 17.6 Z" />
      <path d="M15.15 4.49 L19.35 13.69 A1.7 1.7 0 0 1 16.25 15.11 L12.05 5.91 A1.7 1.7 0 0 1 15.15 4.49 Z" />
      <circle cx="12.9" cy="5.3" r="2.4" />
    </>
  ),
  // The horseshoe on the back of the upper arm.
  triceps: (
    <>
      <rect x="6.4" y="3.4" width="11.2" height="17.2" rx="4.6" opacity="0.3" />
      <path d="M12 6.2 C14.9 6.2 17 8.5 17 11.5 V16.8 C17 17.7 16.3 18.4 15.4 18.4 C14.5 18.4 13.8 17.7 13.8 16.8 V11.5 C13.8 10.2 13 9.4 12 9.4 C11 9.4 10.2 10.2 10.2 11.5 V16.8 C10.2 17.7 9.5 18.4 8.6 18.4 C7.7 18.4 7 17.7 7 16.8 V11.5 C7 8.5 9.1 6.2 12 6.2 Z" />
    </>
  ),
  // Front thigh tapering to the knee, three bellies.
  quads: (
    <path
      fillRule="evenodd"
      d="M8.1 4 H15.9 C17.1 4 18 4.9 18 6.1 C18 10.8 16.6 15.2 13.9 18.8 C13 20.1 11 20.1 10.1 18.8 C7.4 15.2 6 10.8 6 6.1 C6 4.9 6.9 4 8.1 4 Z M9.05 6.3 H9.75 V13.8 H9.05 Z M14.25 6.3 H14.95 V13.8 H14.25 Z"
    />
  ),
  // Rear thigh: glute fold on top, long center seam between the two heads.
  hamstrings: (
    <path
      fillRule="evenodd"
      d="M8.1 4 H15.9 C17.1 4 18 4.9 18 6.1 C18 10.8 16.6 15.2 13.9 18.8 C13 20.1 11 20.1 10.1 18.8 C7.4 15.2 6 10.8 6 6.1 C6 4.9 6.9 4 8.1 4 Z M8.5 5.7 H15.5 V6.4 H8.5 Z M11.65 8.2 H12.35 V16.2 H11.65 Z"
    />
  ),
  // Two cheeks; the far one sits behind at reduced opacity.
  glutes: (
    <>
      <ellipse cx="15.9" cy="12.6" rx="4.9" ry="5.7" opacity="0.6" />
      <ellipse cx="8.1" cy="12.6" rx="4.9" ry="5.7" />
    </>
  ),
  // Gastrocnemius diamond narrowing into the achilles.
  calves: (
    <path
      fillRule="evenodd"
      d="M12 4.2 C15 4.2 17.3 6.6 17.3 9.6 C17.3 12.5 15.7 15 13.4 16.4 V18.6 C13.4 19.4 12.8 20 12 20 C11.2 20 10.6 19.4 10.6 18.6 V16.4 C8.3 15 6.7 12.5 6.7 9.6 C6.7 6.6 9 4.2 12 4.2 Z M11.65 6.4 H12.35 V12.6 H11.65 Z"
    />
  ),
  // Six-pack grid, bottom row tapering in.
  abs: (
    <>
      <rect x="6.9" y="4.4" width="4.7" height="4.1" rx="1.5" />
      <rect x="12.4" y="4.4" width="4.7" height="4.1" rx="1.5" />
      <rect x="6.9" y="9.3" width="4.7" height="4.1" rx="1.5" />
      <rect x="12.4" y="9.3" width="4.7" height="4.1" rx="1.5" />
      <rect x="7.4" y="14.2" width="4.2" height="4.1" rx="1.5" />
      <rect x="12.4" y="14.2" width="4.2" height="4.1" rx="1.5" />
    </>
  ),
  // Forearm widening to the elbow, clenched fist above, flexor seam.
  forearms: (
    <>
      <rect x="7.9" y="3.5" width="8.2" height="5.6" rx="2.5" opacity="0.55" />
      <path
        fillRule="evenodd"
        d="M10 8.6 H14 C14.5 8.6 14.9 9 15 9.5 L16.5 17.8 C16.7 18.9 15.9 19.9 14.8 19.9 H9.2 C8.1 19.9 7.3 18.9 7.5 17.8 L9 9.5 C9.1 9 9.5 8.6 10 8.6 Z M11.65 10.6 H12.35 V17.6 H11.65 Z"
      />
    </>
  ),
  // Neck column flowing into the sloped upper traps.
  traps: (
    <path d="M10.6 3.8 H13.4 C14 3.8 14.4 4.2 14.4 4.8 V7.9 C17 8.9 19.5 10.7 21.1 13.3 C21.7 14.3 21 15.4 19.9 15.4 H4.1 C3 15.4 2.3 14.3 2.9 13.3 C4.5 10.7 7 8.9 9.6 7.9 V4.8 C9.6 4.2 10 3.8 10.6 3.8 Z" />
  ),
  // Vertebrae stack into the sacrum, erector columns flanking.
  lowerBack: (
    <>
      <rect x="6.7" y="4.6" width="2.7" height="11.4" rx="1.35" opacity="0.55" />
      <rect x="14.6" y="4.6" width="2.7" height="11.4" rx="1.35" opacity="0.55" />
      <rect x="10.4" y="3.6" width="3.2" height="2.7" rx="1" />
      <rect x="10.4" y="7" width="3.2" height="2.7" rx="1" />
      <rect x="10.4" y="10.4" width="3.2" height="2.7" rx="1" />
      <path d="M10.1 14.1 H13.9 C14.6 14.1 15 14.9 14.6 15.5 L12.8 18.8 C12.4 19.5 11.6 19.5 11.2 18.8 L9.4 15.5 C9 14.9 9.4 14.1 10.1 14.1 Z" />
    </>
  ),
};

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
      {MUSCLE_GLYPHS[muscle]}
    </svg>
  );
}
