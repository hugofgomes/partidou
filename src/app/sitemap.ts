import type { MetadataRoute } from "next"

const BASE = "https://app.partidou.com.br"

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number][] = [["/quadras", 1], ["/privacidade", 0.3], ["/termos", 0.3]]
  return pages.map(([p, priority]) => ({ url: BASE + p, changeFrequency: "weekly", priority }))
}
