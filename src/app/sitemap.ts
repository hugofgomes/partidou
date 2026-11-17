import { APP_URL, SITE_URL, isMarketingHost } from "@/lib/site-config"
import { createClient } from "@supabase/supabase-js"
import type { MetadataRoute } from "next"
import { headers } from "next/headers"

export const revalidate = 3600

/** Mapa do site por endereço. No sistema, além das páginas fixas, entram os centros com página publicada e as partidas abertas (dados públicos, chave anônima). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host") ?? ""
  const entries = (base: string, pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][]) => pages.map(([p, priority, changeFrequency]) => ({ url: base + p, changeFrequency, priority }))
  if (isMarketingHost(host)) return entries(SITE_URL, [["/", 1, "weekly"], ["/privacidade", 0.3, "yearly"], ["/termos", 0.3, "yearly"], ["/cookies", 0.3, "yearly"]])
  const fixed = entries(APP_URL, [["/jogos", 1, "hourly"], ["/quadras", 0.9, "daily"], ["/cadastro", 0.7, "monthly"], ["/login", 0.4, "monthly"], ["/privacidade", 0.2, "yearly"], ["/termos", 0.2, "yearly"], ["/cookies", 0.2, "yearly"]])
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return fixed
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const [venues, games] = await Promise.all([sb.rpc("court_public_search", {}), sb.rpc("games_search", { p: {} })])
    const v = ((venues.data ?? []) as { slug: string }[]).map((x) => ({ url: `${APP_URL}/quadras/${x.slug}`, changeFrequency: "daily" as const, priority: 0.8 }))
    const g = ((games.data ?? []) as { id: string }[]).map((x) => ({ url: `${APP_URL}/jogos/${x.id}`, changeFrequency: "hourly" as const, priority: 0.7 }))
    return [...fixed, ...v, ...g]
  } catch { return fixed }
}
