import type { ReactNode } from "react";
import { MUSCLE_COLORS, type MuscleGroupId } from "@/lib/types";
import type { IconProps } from "./base";

const FILL_OPACITY = 0.22;
const DETAIL_OPACITY = 0.58;

const MUSCLE_GLYPHS: Record<MuscleGroupId, ReactNode> = {
  chest: (
    <>
      <path d="M12 4.7c-1.1-.8-2.4-1.1-3.8-.8-2.7.6-4.3 2.7-4.2 5.5.2 4.2 3.2 7.4 8 8.4 4.8-1 7.8-4.2 8-8.4.1-2.8-1.5-4.9-4.2-5.5-1.4-.3-2.7 0-3.8.8Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 4.7c-1.1-.8-2.4-1.1-3.8-.8-2.7.6-4.3 2.7-4.2 5.5.2 4.2 3.2 7.4 8 8.4 4.8-1 7.8-4.2 8-8.4.1-2.8-1.5-4.9-4.2-5.5-1.4-.3-2.7 0-3.8.8Z" />
      <path d="M12 5.2v12.1M6.8 11.1c1.3.9 3.1 1.3 5.2 1.3s3.9-.4 5.2-1.3" opacity={DETAIL_OPACITY} />
    </>
  ),
  back: (
    <>
      <path d="M12 3.8c-2 2-4.5 3.1-7.6 3.4.3 5.7 2.9 9.9 7.6 12.8 4.7-2.9 7.3-7.1 7.6-12.8-3.1-.3-5.6-1.4-7.6-3.4Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 3.8c-2 2-4.5 3.1-7.6 3.4.3 5.7 2.9 9.9 7.6 12.8 4.7-2.9 7.3-7.1 7.6-12.8-3.1-.3-5.6-1.4-7.6-3.4Z" />
      <path d="M12 6.5v11M7.8 9.3c.9 1.2 2.3 2 4.2 2.4 1.9-.4 3.3-1.2 4.2-2.4" opacity={DETAIL_OPACITY} />
    </>
  ),
  shoulders: (
    <>
      <path d="M7.2 8.4c-2.4.5-4 2.5-4 5.4 3 0 5.1-1.9 5.8-5.3" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M16.8 8.4c2.4.5 4 2.5 4 5.4-3 0-5.1-1.9-5.8-5.3" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M7.2 8.4c-2.4.5-4 2.5-4 5.4 3 0 5.1-1.9 5.8-5.3M16.8 8.4c2.4.5 4 2.5 4 5.4-3 0-5.1-1.9-5.8-5.3M8.9 8.4c.5-2.3 1.6-3.4 3.1-3.4s2.6 1.1 3.1 3.4" />
      <path d="M9.7 11.5h4.6" opacity={DETAIL_OPACITY} />
    </>
  ),
  biceps: (
    <>
      <path d="M6.1 16.8c1-4 3.5-6.4 6.6-6.4 2.3 0 4.2 1.5 4.8 3.7.4 1.6-.8 3.2-2.4 3.2H6.6c-.4 0-.6-.2-.5-.5Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M6.1 16.8c1-4 3.5-6.4 6.6-6.4 2.3 0 4.2 1.5 4.8 3.7.4 1.6-.8 3.2-2.4 3.2H6.6M8.5 12.3 6.6 9.8c-.6-.8-.2-2 .8-2.2l2.9-.6M13.3 10.5c.7-1.3 1-2.7.9-4.2M14.2 6.4c1.5.1 2.7.9 3.3 2.3" />
    </>
  ),
  triceps: (
    <>
      <path d="M12 4.4c3.1.7 5.2 3.1 5.2 6.4 0 3.8-2.1 6.7-5.2 7.8-3.1-1.1-5.2-4-5.2-7.8 0-3.3 2.1-5.7 5.2-6.4Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 4.4c3.1.7 5.2 3.1 5.2 6.4 0 3.8-2.1 6.7-5.2 7.8-3.1-1.1-5.2-4-5.2-7.8 0-3.3 2.1-5.7 5.2-6.4Z" />
      <path d="M9.2 9c1.8.9 3.8.9 5.6 0M9.9 12.2c.5 1.4 1.2 2.6 2.1 3.7.9-1.1 1.6-2.3 2.1-3.7" opacity={DETAIL_OPACITY} />
    </>
  ),
  quads: (
    <>
      <path d="M7.7 4.4c-.9 2.1-1 4.7-.3 7.7.7 2.9 2 5.4 3.7 7.6.5.6 1.3.6 1.8 0 1.7-2.2 3-4.7 3.7-7.6.7-3 .6-5.6-.3-7.7" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M7.7 4.4c-.9 2.1-1 4.7-.3 7.7.7 2.9 2 5.4 3.7 7.6.5.6 1.3.6 1.8 0 1.7-2.2 3-4.7 3.7-7.6.7-3 .6-5.6-.3-7.7" />
      <path d="M10 6.2v8.5M14 6.2v8.5M12 6v11.5" opacity={DETAIL_OPACITY} />
    </>
  ),
  hamstrings: (
    <>
      <path d="M7.8 4.8c-1 2.2-.8 5 .4 8.2.9 2.8 2.2 5 3.8 6.5 1.6-1.5 2.9-3.7 3.8-6.5 1.2-3.2 1.4-6 .4-8.2" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M7.8 4.8c-1 2.2-.8 5 .4 8.2.9 2.8 2.2 5 3.8 6.5 1.6-1.5 2.9-3.7 3.8-6.5 1.2-3.2 1.4-6 .4-8.2" />
      <path d="M8.6 7.2c2.3.9 4.5.9 6.8 0M12 8.4v8.8" opacity={DETAIL_OPACITY} />
    </>
  ),
  glutes: (
    <>
      <path d="M12 8.1c-.9-1.1-2-1.6-3.3-1.6-2.7 0-4.9 2.6-4.9 6 0 3.6 2.3 6.2 5.3 6.2 1.1 0 2.1-.4 2.9-1.2.8.8 1.8 1.2 2.9 1.2 3 0 5.3-2.6 5.3-6.2 0-3.4-2.2-6-4.9-6-1.3 0-2.4.5-3.3 1.6Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M12 8.1c-.9-1.1-2-1.6-3.3-1.6-2.7 0-4.9 2.6-4.9 6 0 3.6 2.3 6.2 5.3 6.2 1.1 0 2.1-.4 2.9-1.2.8.8 1.8 1.2 2.9 1.2 3 0 5.3-2.6 5.3-6.2 0-3.4-2.2-6-4.9-6-1.3 0-2.4.5-3.3 1.6Z" />
      <path d="M12 8.3v9" opacity={DETAIL_OPACITY} />
    </>
  ),
  calves: (
    <>
      <path d="M9 4.7c-1.8 2.7-2.5 5.2-2.1 7.2.3 1.8 1.4 3.3 3.1 4.5l2 3.4 2-3.4c1.7-1.2 2.8-2.7 3.1-4.5.4-2-.3-4.5-2.1-7.2" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M9 4.7c-1.8 2.7-2.5 5.2-2.1 7.2.3 1.8 1.4 3.3 3.1 4.5l2 3.4 2-3.4c1.7-1.2 2.8-2.7 3.1-4.5.4-2-.3-4.5-2.1-7.2" />
      <path d="M10 7.1c.6 2.2 1.3 4.3 2 6.3.7-2 1.4-4.1 2-6.3" opacity={DETAIL_OPACITY} />
    </>
  ),
  abs: (
    <>
      <path d="M8.2 4.4h7.6c1 2.1 1.5 4.5 1.5 7.1s-.5 5-1.5 7.1H8.2c-1-2.1-1.5-4.5-1.5-7.1s.5-5 1.5-7.1Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M8.2 4.4h7.6c1 2.1 1.5 4.5 1.5 7.1s-.5 5-1.5 7.1H8.2c-1-2.1-1.5-4.5-1.5-7.1s.5-5 1.5-7.1Z" />
      <path d="M12 5.5v12M8.1 8.9h7.8M7.8 13.3h8.4" opacity={DETAIL_OPACITY} />
    </>
  ),
  forearms: (
    <>
      <path d="M14.2 5.1c1.3.2 2.2 1.2 2.2 2.5 0 1.4-1.1 2.6-2.6 2.6h-1l-3 7.8c-.4 1.1-1.6 1.6-2.7 1.2-1.1-.4-1.6-1.6-1.2-2.7l3.1-8.2c.4-1.2 1.6-2 2.9-2h1.7" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M14.2 5.1c1.3.2 2.2 1.2 2.2 2.5 0 1.4-1.1 2.6-2.6 2.6h-1l-3 7.8c-.4 1.1-1.6 1.6-2.7 1.2-1.1-.4-1.6-1.6-1.2-2.7l3.1-8.2c.4-1.2 1.6-2 2.9-2h1.7" />
      <path d="M10.1 10.2c.7.9 1.5 1.5 2.4 1.9" opacity={DETAIL_OPACITY} />
    </>
  ),
  traps: (
    <>
      <path d="M10 4h4v4.2c2.4.8 4.6 2.6 6.5 5.4.5.8-.1 1.9-1.1 1.9H4.6c-1 0-1.6-1.1-1.1-1.9C5.4 10.8 7.6 9 10 8.2V4Z" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M10 4h4v4.2c2.4.8 4.6 2.6 6.5 5.4.5.8-.1 1.9-1.1 1.9H4.6c-1 0-1.6-1.1-1.1-1.9C5.4 10.8 7.6 9 10 8.2V4Z" />
      <path d="M8 10.9c2.7.9 5.3.9 8 0" opacity={DETAIL_OPACITY} />
    </>
  ),
  lowerBack: (
    <>
      <path d="M8 5.1c-1.2 2.3-1.7 4.8-1.6 7.4.1 2.8 1.2 5 3.1 6.6.9-1 1.7-2 2.5-3 .8 1 1.6 2 2.5 3 1.9-1.6 3-3.8 3.1-6.6.1-2.6-.4-5.1-1.6-7.4" fill="currentColor" opacity={FILL_OPACITY} />
      <path d="M8 5.1c-1.2 2.3-1.7 4.8-1.6 7.4.1 2.8 1.2 5 3.1 6.6.9-1 1.7-2 2.5-3 .8 1 1.6 2 2.5 3 1.9-1.6 3-3.8 3.1-6.6.1-2.6-.4-5.1-1.6-7.4" />
      <path d="M12 5.4v10.6M10.4 8h3.2M10.3 10.8h3.4M10.5 13.6h3" opacity={DETAIL_OPACITY} />
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
  const displaySize = Math.round(size * 1.35);

  return (
    <svg
      width={displaySize}
      height={displaySize}
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
