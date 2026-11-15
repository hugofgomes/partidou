import { APP_URL, SITE_URL, isMarketingHost } from "@/lib/site-config"
import type { MetadataRoute } from "next"
import { headers } from "next/headers"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host") ?? ""
  const entries = (base: string, pages: [string, number][]) => pages.map(([p, priority]) => ({ url: base + p, changeFrequency: "weekly" as const, priority }))
  if (isMarketingHost(host)) return entries(SITE_URL, [["/", 1], ["/privacidade", 0.3], ["/termos", 0.3], ["/cookies", 0.3]])
  return entries(APP_URL, [["/quadras", 1], ["/privacidade", 0.3], ["/termos", 0.3], ["/cookies", 0.3]])
}
