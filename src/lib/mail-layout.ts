import { SITE_HOST, SITE_URL } from "@/lib/site-config"
/** Molde dos e-mails do Partigol (mesmo visual dos e-mails do Auth): cabeçalho verde com a logo, faixa lima, cartão branco, botão lima e rodapé.
 *  HTML em tabelas e estilos inline (Gmail, Outlook, Apple Mail). Todo texto vindo de usuários passa por esc(). */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
export const SITE = SITE_URL
const LOGO = `${SITE}/brand/partigol-logo.png`
const INSTAGRAM = "https://www.instagram.com/partidouoo/"
export const FONT = "font-family:Arial,Helvetica,sans-serif;"
export const P = `margin:0 0 14px;font-size:16px;line-height:1.6;color:#19221D;`
export const SMALL = `margin:20px 0 0;font-size:13px;line-height:1.6;color:#55655B;`

/** Botão "à prova de e-mail" (tabela com fundo; funciona até no Outlook). */
export const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;"><tr><td align="center" bgcolor="#C5FA41" style="background:#C5FA41;border-radius:999px;"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 32px;${FONT}font-size:16px;font-weight:700;color:#002923;text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`

/** Moldura padrão: pré-cabeçalho (texto que aparece na lista de e-mails), logo, faixa lima, cartão e rodapé com o motivo do envio. */
export function layout({ title, preheader, inner, reason }: { title: string; preheader: string; inner: string; reason: string }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F6F8F5;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F6F8F5;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6F8F5" style="background:#F6F8F5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td bgcolor="#002923" align="left" style="background:#002923;border-radius:16px 16px 0 0;padding:24px 32px;"><a href="${SITE}" target="_blank"><img src="${LOGO}" width="178" height="40" alt="Partigol" style="display:block;border:0;outline:none;text-decoration:none;height:40px;width:178px;"></a></td></tr>
<tr><td bgcolor="#C5FA41" style="background:#C5FA41;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #DCE3D6;border-top:0;border-radius:0 0 16px 16px;padding:36px 32px 32px;${FONT}color:#19221D;">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:800;color:#002923;">${esc(title)}</h1>
${inner}
</td></tr>
<tr><td align="center" style="padding:24px 16px 0;${FONT}font-size:12px;line-height:1.6;color:#55655B;">
<strong style="color:#002923;">Partigol</strong> · O jogo começa aqui.<br>
<a href="${SITE}" style="color:#55655B;text-decoration:underline;">${SITE_HOST}</a> · <a href="${INSTAGRAM}" style="color:#55655B;text-decoration:underline;">Instagram @partidouoo</a><br>
<span style="color:#8FA08F;">${esc(reason)}</span>
</td></tr>
</table></td></tr></table></body></html>`
}

