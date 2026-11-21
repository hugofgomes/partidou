"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Guardian } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { maskPhone, normalizePhone } from "@/lib/whatsapp"
import { Loader2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

const phoneShow = (v: string | null) => (v ? maskPhone(v.replace(/^55/, "")) : "")

/** Edição dos dados de um responsável (valem para todos os atletas ligados a ele). */
export function GuardianEdit({ guardian, onClose, onDone }: { guardian: Guardian; onClose: () => void; onDone: () => void }) {
  const [v, setV] = React.useState({ full_name: guardian.full_name, phone: phoneShow(guardian.phone), email: guardian.email ?? "", cpf: guardian.cpf ?? "", street: guardian.street ?? "", district: guardian.district ?? "", city: guardian.city ?? "", state: guardian.state ?? "", notes: guardian.notes ?? "" })
  const [busy, setBusy] = React.useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const ph = v.phone ? normalizePhone(v.phone) : null
    if (v.phone && !ph) return toast.error("Telefone inválido: informe com DDD.")
    setBusy(true)
    const r = await supabase().from("school_guardians").update({ full_name: v.full_name.trim(), phone: ph, email: v.email.trim().toLowerCase() || null, cpf: v.cpf.replace(/\D/g, "") || null, street: v.street.trim() || null, district: v.district.trim() || null, city: v.city.trim() || null, state: v.state || null, notes: v.notes.trim() || null }).eq("id", guardian.id)
    setBusy(false)
    if (r.error) return toast.error(/phone_check|check constraint/.test(r.error.message) ? "Informe telefone ou e-mail." : r.error.message.replace(/^.*?: /, ""))
    toast.success("Responsável atualizado."); onDone()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Editar responsável</DialogTitle><DialogDescription>Os dados valem para todos os atletas ligados a este responsável.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ge-n">Nome completo</Label><Input id="ge-n" required minLength={3} maxLength={120} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ge-p">Telefone/WhatsApp</Label><Input id="ge-p" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: maskPhone(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ge-e">E-mail</Label><Input id="ge-e" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ge-c">CPF <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="ge-c" inputMode="numeric" maxLength={14} value={v.cpf} onChange={(e) => setV({ ...v, cpf: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ge-s">Rua <span className="font-normal text-muted-foreground">(se necessário)</span></Label><Input id="ge-s" maxLength={150} value={v.street} onChange={(e) => setV({ ...v, street: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ge-d">Bairro</Label><Input id="ge-d" maxLength={80} value={v.district} onChange={(e) => setV({ ...v, district: e.target.value })} /></div>
          <div className="grid grid-cols-[1fr_4rem] gap-2"><div className="space-y-1.5"><Label htmlFor="ge-ci">Cidade</Label><Input id="ge-ci" maxLength={80} value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ge-uf">UF</Label><Input id="ge-uf" maxLength={2} value={v.state} onChange={(e) => setV({ ...v, state: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} /></div></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ge-o">Observações</Label><Input id="ge-o" maxLength={500} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
