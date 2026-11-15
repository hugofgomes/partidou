import { SITE_URL, APP_URL, isMarketingHost } from "@/lib/site-config"
import type { MetadataRoute } from "next"
import { headers } from "next/headers"

/** robots.txt por endereço: o site comercial é indexável; no sistema só a busca pública e os textos legais. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host") ?? ""
  if (isMarketingHost(host)) return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }], sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL }
  return { rules: [{ userAgent: "*", allow: ["/quadras", "/privacidade", "/termos", "/cookies"], disallow: ["/partida/", "/api/", "/super", "/quadra", "/assinatura", "/login"] }], sitemap: `${APP_URL}/sitemap.xml` }
}
