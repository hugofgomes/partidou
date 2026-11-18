"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

type Detail = { name: string; website: string | null; tagline: string | null; primary_color: string | null; logo_url: string | null; card_footer: string | null }

/** Edição do cadastro do cliente (nome, site, lema, cor e logo), direto da lista. Os dados atuais vêm do banco ao abrir. */
export function EditOrgDialog({ org, onClose, onSaved }: { org: { id: string; name: string } | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState({ name: "", website: "", tagline: "", color: "", logo: "" })
  const [footer, setFooter] = React.useState("")
  const [ready, setReady] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (!org) return
    setReady(false)
    supabase().rpc("sa_org_detail", { p_org: org.id }).then((r) => {
      if (r.error) { toast.error(r.error.message); onClose(); return }
      const o = (r.data as { org: Detail }).org
      setF({ name: o.name, website: o.website ?? "", tagline: o.tagline ?? "", color: o.primary_color ?? "", logo: o.logo_url ?? "" }); setFooter(o.card_footer ?? ""); setReady(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id])
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!org) return
    setBusy(true)
    const r = await supabase().rpc("sa_update_org", { p_org: org.id, p_name: f.name, p_website: f.website, p_tagline: f.tagline, p_primary_color: f.color, p_logo_url: f.logo, p_card_footer: footer })
    setBusy(false)
    if (r.error) return toast.error(r.error.message)
    toast.success("Cadastro salvo."); onSaved(); onClose()
  }
  return (
    <Dialog open={!!org} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar cliente</DialogTitle><DialogDescription>Nome e identidade do cliente. Plano, situação e contato do responsável ficam nas outras ações do menu.</DialogDescription></DialogHeader>
        {!ready ? <div className="grid h-40 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : (
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="e-n">Nome</Label><Input id="e-n" required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="e-w">Site</Label><Input id="e-w" maxLength={120} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="e-t">Lema</Label><Input id="e-t" maxLength={80} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="e-c">Cor principal</Label>
              <div className="flex gap-2"><Input id="e-c" placeholder="#002923" maxLength={7} value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
                <span aria-hidden className="size-9 shrink-0 rounded-md border" style={{ background: /^#[0-9a-f]{6}$/i.test(f.color) ? f.color : "transparent" }} /></div></div>
            <div className="space-y-1.5"><Label htmlFor="e-l">Endereço do logo (https://…)</Label><Input id="e-l" maxLength={300} value={f.logo} onChange={(e) => setF({ ...f, logo: e.target.value })} /></div>
            <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Salvar</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
