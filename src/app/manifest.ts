import type { MetadataRoute } from "next"

/** App instalável (PWA): aparece como "Instalar app" no Android/Chrome e "Adicionar à Tela de Início" no iPhone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Partidou · Gestão de quadras",
    short_name: "Partidou",
    description: "Agenda, reservas e financeiro do seu centro esportivo.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#142C25",
    theme_color: "#142C25",
    categories: ["sports", "business", "productivity"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda", short_name: "Agenda", url: "/quadra/agenda", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
      { name: "Reservas", short_name: "Reservas", url: "/quadra/reservas", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
    ],
  }
}
