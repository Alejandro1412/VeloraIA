import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Velora · Recepcionista IA",
    short_name: "Velora",
    description: "Tu agenda, tus clientes y tu recepcionista con IA, en el bolsillo.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e1b3d",
    theme_color: "#0e1b3d",
    lang: "es-CO",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda", url: "/app/agenda", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Nueva cita", url: "/app/agenda?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Avisos", url: "/app/notificaciones", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
