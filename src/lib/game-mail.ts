/** E-mails transacionais do Encontre um Jogo (seção 8 do prompt). Funções puras: recebem o payload gravado na fila (email_outbox) e devolvem assunto, texto e HTML.
 *  Os textos e assuntos seguem o combinado com o dono do Partigol. Nenhum e-mail confirma nada sozinho: as ações acontecem no sistema, com login. */
import { POSITION_LABEL, SPORT_LABEL, WEEKDAY_LONG } from "./jogo"
import { button, esc, layout, P, SMALL } from "./mail-layout"
import { APP_URL } from "@/lib/site-config"

export const APP = APP_URL
export type GamePayload = { game_id: string; title: string; sport: string; location: string; address?: string; date: string; weekday: number; time: string; price_cents: number | null
  player?: string; organizer?: string; position?: string | null; level?: string | null; invite_id?: string; reason?: string | null }
export type Rendered = { subject: string; text: string; html: string }

const brl = (c: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100)
const when = (p: GamePayload) => `${WEEKDAY_LONG[p.weekday] ?? ""}, ${p.date}`
/** Quadro com os detalhes da partida. */
function details(p: GamePayload, extra: [string, string][] = []) {
  const rows: [string, string][] = [["Partida", p.title], ["Modalidade", SPORT_LABEL[p.sport] ?? p.sport], ["Local", p.location], ["Endereço", p.address ?? ""], ["Data", when(p)], ["Horário", p.time], ...extra]
  if (p.price_cents) rows.push(["Valor", `${brl(p.price_cents)} por jogador`])
  const shown = rows.filter(([, v]) => v)
  return {
    html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-size:15px;line-height:1.5;margin:4px 0 0;">${shown.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #EEF2EA;color:#55655B;white-space:nowrap;width:1%;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #EEF2EA;color:#19221D;font-weight:600;">${esc(v)}</td></tr>`).join("")}</table>`,
    text: shown.map(([k, v]) => `${k}: ${v}`).join("\n"),
  }
}
const pos = (p: GamePayload) => (p.position ? POSITION_LABEL[p.position] ?? p.position : "")
const mk = (subject: string, title: string, preheader: string, intro: string[], d: { html: string; text: string } | null, cta: { href: string; label: string }, outro: string, reason: string): Rendered => ({
  subject,
  text: `${title}\n\n${intro.join("\n\n")}\n\n${d ? d.text + "\n\n" : ""}${cta.label}: ${cta.href}\n\n${outro ? outro + "\n\n" : ""}Partigol — O jogo começa aqui.`,
  html: layout({ title, preheader, reason, inner: `${intro.map((t) => `<p style="${P}">${esc(t)}</p>`).join("")}${d?.html ?? ""}${button(cta.href, cta.label)}${outro ? `<p style="${SMALL}">${esc(outro)}</p>` : ""}` }),
})

/** Monta o e-mail de cada evento. Devolve null para um modelo desconhecido (a fila marca como falha, sem enviar nada estranho). */
export function renderGameMail(template: string, p: GamePayload): Rendered | null {
  const why = "Você recebeu este e-mail por usar o Encontre um Jogo do Partigol. Desative os e-mails no seu perfil, se preferir."
  switch (template) {
    case "convite": // Evento 1
      return mk("⚽ Você recebeu um convite para jogar no Partigol!", `Olá, ${p.player ?? "jogador"}!`, `Convite para ${p.title}, ${when(p)} às ${p.time}.`,
        ["Você recebeu um convite para participar de uma partida pelo Partigol.", `${p.organizer ? `${p.organizer} encontrou seu perfil` : "Um organizador encontrou seu perfil"} e gostaria de contar com você!`],
        details(p, [["Posição", pos(p)]]), { href: `${APP}/convite/${p.invite_id}`, label: "VER CONVITE" }, "Acesse o Partigol para aceitar ou recusar. O convite só vale depois da sua resposta.", why)
    case "solicitacao_recebida": // Evento 2
      return mk("⚽ Um jogador quer participar da sua partida!", `Olá, ${p.organizer ?? "organizador"}!`, `${p.player} quer jogar em ${p.title}.`,
        [`O jogador ${p.player} demonstrou interesse na sua partida.`],
        details(p, [["Posição", pos(p)], ["Nível", p.level ? (p.level.charAt(0).toUpperCase() + p.level.slice(1)).replace("Intermediario", "Intermediário").replace("Avancado", "Avançado") : ""]]),
        { href: `${APP}/organizar/${p.game_id}`, label: "ANALISAR SOLICITAÇÃO" }, "Aprove ou recuse pelo painel do organizador.", why)
    case "participacao_aprovada": // Evento 3
      return mk("✅ Sua participação foi confirmada!", `Olá, ${p.player ?? "jogador"}!`, `Você está confirmado em ${p.title}.`,
        ["Sua participação na partida foi aprovada. Confira os detalhes:"], details(p, [["Posição", pos(p)]]),
        { href: `${APP}/jogador`, label: "VER MINHA PARTIDA" }, "Se não puder ir, avise pelo Partigol para liberar a vaga.", why)
    case "convite_recusado": // Evento 4
      return mk("Atualização do convite — Partigol", `Olá, ${p.organizer ?? "organizador"}!`, `${p.player} recusou o convite para ${p.title}.`,
        [`O jogador ${p.player} recusou o convite para a partida ${p.title}.`, "A vaga continua disponível para outros jogadores."], null,
        { href: `${APP}/organizar/${p.game_id}`, label: "BUSCAR OUTRO JOGADOR" }, "", why)
    case "convite_aceito":
      return mk("✅ Convite aceito: mais um confirmado na sua partida!", `Olá, ${p.organizer ?? "organizador"}!`, `${p.player} aceitou o convite para ${p.title}.`,
        [`O jogador ${p.player} aceitou o convite e já está entre os confirmados de ${p.title}.`], details(p),
        { href: `${APP}/organizar/${p.game_id}`, label: "VER PARTICIPANTES" }, "", why)
    case "solicitacao_recusada": // Evento 5
      return mk("Atualização da sua solicitação — Partigol", `Olá, ${p.player ?? "jogador"}!`, `Sua solicitação para ${p.title} não foi aprovada.`,
        [`Sua solicitação para participar da partida ${p.title} não foi aprovada nesta ocasião.`, "Você pode continuar procurando outras partidas disponíveis."], null,
        { href: `${APP}/jogos`, label: "ENCONTRAR OUTRO JOGO" }, "", why)
    case "partida_cancelada": // Evento 6 — sem afirmar reembolso
      return mk("Atenção: sua partida foi cancelada", `Olá, ${p.player ?? "jogador"}!`, `${p.title} foi cancelada.`,
        [`A partida ${p.title} foi cancelada pelo organizador.${p.reason ? ` Motivo informado: ${p.reason}.` : ""}`], details(p),
        { href: `${APP}/jogos`, label: "ENCONTRAR OUTRO JOGO" },
        "Se você pagou algum valor para esta partida, combine a devolução diretamente com o organizador. O Partigol não processa pagamentos de partidas.", why)
    default:
      return null
  }
}
