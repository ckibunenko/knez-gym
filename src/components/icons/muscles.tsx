import type { ReactNode } from "react";
import { MUSCLE_COLORS, type MuscleGroupId } from "@/lib/types";
import type { IconProps } from "./base";

const DETAIL_OPACITY = 0.38;
const FILL_OPACITY = 0.14;

/** Premium line-art muscle glyphs on the shared 24px grid. */
const MUSCLE_GLYPHS: Record<MuscleGroupId, ReactNode> = {
  chest: (
    <>
      <path d="M12 6.2c-1-.9-2.2-1.4-3.7-1.4-2.6 0-4.4 1.8-4.4 4.5 0 4.7 3.1 7.8 8.1 8.6" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 6.2c1-.9 2.2-1.4 3.7-1.4 2.6 0 4.4 1.8 4.4 4.5 0 4.7-3.1 7.8-8.1 8.6" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 6.2c-1-.9-2.2-1.4-3.7-1.4-2.6 0-4.4 1.8-4.4 4.5 0 4.7 3.1 7.8 8.1 8.6 5-0.8 8.1-3.9 8.1-8.6 0-2.7-1.8-4.5-4.4-4.5-1.5 0-2.7.5-3.7 1.4Z" />
      <path d="M12 6.4v11.5" opacity={DETAIL_OPACITY} />
      <path d="M6.2 11.5c1.4.9 3.3 1.3 5.8 1.3s4.4-.4 5.8-1.3" opacity={DETAIL_OPACITY} />
    </>
  ),
  back: (
    <>
      <path d="M12 4.5c-2 1.8-4.4 2.8-7.1 3 .3 5.3 2.7 9.3 7.1 12 4.4-2.7 6.8-6.7 7.1-12-2.7-.2-5.1-1.2-7.1-3Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 4.5c-2 1.8-4.4 2.8-7.1 3 .3 5.3 2.7 9.3 7.1 12 4.4-2.7 6.8-6.7 7.1-12-2.7-.2-5.1-1.2-7.1-3Z" />
      <path d="M12 6.6v10.8" opacity={DETAIL_OPACITY} />
      <path d="M8.2 9.2c.8 1.2 2.1 1.9 3.8 2.2 1.7-.3 3-1 3.8-2.2" opacity={DETAIL_OPACITY} />
    </>
  ),
  shoulders: (
    <>
      <path d="M7.3 8.5c-2.5.5-4.1 2.4-4.1 5 2.8 0 4.8-1.7 5.6-4.8" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M16.7 8.5c2.5.5 4.1 2.4 4.1 5-2.8 0-4.8-1.7-5.6-4.8" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M7.3 8.5c-2.5.5-4.1 2.4-4.1 5 2.8 0 4.8-1.7 5.6-4.8" />
      <path d="M16.7 8.5c2.5.5 4.1 2.4 4.1 5-2.8 0-4.8-1.7-5.6-4.8" />
      <path d="M8.8 8.4c.4-2 1.5-3.1 3.2-3.1s2.8 1.1 3.2 3.1" />
      <path d="M9.3 11.4h5.4" opacity={DETAIL_OPACITY} />
    </>
  ),
  biceps: (
    <>
      <path d="M6.4 15.8c1.2-3.3 3.5-5.3 6.4-5.3 2.3 0 4.1 1.3 4.8 3.5.5 1.5-.6 3-2.2 3H6.7c-.5 0-.5-.6-.3-1.2Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M7.2 16.9c1.1-4 3.6-6.4 6.4-6.4 2 0 3.6 1.2 4.1 3.1.4 1.5-.7 3.1-2.3 3.1H6.7" />
      <path d="M8.4 12.4 6.6 9.9c-.6-.8-.2-1.9.8-2.1l2.9-.6" />
      <path d="M13.2 10.6c.6-1.4.9-2.7.9-4" />
      <path d="M14.1 6.6c1.5.1 2.6.8 3.1 2.2" />
    </>
  ),
  triceps: (
    <>
      <path d="M11.8 5.1c3.2.6 5.3 3 5.3 6.2 0 3.6-2.1 6.4-5.1 7.3-3-.9-5.1-3.7-5.1-7.3 0-3.2 1.7-5.5 4.9-6.2Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 5.1c3.1.7 5.1 3 5.1 6.2 0 3.6-2.1 6.4-5.1 7.3-3-.9-5.1-3.7-5.1-7.3 0-3.2 2-5.5 5.1-6.2Z" />
      <path d="M9.4 9.3c1.6.7 3.6.7 5.2 0" opacity={DETAIL_OPACITY} />
      <path d="M10.2 12.2c.4 1.3 1 2.5 1.8 3.5.8-1 1.4-2.2 1.8-3.5" opacity={DETAIL_OPACITY} />
    </>
  ),
  quads: (
    <>
      <path d="M8 4.5c-.8 2-.9 4.5-.2 7.4.6 2.7 1.8 5.1 3.5 7.2.4.5 1 .5 1.4 0 1.7-2.1 2.9-4.5 3.5-7.2.7-2.9.6-5.4-.2-7.4" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M8 4.5c-.8 2-.9 4.5-.2 7.4.6 2.7 1.8 5.1 3.5 7.2.4.5 1 .5 1.4 0 1.7-2.1 2.9-4.5 3.5-7.2.7-2.9.6-5.4-.2-7.4" />
      <path d="M10 6.3v8.3" opacity={DETAIL_OPACITY} />
      <path d="M14 6.3v8.3" opacity={DETAIL_OPACITY} />
      <path d="M12 6v11.3" opacity={DETAIL_OPACITY} />
    </>
  ),
  hamstrings: (
    <>
      <path d="M8 4.8c-.9 2.2-.8 4.9.3 8.1.9 2.7 2.1 4.8 3.7 6.3 1.6-1.5 2.8-3.6 3.7-6.3 1.1-3.2 1.2-5.9.3-8.1" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M8 4.8c-.9 2.2-.8 4.9.3 8.1.9 2.7 2.1 4.8 3.7 6.3 1.6-1.5 2.8-3.6 3.7-6.3 1.1-3.2 1.2-5.9.3-8.1" />
      <path d="M8.4 7.1c2.4.8 4.8.8 7.2 0" opacity={DETAIL_OPACITY} />
      <path d="M12 8.2v8.8" opacity={DETAIL_OPACITY} />
    </>
  ),
  glutes: (
    <>
      <path d="M12 8.3c-.9-1-1.9-1.5-3.1-1.5-2.6 0-4.8 2.5-4.8 5.7 0 3.5 2.2 6 5.1 6 1.1 0 2-.4 2.8-1.2.8.8 1.7 1.2 2.8 1.2 2.9 0 5.1-2.5 5.1-6 0-3.2-2.2-5.7-4.8-5.7-1.2 0-2.2.5-3.1 1.5Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 8.3c-.9-1-1.9-1.5-3.1-1.5-2.6 0-4.8 2.5-4.8 5.7 0 3.5 2.2 6 5.1 6 1.1 0 2-.4 2.8-1.2.8.8 1.7 1.2 2.8 1.2 2.9 0 5.1-2.5 5.1-6 0-3.2-2.2-5.7-4.8-5.7-1.2 0-2.2.5-3.1 1.5Z" />
      <path d="M12 8.4v8.9" opacity={DETAIL_OPACITY} />
    </>
  ),
  calves: (
    <>
      <path d="M9.3 4.8c-1.8 2.7-2.6 5-2.2 7 .3 1.7 1.3 3.1 3 4.3l1.9 3.5 1.9-3.5c1.7-1.2 2.7-2.6 3-4.3.4-2-.4-4.3-2.2-7" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M9.3 4.8c-1.8 2.7-2.6 5-2.2 7 .3 1.7 1.3 3.1 3 4.3l1.9 3.5 1.9-3.5c1.7-1.2 2.7-2.6 3-4.3.4-2-.4-4.3-2.2-7" />
      <path d="M10 7.2c.7 2.1 1.4 4.1 2 6 .6-1.9 1.3-3.9 2-6" opacity={DETAIL_OPACITY} />
    </>
  ),
  abs: (
    <>
      <path d="M8.4 4.5h7.2c1 2.1 1.5 4.4 1.5 7s-.5 4.9-1.5 7H8.4c-1-2.1-1.5-4.4-1.5-7s.5-4.9 1.5-7Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M8.4 4.5h7.2c1 2.1 1.5 4.4 1.5 7s-.5 4.9-1.5 7H8.4c-1-2.1-1.5-4.4-1.5-7s.5-4.9 1.5-7Z" />
      <path d="M12 5.5v12" opacity={DETAIL_OPACITY} />
      <path d="M8 9h8" opacity={DETAIL_OPACITY} />
      <path d="M7.8 13.4h8.4" opacity={DETAIL_OPACITY} />
    </>
  ),
  forearms: (
    <>
      <path d="M14.2 5.1c1.2.2 2.1 1.2 2.1 2.4 0 1.4-1.1 2.5-2.5 2.5h-1.1l-2.9 7.9c-.4 1-1.5 1.5-2.5 1.1s-1.5-1.5-1.1-2.5l3-8.2c.4-1.2 1.6-2 2.9-2h1.6" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M14.2 5.1c1.2.2 2.1 1.2 2.1 2.4 0 1.4-1.1 2.5-2.5 2.5h-1.1l-2.9 7.9c-.4 1-1.5 1.5-2.5 1.1s-1.5-1.5-1.1-2.5l3-8.2c.4-1.2 1.6-2 2.9-2h1.6" />
      <path d="M10 10.2c.7.9 1.4 1.5 2.3 1.9" opacity={DETAIL_OPACITY} />
    </>
  ),
  traps: (
    <>
      <path d="M10 4.2h4v4c2.4.8 4.5 2.6 6.4 5.3.5.8-.1 1.8-1 1.8H4.6c-.9 0-1.5-1-1-1.8C5.5 10.8 7.6 9 10 8.2v-4Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M10 4.2h4v4c2.4.8 4.5 2.6 6.4 5.3.5.8-.1 1.8-1 1.8H4.6c-.9 0-1.5-1-1-1.8C5.5 10.8 7.6 9 10 8.2v-4Z" />
      <path d="M8 10.8c2.7.8 5.3.8 8 0" opacity={DETAIL_OPACITY} />
    </>
  ),
  lowerBack: (
    <>
      <path d="M8 5.2c-1.1 2.3-1.6 4.7-1.5 7.2.1 2.6 1.1 4.8 3 6.4.9-1 1.7-2 2.5-3 .8 1 1.6 2 2.5 3 1.9-1.6 2.9-3.8 3-6.4.1-2.5-.4-4.9-1.5-7.2" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M8 5.2c-1.1 2.3-1.6 4.7-1.5 7.2.1 2.6 1.1 4.8 3 6.4.9-1 1.7-2 2.5-3 .8 1 1.6 2 2.5 3 1.9-1.6 2.9-3.8 3-6.4.1-2.5-.4-4.9-1.5-7.2" />
      <path d="M12 5.5v10.3" opacity={DETAIL_OPACITY} />
      <path d="M10.4 8.1h3.2M10.3 10.9h3.4M10.5 13.7h3" opacity={DETAIL_OPACITY} />
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
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={colored ? { color: MUSCLE_COLORS[muscle], ...style } : style}
      {...props}
    >
      {MUSCLE_GLYPHS[muscle]}
    </svg>
  );
}
