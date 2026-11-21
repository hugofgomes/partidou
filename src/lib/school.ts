"use client"

import { supabase } from "@/lib/supabase/client"

/** Módulo Escolinhas de Futebol: rótulos, cálculos e acesso às fotos privadas. */
export type SchoolRole = "admin" | "coordenador" | "financeiro" | "treinador"
export const SCHOOL_ROLE_LABEL: Record<SchoolRole, string> = { admin: "Administrador", coordenador: "Coordenação", financeiro: "Financeiro", treinador: "Treinador" }

export const ATHLETE_STATUS: [string, string][] = [["ativo", "Ativo"], ["inativo", "Inativo"], ["suspenso", "Suspenso"], ["transferido", "Transferido"]]
export const STATUS_CLS: Record<string, string> = { ativo: "bg-green-100 text-green-900", inativo: "bg-slate-200 text-slate-700", suspenso: "bg-amber-100 text-amber-900", transferido: "bg-sky-100 text-sky-900" }
export const FEET: [string, string][] = [["direito", "Direito"], ["esquerdo", "Esquerdo"], ["ambidestro", "Ambidestro"]]
export const LEVELS: [string, string][] = [["iniciante", "Iniciante"], ["intermediario", "Intermediário"], ["avancado", "Avançado"]]
export const RELATIONSHIPS: [string, string][] = [["mae", "Mãe"], ["pai", "Pai"], ["avo", "Avó/Avô"], ["tio", "Tia/Tio"], ["irmao", "Irmã/Irmão"], ["tutor", "Tutor legal"], ["outro", "Outro"]]
export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
export const label = (list: [string, string][], v: string | null | undefined) => (v ? list.find(([k]) => k === v)?.[1] ?? v : "—")

export type Position = { code: string; label: string; is_keeper: boolean; sport: string; active: boolean; sort_order: number }
export type Category = { id: string; name: string; min_age: number; max_age: number; season: number; cutoff_date: string | null; active: boolean; notes: string | null }
export type Coach = { id: string; full_name: string; photo_path: string | null; phone: string | null; email: string | null; specialty: string | null; education: string | null; professional_reg: string | null; availability: string | null; notes: string | null; status: string; profile_id: string | null }
export type SchoolClass = { id: string; name: string; category_id: string | null; unit_id: string | null; coach_id: string | null; assistant_id: string | null; weekdays: number[]; start_min: number | null; end_min: number | null; location: string | null; capacity: number; fee_cents: number | null; status: string }
export type Unit = { id: string; name: string; street: string | null; district: string | null; city: string | null; state: string | null; active: boolean }
export type Athlete = {
  id: string; enrollment_no: number; full_name: string; birth_date: string; cpf: string | null; sex: string | null; cep: string | null; street: string | null; number: string | null
  district: string | null; city: string | null; state: string | null; phone: string | null; email: string | null; enrolled_on: string; status: string; photo_path: string | null
  sport: string; category_id: string | null; main_position: string | null; secondary_position: string | null; dominant_foot: string | null; height_cm: number | null
  weight_kg: number | null; shirt_number: number | null; practice_time: string | null; level: string | null; coach_notes: string | null; created_at: string
}
export type Guardian = { id: string; full_name: string; cpf: string | null; phone: string | null; email: string | null; street: string | null; district: string | null; city: string | null; state: string | null; notes: string | null }
export type GuardianLink = { athlete_id: string; guardian_id: string; relationship: string; is_legal: boolean; is_financial: boolean; is_emergency: boolean }

/** Idade em anos completos numa data (hoje, por padrão). */
export function ageAt(birth: string, at = new Date()) {
  const [y, m, d] = birth.split("-").map(Number)
  let a = at.getFullYear() - y
  if (at.getMonth() + 1 < m || (at.getMonth() + 1 === m && at.getDate() < d)) a--
  return a
}
/** A idade do atleta na data de corte da categoria cabe na faixa? */
export function fitsCategory(birth: string, c: Category) {
  const cut = c.cutoff_date ? new Date(c.cutoff_date + "T12:00:00") : new Date(c.season, 11, 31, 12)
  const a = ageAt(birth, cut)
  return a >= c.min_age && a <= c.max_age
}
export const minToHHMM = (m: number | null) => (m == null ? "" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`)
export const hhmmToMin = (s: string) => { const [h, m] = s.split(":").map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null }
export const schedule = (c: Pick<SchoolClass, "weekdays" | "start_min" | "end_min">) =>
  [c.weekdays.length ? c.weekdays.map((d) => WEEKDAYS[d]).join(", ") : "", c.start_min != null ? `${minToHHMM(c.start_min)}${c.end_min != null ? `–${minToHHMM(c.end_min)}` : ""}` : ""].filter(Boolean).join(" · ") || "Sem horário"
export const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("")
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
export const dateBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—")

// ───────── Fotos privadas (bucket "escolinhas"): nada é público, a tela usa links que expiram ─────────
const BUCKET = "escolinhas"
const cache = new Map<string, { url: string; exp: number }>()
/** Links temporários (1 hora) para várias fotos de uma vez; guarda em memória para não pedir de novo a cada tela. */
export async function signedUrls(paths: (string | null | undefined)[]) {
  const now = Date.now(), out: Record<string, string> = {}
  const need = [...new Set(paths.filter((p): p is string => !!p))].filter((p) => { const c = cache.get(p); if (c && c.exp > now) { out[p] = c.url; return false } return true })
  if (need.length) {
    const { data } = await supabase().storage.from(BUCKET).createSignedUrls(need, 3600)
    for (const r of data ?? []) if (r.path && r.signedUrl) { cache.set(r.path, { url: r.signedUrl, exp: now + 50 * 60_000 }); out[r.path] = r.signedUrl }
  }
  return out
}
/** Envia a foto já recortada e comprimida para a pasta da escolinha; devolve o caminho a gravar no cadastro. */
export async function uploadSchoolImage(tenantId: string, kind: "atletas" | "treinadores" | "logo", blob: Blob, previous?: string | null) {
  const path = `${tenantId}/${kind}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase().storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false })
  if (error) throw new Error(error.message)
  if (previous) await supabase().storage.from(BUCKET).remove([previous]).catch(() => {})
  return path
}
export async function removeSchoolImage(path: string | null | undefined) { if (path) await supabase().storage.from(BUCKET).remove([path]).catch(() => {}) }
