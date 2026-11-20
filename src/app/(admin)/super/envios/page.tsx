"use client"

import { NativeSelect } from "@/components/native-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLoad } from "@/hooks/use-load"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"
import * as React from "react"

type Row = { source: string; at: string; recipient: string | null; person: string | null; org_name: string | null; kind: string; title: string | null; status: string; error: string | null; attempts: number | null; sent_at: string | null }
type Provider = { available: boolean; reason?: string; emails?: { id: string; to: string; subject: string; created_at: string; status: string }[] }

const SOURCE: Record<string, string> = { jogo: "E-mail · Encontre um Jogo", app: "Aviso no app", vencimento: "E-mail · Vencimento", comunicado: "E-mail · Comunicado" }
const KIND: Record<string, string> = {
  convite: "Convite para partida", convite_recebido: "Convite recebido", solicitacao_recebida: "Pedido de vaga recebido", nova_solicitacao: "Novo pedido de vaga",
  participacao_aprovada: "Vaga aprovada", solicitacao_aprovada: "Vaga aprovada", solicitacao_recusada: "Pedido de vaga recusado", convite_aceito: "Convite aceito",
  convite_recusado: "Convite recusado", partida_cancelada: "Partida cancelada", partida_alterada: "Partida alterada", participante_cancelou: "Participante desistiu",
  participacao_removida: "Removido da partida", vagas_preenchidas: "Vagas preenchidas", trial_3d: "Teste termina em 3 dias", trial_1d: "Último dia do teste",
  trial_fim: "Teste terminou", inadimplencia: "Pagamento pendente", comunicado: "Comunicado",
}
// Status do banco e do Resend em linguagem simples, com a cor do resultado.
const STATUS: Record<string, [string, "ok" | "wait" | "bad" | "info"]> = {
  enviado: ["Enviado", "ok"], enviada: ["Enviado", "ok"], lido: ["Lido", "ok"], nao_lido: ["Não lido", "info"], pendente: ["Na fila", "wait"], enviando: ["Enviando", "wait"],
  falhou: ["Falhou", "bad"], falha: ["Falhou", "bad"], erro: ["Falhou", "bad"], ignorado: ["Não enviado", "info"],
  delivered: ["Entregue", "ok"], opened: ["Aberto", "ok"], clicked: ["Clicado", "ok"], sent: ["Enviado", "ok"], queued: ["Na fila", "wait"], scheduled: ["Agendado", "wait"],
  delivery_delayed: ["Atrasado", "wait"], bounced: ["Devolvido", "bad"], complained: ["Marcado como spam", "bad"], failed: ["Falhou", "bad"], canceled: ["Cancelado", "info"],
}
const TONE = { ok: "bg-green-100 text-green-800", wait: "bg-amber-100 text-amber-800", bad: "bg-red-100 text-red-800", info: "bg-secondary text-secondary-foreground" }
const TZ = "America/Sao_Paulo"
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ }) : "—")

function Status({ s }: { s: string }) {
  const [label, tone] = STATUS[s] ?? [s, "info" as const]
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONE[tone])}>{label}</span>
}
function Stat({ label, value, hint, bad }: { label: string; value: number; hint?: string; bad?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3.5 shadow-sm sm:p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tracking-tight tabular-nums sm:text-2xl", bad && value > 0 ? "text-destructive" : "text-primary")}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Envios: tudo o que o sistema mandou (ou tentou mandar) às pessoas, com o resultado. Só o dono da plataforma (o banco recusa os demais). */
export default function EnviosPage() {
  const [days, setDays] = React.useState(30)
  const [tab, setTab] = React.useState<string>("")
  const [q, setQ] = React.useState("")
  const log = useLoad(async () => {
    const r = await supabase().rpc("sa_notification_log", { p_days: days, p_source: null })
    if (r.error) throw new Error(r.error.message)
    return (r.data ?? []) as Row[]
  }, [days])
  const prov = useLoad(async () => {
    const r = await fetch("/api/super/envios/provedor", { cache: "no-store" })
    const d = (await r.json().catch(() => ({}))) as Provider & { error?: string }
    if (!r.ok) throw new Error(d.error ?? `Erro ${r.status}`)
    return d
  }, [])
  const reload = () => { log.reload(); prov.reload() }

  const all = log.data ?? []
  const mails = all.filter((r) => r.source !== "app")
  const sent = mails.filter((r) => r.status === "enviado" || r.status === "enviada").length
  const failed = mails.filter((r) => ["falhou", "falha", "erro"].includes(r.status)).length
  const queued = mails.filter((r) => r.status === "pendente" || r.status === "enviando").length
  const unread = all.filter((r) => r.status === "nao_lido").length
  const term = q.trim().toLowerCase()
  const rows = all.filter((r) => (!tab || r.source === tab) && (!term || `${r.recipient ?? ""} ${r.person ?? ""} ${r.org_name ?? ""} ${r.title ?? ""} ${KIND[r.kind] ?? r.kind}`.toLowerCase().includes(term)))
  const provRows = (prov.data?.emails ?? []).filter((e) => !term || `${e.to} ${e.subject}`.toLowerCase().includes(term))
  const tabs: [string, string, number][] = [["", "Todos", all.length], ["jogo", "Encontre um Jogo", all.filter((r) => r.source === "jogo").length], ["app", "Avisos no app", all.filter((r) => r.source === "app").length],
    ["vencimento", "Vencimento", all.filter((r) => r.source === "vencimento").length], ["comunicado", "Comunicados", all.filter((r) => r.source === "comunicado").length], ["provedor", "Entrega (Resend)", prov.data?.emails?.length ?? 0]]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Envios</h1>
          <p className="text-sm text-muted-foreground">E-mails e avisos que o sistema mandou às pessoas, com o resultado de cada um. Visível só para o administrador geral.</p>
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect aria-label="Período" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option>
          </NativeSelect>
          <Button variant="outline" size="icon" onClick={reload} aria-label="Atualizar"><RefreshCw className={cn((log.loading || prov.loading) && "animate-spin")} /></Button>
        </div>
      </div>
      {log.error && <p role="alert" className="text-sm text-destructive">Erro ao carregar: {log.error}</p>}

      {log.loading && !log.data ? <Skeleton className="h-64" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="E-mails enviados" value={sent} hint="Aceitos pelo servidor de envio" />
            <Stat label="E-mails com falha" value={failed} bad hint={failed ? "Veja o motivo na lista" : "Nenhuma falha no período"} />
            <Stat label="Na fila" value={queued} hint="Saem em até 1 minuto" />
            <Stat label="Avisos no app não lidos" value={unread} />
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de envio">
            {tabs.map(([k, label, n]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition", tab === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary")}>
                {label}<span className={cn("rounded-full px-1.5 text-xs tabular-nums", tab === k ? "bg-white/20" : "bg-secondary")}>{n}</span>
              </button>
            ))}
          </div>

          <section aria-label="Lista de envios" className="rounded-xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 sm:px-4">
              <p className="text-sm text-muted-foreground">{tab === "provedor" ? "Últimos 100 e-mails no Resend, inclusive confirmação de cadastro, convites e troca de senha." : tab === "vencimento" ? "Avisos de fim do teste e de pagamento pendente enviados aos centros." : `${rows.length} ${rows.length === 1 ? "registro" : "registros"}`}</p>
              <Input className="h-8 w-full sm:w-64" placeholder="Buscar e-mail, nome, centro ou assunto" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            {tab === "provedor" ? (
              prov.loading && !prov.data ? <Skeleton className="m-3 h-32" /> : prov.error ? <p role="alert" className="p-6 text-sm text-destructive">{prov.error}</p>
              : !prov.data?.available ? <p className="p-6 text-sm text-muted-foreground">{prov.data?.reason} Para ver a entrega de cada e-mail aqui, crie no Resend uma chave com acesso total e coloque em <code>SMTP_PASS</code>; os registros do banco nas outras abas continuam valendo.</p>
              : provRows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhum e-mail encontrado.</p> : (
                <ul className="divide-y">
                  {provRows.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 p-3 sm:px-4">
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.subject || "(sem assunto)"}</p><p className="truncate text-xs text-muted-foreground">{e.to}</p></div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="tabular-nums">{dt(e.created_at)}</span><Status s={e.status} /></div>
                    </li>
                  ))}
                </ul>
              )
            ) : rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">{all.length ? "Nada encontrado com esse filtro." : "Nenhum envio no período. Os registros aparecem aqui assim que o sistema mandar o primeiro e-mail ou aviso."}</p>
            ) : (
              <>
                <ul className="divide-y md:hidden">
                  {rows.map((r, i) => (
                    <li key={i} className="space-y-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate text-sm font-medium">{KIND[r.kind] ?? r.kind}</p><p className="truncate text-xs text-muted-foreground">{r.person ? `${r.person} · ` : ""}{r.recipient ?? r.org_name ?? "—"}</p></div>
                        <Status s={r.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground"><span>{SOURCE[r.source]}</span><span className="tabular-nums">{dt(r.at)}</span>{r.title && <span className="truncate">{r.title}</span>}</div>
                      {r.error && <p className="text-xs text-destructive">{r.error}{r.attempts ? ` (tentativa ${r.attempts})` : ""}</p>}
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Para</TableHead><TableHead>O quê</TableHead><TableHead>Canal</TableHead><TableHead>Resultado</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap text-sm tabular-nums">{dt(r.at)}</TableCell>
                          <TableCell className="max-w-[16rem]"><div className="truncate font-medium">{r.person ?? r.org_name ?? "—"}</div><div className="truncate text-xs text-muted-foreground">{r.recipient ?? ""}</div></TableCell>
                          <TableCell className="max-w-[18rem]"><div className="truncate text-sm">{KIND[r.kind] ?? r.kind}</div>{r.title && <div className="truncate text-xs text-muted-foreground">{r.title}</div>}</TableCell>
                          <TableCell><Badge variant="secondary" className="whitespace-nowrap">{SOURCE[r.source]}</Badge></TableCell>
                          <TableCell className="max-w-[16rem]"><Status s={r.status} />{r.error && <div className="mt-1 truncate text-xs text-destructive" title={r.error}>{r.error}{r.attempts ? ` (tentativa ${r.attempts})` : ""}</div>}{r.sent_at && r.status !== "nao_lido" && <div className="mt-0.5 text-[11px] text-muted-foreground">{r.source === "app" ? "lido" : "enviado"} {dt(r.sent_at)}</div>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  )
}
