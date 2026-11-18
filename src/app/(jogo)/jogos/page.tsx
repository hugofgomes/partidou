import { FILTER_KEYS, type Filters, type Game } from "@/lib/jogo"
import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import { Descobrir } from "./descobrir"

export const metadata: Metadata = {
  metadataBase: new URL("https://app.partidou.com.br"),
  title: { absolute: "Encontre um jogo perto de você | Partigol" },
  description: "Descubra partidas de futebol society, futsal e outras modalidades com vagas abertas. Encontre sua posição e entre em campo.",
  alternates: { canonical: "https://app.partidou.com.br/jogos" },
  openGraph: { title: "Encontre seu próximo jogo! | Partigol", description: "Partidas com vagas abertas perto de você.", url: "https://app.partidou.com.br/jogos", siteName: "Partigol", locale: "pt_BR", images: ["/brand/og-partigol.png"] },
}

/** O servidor lê os filtros do endereço e já entrega a lista de partidas (página pronta para o celular e para o Google). */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "")
  const initial = Object.fromEntries(FILTER_KEYS.map((k) => [k, one(k).slice(0, 80)])) as unknown as Filters
  initial.with_slots = one("lotadas") !== "1"
  let games: Game[] = []
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && key) {
    const p: Record<string, string | boolean> = { with_slots: initial.with_slots }
    for (const k of FILTER_KEYS) if (initial[k]) p[k] = initial[k]
    const r = await createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).rpc("games_search", { p })
    games = (r.data ?? []) as Game[]
  }
  return <Descobrir initial={initial} initialGames={games} />
}
