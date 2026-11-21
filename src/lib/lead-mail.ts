/** E-mails do formulário do site: aviso para a equipe e confirmação para quem preencheu. Funções puras (sem envio), fáceis de testar.
 *  Mesmo visual dos e-mails do Auth (supabase/email-templates): cabeçalho verde com a logo, faixa lima, cartão branco e rodapé.
 *  HTML em tabelas e estilos inline (compatível com Gmail, Outlook e Apple Mail). Todo texto vindo do visitante passa por esc(). */
export type LeadInfo = { audience: "quadra" | "organizador" | "jogador"; name: string; venue?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; email?: string | null; courts?: number | null; message?: string | null; plan?: string | null }
import { button, esc, layout, P, SMALL, SITE } from "./mail-layout"
import { APP_URL, SITE_HOST } from "@/lib/site-config"

export type Mail = { to: string; subject: string; text: string; html: string; replyTo?: string }

const AUD = { quadra: "Dono de quadra", organizador: "Organizador", jogador: "Jogador" }
const PLAN: Record<string, string> = { organizador_pro: "Organizador Pro", quadra_pro: "Quadra Pro", arena_business: "Arena Business", escolinha: "Escolinha", arena_escolinha: "Arena + Escolinha", demonstracao: "Demonstração" }

/** Aviso para a equipe: quem é, o que pediu e como responder. */
export function teamNotification(l: LeadInfo, to: string, panelUrl: string): Mail {
  const rows: [string, string][] = [["Tipo", AUD[l.audience]], ["Nome", l.name]]
  if (l.venue) rows.push(["Estabelecimento", l.venue])
  if (l.city || l.state) rows.push(["Cidade/UF", [l.city, l.state].filter(Boolean).join("/")])
  if (l.courts) rows.push(["Quadras", String(l.courts)])
  if (l.whatsapp) rows.push(["WhatsApp", l.whatsapp])
  if (l.email) rows.push(["E-mail", l.email])
  if (l.plan) rows.push(["Interesse", PLAN[l.plan] ?? l.plan])
  if (l.message) rows.push(["Mensagem", l.message])
  const subject = `Novo contato no site: ${l.name} (${AUD[l.audience]})`
  const wa = l.whatsapp?.replace(/\D/g, "")
  const quick = [wa && `<a href="https://wa.me/${wa.length <= 11 ? "55" + wa : wa}" style="color:#002923;font-weight:700;">Responder no WhatsApp</a>`, l.email && `<a href="mailto:${esc(l.email)}" style="color:#002923;font-weight:700;">Responder por e-mail</a>`].filter(Boolean).join(" &nbsp;·&nbsp; ")
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-size:15px;line-height:1.5;">${rows.map(([k, v]) => `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid #EEF2EA;color:#55655B;vertical-align:top;white-space:nowrap;width:1%;">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #EEF2EA;color:#19221D;font-weight:600;">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table>`
  return {
    to, subject, replyTo: l.email || undefined,
    text: `${subject}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nAcompanhe no painel: ${panelUrl}\n`,
    html: layout({
      title: "Novo contato no site",
      preheader: `${l.name} · ${AUD[l.audience]}${l.city ? ` · ${l.city}` : ""}`,
      inner: `<p style="${P}">Alguém preencheu o formulário de <strong>${SITE_HOST}</strong>. Responda rápido: o primeiro retorno faz diferença.</p>${table}${button(panelUrl, "Abrir no painel")}${quick ? `<p style="${SMALL}">${quick}</p>` : ""}`,
      reason: "Aviso automático do formulário de contato do site, enviado à equipe do Partigol.",
    }),
  }
}

/** Confirmação para quem preencheu o formulário (só vai se a pessoa informou e-mail). */
export function leadConfirmation(l: LeadInfo, replyTo: string): Mail | null {
  if (!l.email) return null
  const first = l.name.trim().split(/\s+/)[0] || "tudo bem"
  const quadra = l.audience === "quadra"
  const body = quadra
    ? "Recebemos o seu contato e a nossa equipe vai retornar em breve, por WhatsApp ou e-mail, para apresentar o sistema de gestão e combinar a implantação."
    : "Recebemos o seu contato. Os recursos para jogadores e organizadores ainda estão em desenvolvimento; avisaremos você assim que estiverem disponíveis."
  const next = quadra
    ? "Enquanto isso, conheça os recursos e os planos no nosso site."
    : "Enquanto isso, você já pode procurar quadras e horários livres perto de você."
  const cta = quadra ? { href: `${SITE}/#para-quadras`, label: "Conhecer o Partigol" } : { href: `${APP_URL}/quadras`, label: "Encontrar um Jogo" }
  const subject = "Recebemos o seu contato | Partigol"
  return {
    to: l.email, subject, replyTo,
    text: `Olá, ${first}!\n\n${body}\n\n${next}\n${cta.label}: ${cta.href}\n\nSe você não preencheu o formulário do Partigol, pode ignorar este e-mail.\n\nPartigol — O jogo começa aqui.\n${SITE_HOST}\n`,
    html: layout({
      title: `Olá, ${first}!`,
      preheader: quadra ? "Nossa equipe vai retornar em breve para apresentar o Partigol." : "Recebemos o seu contato. Avisaremos quando estiver disponível.",
      inner: `<p style="${P}">${esc(body)}</p><p style="${P}">${esc(next)}</p>${button(cta.href, cta.label)}<p style="${SMALL}">Tem alguma dúvida? É só responder este e-mail. <strong>Se você não preencheu o formulário do Partigol, ignore esta mensagem.</strong></p>`,
      reason: `Você recebeu este e-mail porque preencheu o formulário de contato em ${SITE_HOST}.`,
    }),
  }
}
