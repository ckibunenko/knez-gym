import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KNEZ PUMP — Adaptive Strength & Hypertrophy",
    short_name: "KNEZ PUMP",
    description:
      "An evidence-based personal training system: RIR-driven progression, volume landmarks, fatigue management, and adaptive recommendations.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0c10",
    theme_color: "#0a0c10",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
