/** E-mails do formulário do site: aviso para a equipe e confirmação para quem preencheu. Funções puras (sem envio), fáceis de testar. */
export type LeadInfo = { audience: "quadra" | "organizador" | "jogador"; name: string; venue?: string | null; city?: string | null; state?: string | null; whatsapp?: string | null; email?: string | null; courts?: number | null; message?: string | null; plan?: string | null }
export type Mail = { to: string; subject: string; text: string; html: string; replyTo?: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const AUD = { quadra: "Dono de quadra", organizador: "Organizador", jogador: "Jogador" }
const PLAN: Record<string, string> = { organizador_pro: "Organizador Pro", quadra_pro: "Quadra Pro", arena_business: "Arena Business", demonstracao: "Demonstração" }
const shell = (title: string, inner: string) => `<div style="font-family:Arial,Helvetica,sans-serif;color:#19221D;max-width:560px;margin:0 auto"><div style="background:#142C25;padding:16px 20px;border-radius:12px 12px 0 0;font-size:18px;font-weight:bold"><span style="color:#B9F344">Partidou</span></div><div style="border:1px solid #DCE3D6;border-top:0;padding:20px;border-radius:0 0 12px 12px"><h1 style="font-size:20px;margin:0 0 16px;color:#142C25">${esc(title)}</h1>${inner}</div></div>`

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
  return {
    to, subject, replyTo: l.email || undefined,
    text: `${subject}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nAcompanhe no painel: ${panelUrl}\n`,
    html: shell("Novo contato no site", `<table style="border-collapse:collapse;width:100%;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px 6px 0;color:#55655B;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table><p style="margin:20px 0 0"><a href="${esc(panelUrl)}" style="background:#B9F344;color:#142C25;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Abrir no painel</a></p>`),
  }
}

/** Confirmação para quem preencheu o formulário (só vai se a pessoa informou e-mail). */
export function leadConfirmation(l: LeadInfo, replyTo: string): Mail | null {
  if (!l.email) return null
  const first = l.name.trim().split(/\s+/)[0] || "tudo bem"
  const body = l.audience === "quadra"
    ? "Recebemos o seu contato e a nossa equipe vai retornar em breve, por WhatsApp ou e-mail, para apresentar o sistema de gestão e combinar a implantação."
    : "Recebemos o seu contato. Os recursos para jogadores e organizadores ainda estão em desenvolvimento; avisaremos você assim que estiverem disponíveis."
  const subject = "Recebemos o seu contato | Partidou"
  return {
    to: l.email, subject, replyTo,
    text: `Olá, ${first}!\n\n${body}\n\nSe você não preencheu o formulário do Partidou, pode ignorar este e-mail.\n\nPartidou — O jogo começa aqui.\npartidou.com.br\n`,
    html: shell(`Olá, ${first}!`, `<p style="margin:0 0 14px;line-height:1.55">${esc(body)}</p><p style="margin:0 0 14px;line-height:1.55;font-size:13px;color:#55655B">Se você não preencheu o formulário do Partidou, pode ignorar este e-mail.</p><p style="margin:20px 0 0;font-size:13px;color:#55655B">Partidou — O jogo começa aqui.<br>partidou.com.br</p>`),
  }
}
