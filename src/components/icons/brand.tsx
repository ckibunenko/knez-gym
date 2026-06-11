import { cn } from "@/lib/utils";

const GOLD = "#e3b341";
const PLATE = "#0f1218";

/** Logo mark: crowned shield with the K-dumbbell monogram. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={className}
    >
      <path d="M20.5 15.5 L23.5 6.5 L28.5 10.5 L32 2.5 L35.5 10.5 L40.5 6.5 L43.5 15.5 Z" fill={GOLD} />
      <path
        d="M13.5 18.5 H50.5 V36 C50.5 47 41.5 53.5 32 57.5 C22.5 53.5 13.5 47 13.5 36 Z"
        fill={PLATE}
        stroke={GOLD}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <rect x="16.5" y="35.2" width="31" height="3.2" fill={GOLD} />
      <rect x="16" y="31.4" width="2.8" height="10.8" rx="1" fill={GOLD} />
      <rect x="19.4" y="28.8" width="3.2" height="16" rx="1" fill={GOLD} />
      <rect x="45.2" y="31.4" width="2.8" height="10.8" rx="1" fill={GOLD} />
      <rect x="41.4" y="28.8" width="3.2" height="16" rx="1" fill={GOLD} />
      <path
        d="M26.5 24 H30.5 V34 L38 24 H42.5 L35.7 35 L43.5 50 H38.7 L30.5 38.6 V50 H26.5 Z"
        fill={GOLD}
        stroke={PLATE}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={30} />
      <span className="text-[17px] font-extrabold italic tracking-tight text-text">
        KNEZ<span className="text-accent"> PUMP</span>
      </span>
    </span>
  );
}

/** Loading mark: the crowned shield pulsing. */
export function LoadingMark({ size = 36 }: { size?: number }) {
  return <LogoMark size={size} className="animate-pulse" />;
}
