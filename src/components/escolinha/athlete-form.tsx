"use client"

import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ATHLETE_STATUS, FEET, LEVELS, RELATIONSHIPS, ageAt, fitsCategory, type Athlete, type Category, type Guardian, type Position } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { maskPhone, normalizePhone } from "@/lib/whatsapp"
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

type G = { guardian_id: string; full_name: string; phone: string; email: string; cpf: string; relationship: string; is_legal: boolean; is_financial: boolean; is_emergency: boolean }
const NEW_G: G = { guardian_id: "", full_name: "", phone: "", email: "", cpf: "", relationship: "mae", is_legal: true, is_financial: true, is_emergency: true }
const digits = (s: string) => s.replace(/\D/g, "")
const today = () => new Date().toISOString().slice(0, 10)

function fromAthlete(a: Athlete | null) {
  return {
    full_name: a?.full_name ?? "", birth_date: a?.birth_date ?? "", cpf: a?.cpf ?? "", sex: a?.sex ?? "", phone: a?.phone ? maskPhone(a.phone.replace(/^55/, "")) : "", email: a?.email ?? "",
    cep: a?.cep ?? "", street: a?.street ?? "", number: a?.number ?? "", district: a?.district ?? "", city: a?.city ?? "", state: a?.state ?? "",
    enrolled_on: a?.enrolled_on ?? today(), status: a?.status ?? "ativo", category_id: a?.category_id ?? "", main_position: a?.main_position ?? "", secondary_position: a?.secondary_position ?? "",
    dominant_foot: a?.dominant_foot ?? "", height_cm: a?.height_cm?.toString() ?? "", weight_kg: a?.weight_kg?.toString() ?? "", shirt_number: a?.shirt_number?.toString() ?? "",
    practice_time: a?.practice_time ?? "", level: a?.level ?? "", coach_notes: a?.coach_notes ?? "",
  }
}

/** Cadastro e edição do atleta. Coleta só o necessário: CPF, sexo, telefone e e-mail são opcionais (LGPD). */
export function AthleteForm({ open, athlete, categories, positions, guardians = [], onClose, onSaved }: {
  open: boolean; athlete: Athlete | null; categories: Category[]; positions: Position[]; guardians?: Guardian[]; onClose: () => void; onSaved: (id: string) => void
}) {
  const [v, setV] = React.useState(() => fromAthlete(athlete))
  const [gs, setGs] = React.useState<G[]>([{ ...NEW_G }])
  const [busy, setBusy] = React.useState(false)
  const set = (k: keyof ReturnType<typeof fromAthlete>, x: string) => setV((s) => ({ ...s, [k]: x }))
  const age = v.birth_date ? ageAt(v.birth_date) : null
  const minor = age != null && age < 18
  const cat = categories.find((c) => c.id === v.category_id)
  const catWarn = cat && v.birth_date && !fitsCategory(v.birth_date, cat)
  // Sugere a categoria pela idade na data de corte quando ainda não foi escolhida.
  React.useEffect(() => {
    if (athlete || v.category_id || !v.birth_date) return
    const fit = categories.filter((c) => c.active && fitsCategory(v.birth_date, c)).sort((a, b) => b.season - a.season || a.max_age - b.max_age)[0]
    if (fit) setV((s) => ({ ...s, category_id: fit.id }))
  }, [v.birth_date]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const ph = v.phone ? normalizePhone(v.phone) : null
    if (v.phone && !ph) return toast.error("Telefone do atleta inválido: informe com DDD.")
    const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")))
    const row = {
      full_name: v.full_name.trim().replace(/\s+/g, " "), birth_date: v.birth_date, cpf: digits(v.cpf) || null, sex: v.sex || null, phone: ph, email: v.email.trim().toLowerCase() || null,
      cep: digits(v.cep) || null, street: v.street.trim() || null, number: v.number.trim() || null, district: v.district.trim() || null, city: v.city.trim() || null, state: v.state || null,
      enrolled_on: v.enrolled_on || today(), status: v.status, category_id: v.category_id || null, main_position: v.main_position || null, secondary_position: v.secondary_position || null,
      dominant_foot: v.dominant_foot || null, height_cm: num(v.height_cm), weight_kg: num(v.weight_kg), shirt_number: num(v.shirt_number), practice_time: v.practice_time.trim() || null,
      level: v.level || null, coach_notes: v.coach_notes.trim() || null,
    }
    let guardians: object[] = []
    if (!athlete) {
      const filled = gs.filter((g) => g.guardian_id || g.full_name.trim())
      for (const g of filled) {
        if (g.guardian_id) { guardians.push({ guardian_id: g.guardian_id, relationship: g.relationship, is_legal: g.is_legal, is_financial: g.is_financial, is_emergency: g.is_emergency }); continue }
        const gp = g.phone ? normalizePhone(g.phone) : null
        if (g.phone && !gp) return toast.error(`Telefone de ${g.full_name} inválido: informe com DDD.`)
        if (!gp && !g.email.trim()) return toast.error(`Informe telefone ou e-mail de ${g.full_name}.`)
        guardians.push({ full_name: g.full_name.trim(), phone: gp, email: g.email.trim(), cpf: digits(g.cpf), relationship: g.relationship, is_legal: g.is_legal, is_financial: g.is_financial, is_emergency: g.is_emergency })
      }
      if (minor && !filled.some((g) => g.is_legal)) return toast.error("Atleta menor de idade: informe pelo menos um responsável legal.")
      guardians = guardians.length ? guardians : []
    }
    setBusy(true)
    const sb = supabase()
    const r = athlete
      ? await sb.from("school_athletes").update(row).eq("id", athlete.id).select("id").single()
      : await sb.rpc("school_athlete_create", { p_athlete: row, p_guardians: guardians })
    setBusy(false)
    if (r.error) return toast.error(r.error.message.replace(/^.*?: /, ""))
    toast.success(athlete ? "Cadastro atualizado." : "Atleta cadastrado.")
    onSaved(athlete ? athlete.id : (r.data as string))
  }

  const posOpts = positions.filter((p) => p.active).sort((a, b) => a.sort_order - b.sort_order)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{athlete ? "Editar atleta" : "Novo atleta"}</DialogTitle><DialogDescription>Campos com * são obrigatórios. Colete só o que a escolinha realmente usa.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <fieldset className="grid gap-3 sm:grid-cols-6">
            <legend className="mb-2 text-sm font-semibold">Dados pessoais</legend>
            <div className="space-y-1.5 sm:col-span-4"><Label htmlFor="an">Nome completo *</Label><Input id="an" required minLength={3} maxLength={120} value={v.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ab">Nascimento *</Label><Input id="ab" type="date" required max={today()} value={v.birth_date} onChange={(e) => set("birth_date", e.target.value)} />{age != null && <p className="text-xs text-muted-foreground">{age} anos</p>}</div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ac">CPF <span className="font-normal text-muted-foreground">(se necessário)</span></Label><Input id="ac" inputMode="numeric" maxLength={14} value={v.cpf} onChange={(e) => set("cpf", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="as">Sexo <span className="font-normal text-muted-foreground">(se usado nas categorias)</span></Label><NativeSelect id="as" value={v.sex} onChange={(e) => set("sex", e.target.value)}><option value="">Não informar</option><option value="f">Feminino</option><option value="m">Masculino</option></NativeSelect></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ast">Situação</Label><NativeSelect id="ast" value={v.status} onChange={(e) => set("status", e.target.value)}>{ATHLETE_STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
            <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="ap">Telefone do atleta</Label><Input id="ap" inputMode="tel" value={v.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} /></div>
            <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="ae">E-mail do atleta</Label><Input id="ae" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="acep">CEP</Label><Input id="acep" inputMode="numeric" maxLength={9} value={v.cep} onChange={(e) => set("cep", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="ard">Rua</Label><Input id="ard" maxLength={150} value={v.street} onChange={(e) => set("street", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-1"><Label htmlFor="anu">Nº</Label><Input id="anu" maxLength={20} value={v.number} onChange={(e) => set("number", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="abai">Bairro</Label><Input id="abai" maxLength={80} value={v.district} onChange={(e) => set("district", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="aci">Cidade</Label><Input id="aci" maxLength={80} value={v.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-1"><Label htmlFor="auf">UF</Label><Input id="auf" maxLength={2} value={v.state} onChange={(e) => set("state", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="amat">Data da matrícula</Label><Input id="amat" type="date" value={v.enrolled_on} onChange={(e) => set("enrolled_on", e.target.value)} /></div>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-6">
            <legend className="mb-2 text-sm font-semibold">Dados esportivos</legend>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="acat">Categoria</Label><NativeSelect id="acat" value={v.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">—</option>{categories.filter((c) => c.active || c.id === v.category_id).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.season}</option>)}</NativeSelect>
              {catWarn && <p className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="size-3" /> Idade fora da faixa desta categoria na data de corte.</p>}</div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="apos">Posição principal</Label><NativeSelect id="apos" value={v.main_position} onChange={(e) => set("main_position", e.target.value)}><option value="">—</option>{posOpts.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}</NativeSelect></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="apos2">Posição secundária</Label><NativeSelect id="apos2" value={v.secondary_position} onChange={(e) => set("secondary_position", e.target.value)}><option value="">—</option>{posOpts.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}</NativeSelect></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ape">Pé dominante</Label><NativeSelect id="ape" value={v.dominant_foot} onChange={(e) => set("dominant_foot", e.target.value)}><option value="">—</option>{FEET.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="aniv">Nível técnico</Label><NativeSelect id="aniv" value={v.level} onChange={(e) => set("level", e.target.value)}><option value="">—</option>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="acam">Nº da camisa</Label><Input id="acam" type="number" min={0} max={99} value={v.shirt_number} onChange={(e) => set("shirt_number", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="aalt">Altura (cm)</Label><Input id="aalt" type="number" min={50} max={230} value={v.height_cm} onChange={(e) => set("height_cm", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="apeso">Peso (kg)</Label><Input id="apeso" type="number" min={10} max={200} step="0.1" value={v.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="atp">Tempo de prática</Label><Input id="atp" maxLength={40} placeholder="Ex.: 2 anos" value={v.practice_time} onChange={(e) => set("practice_time", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-6"><Label htmlFor="aobs">Observações do treinador</Label><textarea id="aobs" maxLength={2000} rows={2} className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={v.coach_notes} onChange={(e) => set("coach_notes", e.target.value)} /></div>
          </fieldset>

          {!athlete && (
            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm font-semibold">Responsáveis {minor ? <span className="font-normal text-destructive">* obrigatório para menores de 18 anos</span> : <span className="font-normal text-muted-foreground">(opcional para maiores de idade)</span>}</legend>
              {gs.map((g, i) => {
                const up = (p: Partial<G>) => setGs((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)))
                return (
                  <div key={i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-6">
                    {guardians.length > 0 && <div className="space-y-1.5 sm:col-span-6"><Label htmlFor={`gx${i}`}>Responsável</Label><NativeSelect id={`gx${i}`} value={g.guardian_id} onChange={(e) => up({ guardian_id: e.target.value })}><option value="">Novo responsável</option>{guardians.map((x) => <option key={x.id} value={x.id}>{x.full_name}{x.phone ? ` · ${maskPhone(x.phone.replace(/^55/, ""))}` : ""}</option>)}</NativeSelect></div>}
                    {g.guardian_id ? <div className="space-y-1.5 sm:col-span-4 self-end text-sm text-muted-foreground">Responsável já cadastrado (irmãos usam o mesmo cadastro).</div>
                      : <div className="space-y-1.5 sm:col-span-4"><Label htmlFor={`gn${i}`}>Nome do responsável</Label><Input id={`gn${i}`} maxLength={120} value={g.full_name} onChange={(e) => up({ full_name: e.target.value })} /></div>}
                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`gr${i}`}>Parentesco</Label><NativeSelect id={`gr${i}`} value={g.relationship} onChange={(e) => up({ relationship: e.target.value })}>{RELATIONSHIPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
                    {!g.guardian_id && <>
                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`gp${i}`}>Telefone/WhatsApp</Label><Input id={`gp${i}`} inputMode="tel" value={g.phone} onChange={(e) => up({ phone: maskPhone(e.target.value) })} /></div>
                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`ge${i}`}>E-mail</Label><Input id={`ge${i}`} type="email" value={g.email} onChange={(e) => up({ email: e.target.value })} /></div>
                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`gc${i}`}>CPF <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id={`gc${i}`} inputMode="numeric" maxLength={14} value={g.cpf} onChange={(e) => up({ cpf: e.target.value })} /></div>
                    </>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:col-span-6">
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={g.is_legal} onChange={(e) => up({ is_legal: e.target.checked })} /> Responsável legal</label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={g.is_financial} onChange={(e) => up({ is_financial: e.target.checked })} /> Responsável financeiro</label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={g.is_emergency} onChange={(e) => up({ is_emergency: e.target.checked })} /> Contato de emergência</label>
                      {gs.length > 1 && <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => setGs((l) => l.filter((_, j) => j !== i))}><Trash2 className="size-4" /> Remover</Button>}
                    </div>
                  </div>
                )
              })}
              <Button type="button" size="sm" variant="outline" onClick={() => setGs((l) => [...l, { ...NEW_G, relationship: "pai", is_financial: false }])}><Plus className="size-4" /> Outro responsável</Button>
            </fieldset>
          )}

          <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
