"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import * as React from "react"
import { toast } from "sonner"

const dt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—")
type Check = { users: number; courts: number; bookings: number; clients: number; staff: number; receivables: number; court_payments: number; athletes: number; has_subscription: boolean; paid_until: string | null; mine: boolean }

/** Confirmação de exclusão de cliente (lógica ou definitiva): mostra o que será afetado, oferece exportar e exige digitar o nome. */
export function DeleteDialog({ org, mode, onClose, onDone }: { org: { id: string; name: string; slug: string }; mode: "soft" | "purge" | null; onClose: () => void; onDone: (purged: boolean) => void }) {
  const [chk, setChk] = React.useState<Check | null>(null)
  const [name, setName] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [days, setDays] = React.useState("30")
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (!mode) return
    setName(""); setReason(""); setDays("30"); setChk(null)
    supabase().rpc("sa_org_delete_check", { p_org: org.id }).then((r) => { if (r.error) toast.error(r.error.message); else setChk(r.data as Check) })
  }, [mode, org.id])
  async function exportAll() {
    const r = await supabase().rpc("sa_org_export", { p_org: org.id })
    if (r.error) return toast.error(r.error.message)
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" }))
    a.download = `${org.slug}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href)
    toast.success("Exportação gerada. Guarde o arquivo em local seguro: contém dados pessoais.")
  }
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    const r = mode === "purge"
      ? await supabase().rpc("sa_purge_org", { p_org: org.id, p_confirm_name: name })
      : await supabase().rpc("sa_delete_org", { p_org: org.id, p_confirm_name: name, p_reason: reason, p_retention_days: Number(days) })
    setBusy(false)
    if (r.error) return toast.error(r.error.message)
    toast.success(mode === "purge" ? "Cliente excluído definitivamente." : "Cliente excluído. Ele pode ser restaurado até o fim do prazo.")
    onDone(mode === "purge")
  }
  const purge = mode === "purge"
  return (
    <Dialog open={!!mode} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{purge ? "Excluir definitivamente" : "Excluir cliente"} — {org.name}</DialogTitle>
          <DialogDescription>{purge ? "Esta ação apaga todos os dados do cliente e NÃO pode ser desfeita." : "O acesso é bloqueado e os dados ficam guardados durante o prazo de recuperação; depois dele, a exclusão definitiva fica disponível."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid gap-3">
          {chk && (
            <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Dados afetados</p>
              <p>{chk.courts ?? 0} quadra(s) · {chk.bookings ?? 0} reserva(s) · {chk.clients ?? 0} cliente(s) · {chk.staff ?? 0} funcionário(s) · {chk.users} usuário(s) · {chk.receivables ?? 0} lançamento(s) · {chk.court_payments ?? 0} pagamento(s)</p>
              {(chk.athletes ?? 0) > 0 && <p>Também há {chk.athletes} registro(s) de atletas (dados herdados).</p>}
              {chk.has_subscription && <p>⚠ Há assinatura no Asaas{chk.paid_until ? ` (paga até ${dt(chk.paid_until)})` : ""}. Cancele-a no Asaas para não continuar cobrando.</p>}
              {chk.mine && <p>⚠ Você pertence a este cliente: a exclusão será recusada.</p>}
            </div>
          )}
          <Button type="button" variant="outline" onClick={exportAll}>Exportar dados do cliente (JSON)</Button>
          {!purge && <>
            <div className="space-y-1.5"><Label htmlFor="d-r">Motivo</Label><Input id="d-r" maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="d-d">Prazo de recuperação (dias, 7 a 365)</Label><Input id="d-d" type="number" min={7} max={365} value={days} onChange={(e) => setDays(e.target.value)} required /></div>
          </>}
          <div className="space-y-1.5"><Label htmlFor="d-n">Digite o nome do cliente para confirmar: <b>{org.name}</b></Label><Input id="d-n" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={busy || name.trim() !== org.name || (!purge && !reason.trim())}>{purge ? "Excluir definitivamente" : "Excluir cliente"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
