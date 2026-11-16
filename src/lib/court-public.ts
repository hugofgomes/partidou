/** Tipos e utilitários das páginas públicas das quadras (sem dados privados: tudo vem das funções públicas do banco). */
export type PubVenue = {
  slug: string
  venue: { name: string; description: string | null; logo_url: string | null; phone: string | null; whatsapp: string | null; email: string | null; website: string | null; instagram: string | null; facebook: string | null
    street: string | null; number: string | null; complement: string | null; district: string | null; city: string | null; state: string | null; cep: string | null; latitude: number | null; longitude: number | null
    timezone: string; slot_minutes: number; min_duration_minutes: number; min_notice_minutes: number; max_advance_days: number; cancel_free_hours: number; cancel_fee_pct: number; auto_confirm: boolean }
  courts: { id: string; name: string; description: string | null; sport: string; floor_type: string | null; covered: boolean; lighting: boolean; capacity: number | null; photos: string[]; price_cents: number }[]
  prices: { court_id: string | null; name: string; weekdays: number[]; from_min: number; to_min: number; price_cents: number }[]
  hours: { court_id: string | null; weekday: number; opens_min: number; closes_min: number }[]
}
export type PubSlot = { court_id: string; start_min: number; end_min: number; price_cents: number }
export type PubMatch = { id: string; title: string; description: string | null; court: string; sport: string | null; starts_at: string; ends_at: string; slots_total: number; approved: number }

export const FLOOR_LABEL: Record<string, string> = { grama_sintetica: "Grama sintética", grama_natural: "Grama natural", cimento: "Cimento", madeira: "Madeira", areia: "Areia", saibro: "Saibro", borracha: "Borracha", outro: "Outro" }
export const addressLine = (v: PubVenue["venue"]) => [[v.street, v.number].filter(Boolean).join(", "), v.complement, v.district, [v.city, v.state].filter(Boolean).join("/")].filter(Boolean).join(" · ")
export const onlyDigits = (s: string) => s.replace(/\D/g, "")
export const waNumber = (v: string | null) => { const d = onlyDigits(v ?? ""); return d ? (d.length <= 11 ? "55" + d : d) : "" }

/** Rótulos de modalidade utilizáveis no servidor (mesma lista de SPORTS em hooks/use-court-role). */
export const SPORT_LABEL: Record<string, string> = { futebol_society: "Futebol society", futsal: "Futsal", futebol_campo: "Futebol de campo", volei: "Vôlei", volei_praia: "Vôlei de praia", beach_tennis: "Beach tennis", basquete: "Basquete", tenis: "Tênis", padel: "Padel", outra: "Outra modalidade" }
export const sportName = (v: string) => SPORT_LABEL[v] ?? v

/** Horário de funcionamento do centro num dia da semana (união das faixas de todas as quadras). */
export function venueHoursOn(hours: PubVenue["hours"], weekday: number) {
  const hs = hours.filter((h) => h.weekday === weekday)
  return hs.length ? { opens: Math.min(...hs.map((h) => h.opens_min)), closes: Math.max(...hs.map((h) => h.closes_min)) } : null
}
