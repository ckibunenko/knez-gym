import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KNEZ PUMP — Adaptive Strength & Hypertrophy",
    template: "%s · KNEZ PUMP",
  },
  description:
    "An evidence-based personal training system: RIR-driven progression, volume landmarks, fatigue management, and adaptive recommendations.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KNEZ PUMP",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c10",
  // Lets the PWA paint edge-to-edge; safe-area insets handle the notch.
  viewportFit: "cover",
};

// Applies the saved theme and profile accent before first paint.
const THEME_INIT = `try{if(localStorage.getItem("apex-theme")==="light")document.documentElement.dataset.theme="light";if(localStorage.getItem("knez-pump-profile")==="milana")document.documentElement.dataset.profile="milana"}catch{}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
