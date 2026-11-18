import { APP_URL } from "@/lib/site-config"
import { LEVEL_LABEL, POSITION_LABEL, SPORT_LABEL, type Game } from "@/lib/jogo"
import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import { cache } from "react"
import { GamePage } from "./partida"

/** Página pública da partida: o servidor gera título, descrição, Open Graph (prévia no WhatsApp) e dados estruturados SportsEvent.
 *  A parte interativa (Quero Jogar, situação do jogador) continua no cliente, com as funções do banco. */
const load = cache(async (id: string): Promise<Game | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const r = await sb.rpc("game_get", { p_game: id })
  return (r.data ?? null) as Game | null
})
const when = (g: Game) => new Intl.DateTimeFormat("pt-BR", { timeZone: g.timezone, weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(g.starts_at))

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const g = await load(id)
  if (!g) return { title: { absolute: "Partida | Partigol" }, robots: { index: false } }
  const left = Math.max(0, g.slots_total - g.approved)
  const needs = g.needs.filter((n) => n.quantity > n.filled).map((n) => `${n.quantity - n.filled} ${(POSITION_LABEL[n.position] ?? n.position).toLowerCase()}`).join(", ")
  const title = `${g.title} · ${SPORT_LABEL[g.sport] ?? g.sport} em ${g.city}/${g.state} | Partigol`
  const description = `${when(g)} em ${g.location_name}. ${left > 0 ? `${left} vaga(s) aberta(s)` : "Partida completa"}${needs ? `: precisamos de ${needs}` : ""}.${g.level ? ` Nível ${LEVEL_LABEL[g.level]}.` : ""} Peça sua vaga no Partigol.`
  const url = `${APP_URL}/jogos/${g.id}`
  const closed = g.closed || g.status !== "aberta"
  return { metadataBase: new URL(APP_URL), title: { absolute: title }, description, alternates: { canonical: url }, robots: closed ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", url, siteName: "Partigol", locale: "pt_BR", title: `${g.title}: ${left > 0 ? `faltam ${left}!` : "completa"}`, description, images: ["/brand/og-partigol.png"] },
    twitter: { card: "summary_large_image", title: g.title, description, images: ["/brand/og-partigol.png"] } }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await load(id)
  const jsonLd = g ? {
    "@context": "https://schema.org", "@type": "SportsEvent", name: g.title, sport: SPORT_LABEL[g.sport] ?? g.sport, startDate: g.starts_at, endDate: g.ends_at,
    eventStatus: g.status === "cancelada" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${APP_URL}/jogos/${g.id}`, description: g.description ?? `Partida de ${SPORT_LABEL[g.sport] ?? g.sport} com vagas abertas no Partigol.`,
    location: { "@type": "Place", name: g.location_name, address: { "@type": "PostalAddress", streetAddress: g.address ?? undefined, addressLocality: g.city, addressRegion: g.state, addressCountry: "BR" } },
    organizer: { "@type": "Person", name: g.organizer },
    maximumAttendeeCapacity: g.slots_total, remainingAttendeeCapacity: Math.max(0, g.slots_total - g.approved),
    ...(g.price_cents ? { offers: { "@type": "Offer", price: (g.price_cents / 100).toFixed(2), priceCurrency: "BRL", url: `${APP_URL}/jogos/${g.id}` } } : {}),
  } : null
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <GamePage />
    </>
  )
}
