/** E-mails do formulário do site: aviso para a equipe e confirmação para quem preencheu. Funções puras (sem envio), fáceis de testar.
 *  Mesmo visual dos e-mails do Auth (supabase/email-templates): cabeçalho verde com a logo, faixa lima, cartão branco e rodapé.
 *  HTML em tabelas e estilos inline (compatível com Gmail, Outlook e Apple Mail). Todo texto vindo do visitante passa por esc(). */
export type LeadInfo = { audience: "quadra" | "organizador" | "jogador"; name: string; venue?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; email?: string | null; courts?: number | null; message?: string | null; plan?: string | null }
export type Mail = { to: string; subject: string; text: string; html: string; replyTo?: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const AUD = { quadra: "Dono de quadra", organizador: "Organizador", jogador: "Jogador" }
const PLAN: Record<string, string> = { organizador_pro: "Organizador Pro", quadra_pro: "Quadra Pro", arena_business: "Arena Business", demonstracao: "Demonstração" }
const SITE = "https://partidou.com.br"
const LOGO = `${SITE}/brand/partidou-logo.png`
const INSTAGRAM = "https://www.instagram.com/partidouoo/"
const FONT = "font-family:Arial,Helvetica,sans-serif;"
const P = `margin:0 0 14px;font-size:16px;line-height:1.6;color:#19221D;`
const SMALL = `margin:20px 0 0;font-size:13px;line-height:1.6;color:#55655B;`

/** Botão "à prova de e-mail" (tabela com fundo; funciona até no Outlook). */
const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;"><tr><td align="center" bgcolor="#B9F344" style="background:#B9F344;border-radius:999px;"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 32px;${FONT}font-size:16px;font-weight:700;color:#142C25;text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`

/** Moldura padrão: pré-cabeçalho (texto que aparece na lista de e-mails), logo, faixa lima, cartão e rodapé com o motivo do envio. */
function layout({ title, preheader, inner, reason }: { title: string; preheader: string; inner: string; reason: string }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F6F8F4;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F6F8F4;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6F8F4" style="background:#F6F8F4;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td bgcolor="#142C25" align="left" style="background:#142C25;border-radius:16px 16px 0 0;padding:24px 32px;"><a href="${SITE}" target="_blank"><img src="${LOGO}" width="173" height="40" alt="Partidou" style="display:block;border:0;outline:none;text-decoration:none;height:40px;width:173px;"></a></td></tr>
<tr><td bgcolor="#B9F344" style="background:#B9F344;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #DCE3D6;border-top:0;border-radius:0 0 16px 16px;padding:36px 32px 32px;${FONT}color:#19221D;">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:800;color:#142C25;">${esc(title)}</h1>
${inner}
</td></tr>
<tr><td align="center" style="padding:24px 16px 0;${FONT}font-size:12px;line-height:1.6;color:#55655B;">
<strong style="color:#142C25;">Partidou</strong> · O jogo começa aqui.<br>
<a href="${SITE}" style="color:#55655B;text-decoration:underline;">partidou.com.br</a> · <a href="${INSTAGRAM}" style="color:#55655B;text-decoration:underline;">Instagram @partidouoo</a><br>
<span style="color:#8FA08F;">${esc(reason)}</span>
</td></tr>
</table></td></tr></table></body></html>`
}

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
  const quick = [wa && `<a href="https://wa.me/${wa.length <= 11 ? "55" + wa : wa}" style="color:#142C25;font-weight:700;">Responder no WhatsApp</a>`, l.email && `<a href="mailto:${esc(l.email)}" style="color:#142C25;font-weight:700;">Responder por e-mail</a>`].filter(Boolean).join(" &nbsp;·&nbsp; ")
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-size:15px;line-height:1.5;">${rows.map(([k, v]) => `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid #EEF2EA;color:#55655B;vertical-align:top;white-space:nowrap;width:1%;">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #EEF2EA;color:#19221D;font-weight:600;">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table>`
  return {
    to, subject, replyTo: l.email || undefined,
    text: `${subject}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nAcompanhe no painel: ${panelUrl}\n`,
    html: layout({
      title: "Novo contato no site",
      preheader: `${l.name} · ${AUD[l.audience]}${l.city ? ` · ${l.city}` : ""}`,
      inner: `<p style="${P}">Alguém preencheu o formulário de <strong>partidou.com.br</strong>. Responda rápido: o primeiro retorno faz diferença.</p>${table}${button(panelUrl, "Abrir no painel")}${quick ? `<p style="${SMALL}">${quick}</p>` : ""}`,
      reason: "Aviso automático do formulário de contato do site, enviado à equipe do Partidou.",
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
  const cta = quadra ? { href: `${SITE}/#para-quadras`, label: "Conhecer o Partidou" } : { href: "https://app.partidou.com.br/quadras", label: "Encontrar um Jogo" }
  const subject = "Recebemos o seu contato | Partidou"
  return {
    to: l.email, subject, replyTo,
    text: `Olá, ${first}!\n\n${body}\n\n${next}\n${cta.label}: ${cta.href}\n\nSe você não preencheu o formulário do Partidou, pode ignorar este e-mail.\n\nPartidou — O jogo começa aqui.\npartidou.com.br\n`,
    html: layout({
      title: `Olá, ${first}!`,
      preheader: quadra ? "Nossa equipe vai retornar em breve para apresentar o Partidou." : "Recebemos o seu contato. Avisaremos quando estiver disponível.",
      inner: `<p style="${P}">${esc(body)}</p><p style="${P}">${esc(next)}</p>${button(cta.href, cta.label)}<p style="${SMALL}">Tem alguma dúvida? É só responder este e-mail. <strong>Se você não preencheu o formulário do Partidou, ignore esta mensagem.</strong></p>`,
      reason: "Você recebeu este e-mail porque preencheu o formulário de contato em partidou.com.br.",
    }),
  }
}
