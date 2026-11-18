import { APP_URL } from "@/lib/site-config"
import { addressLine, sportName, venueHoursOn, type PubMatch, type PubVenue } from "@/lib/court-public"
import { fmtMinutes } from "@/lib/court-time"
import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CentroPublico } from "./centro-publico"

/** Página pública do centro esportivo. O servidor busca os dados (funções públicas do banco, chave anônima) para:
 *  título/descrição/Open Graph próprios de cada centro (prévia no WhatsApp), dados estruturados e primeira pintura já com conteúdo.
 *  A parte interativa (agenda, reserva) continua no cliente, com as mesmas funções e regras do banco. */
export const dynamic = "force-dynamic"

async function load(slug: string): Promise<{ venue: PubVenue | null; matches: PubMatch[] } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const [v, m] = await Promise.all([sb.rpc("court_public_venue", { p_slug: slug }), sb.rpc("court_public_matches", { p_slug: slug })])
  if (v.error) return null
  return { venue: (v.data ?? null) as PubVenue | null, matches: (m.data ?? []) as PubMatch[] }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await load(slug)
  const v = d?.venue
  if (!v) return { title: "Centro esportivo · Partigol", robots: { index: false } }
  const sports = [...new Set(v.courts.map((c) => sportName(c.sport)))].join(", ")
  const city = [v.venue.city, v.venue.state].filter(Boolean).join("/")
  const title = `${v.venue.name}${city ? ` em ${city}` : ""} · Reserve sua quadra | Partigol`
  const description = (v.venue.description?.trim().slice(0, 150) || `Reserve online ${v.courts.length > 1 ? `uma das ${v.courts.length} quadras` : "a quadra"} da ${v.venue.name}${sports ? ` (${sports.toLowerCase()})` : ""}${city ? ` em ${city}` : ""}. Veja horários livres e preços.`)
  const image = v.courts.find((c) => c.photos[0])?.photos[0] ?? v.venue.logo_url ?? `${APP_URL}/brand/og-partigol.png`
  const url = `${APP_URL}/quadras/${v.slug}`
  return {
    metadataBase: new URL(APP_URL), title: { absolute: title }, description, alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: "Partigol", locale: "pt_BR", title: `${v.venue.name} · Reserve sua quadra`, description, images: [{ url: image, alt: v.venue.name }] },
    twitter: { card: "summary_large_image", title: `${v.venue.name} · Reserve sua quadra`, description, images: [image] },
  }
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await load(slug)
  if (d && d.venue === null) notFound()   // centro inexistente ou não publicado: 404 de verdade (fora do Google)
  const v = d?.venue
  const jsonLd = v ? {
    "@context": "https://schema.org", "@type": "SportsActivityLocation", name: v.venue.name, url: `${APP_URL}/quadras/${v.slug}`,
    ...(v.venue.description ? { description: v.venue.description } : {}),
    ...(v.venue.logo_url || v.courts.find((c) => c.photos[0]) ? { image: [v.venue.logo_url, ...v.courts.flatMap((c) => c.photos.slice(0, 1))].filter(Boolean) } : {}),
    ...(v.venue.phone || v.venue.whatsapp ? { telephone: v.venue.phone ?? v.venue.whatsapp } : {}),
    address: { "@type": "PostalAddress", streetAddress: [v.venue.street, v.venue.number].filter(Boolean).join(", ") || undefined, addressLocality: v.venue.city ?? undefined, addressRegion: v.venue.state ?? undefined, postalCode: v.venue.cep ?? undefined, addressCountry: "BR" },
    ...(v.venue.latitude != null && v.venue.longitude != null ? { geo: { "@type": "GeoCoordinates", latitude: v.venue.latitude, longitude: v.venue.longitude } } : {}),
    openingHoursSpecification: [0, 1, 2, 3, 4, 5, 6].map((wd) => ({ wd, h: venueHoursOn(v.hours, wd) })).filter((x) => x.h).map(({ wd, h }) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[wd], opens: fmtMinutes(h!.opens), closes: fmtMinutes(h!.closes) })),
    hasMap: v.venue.latitude != null ? `https://www.google.com/maps?q=${v.venue.latitude},${v.venue.longitude}` : `https://www.google.com/maps/search/${encodeURIComponent(addressLine(v.venue))}`,
  } : null
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <Suspense>
        <CentroPublico slug={slug} initial={d ? d.venue : undefined} initialMatches={d?.matches ?? []} />
      </Suspense>
    </>
  )
}
