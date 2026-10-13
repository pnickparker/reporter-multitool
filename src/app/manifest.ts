import type { MetadataRoute } from "next";

/**
 * What a phone needs to offer "Add to Home Screen" as a real app icon that opens
 * full-screen. The name is the working name — change it here (and `appleWebApp`
 * in layout.tsx) if the product is renamed. The icons are drawn by
 * scripts/generate-icons.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mobile News Bureau",
    short_name: "News Bureau",
    description: "Capture, transcribe, and package reporting content.",
    start_url: "/",
    display: "standalone",
    background_color: "#15111f",
    theme_color: "#15111f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
