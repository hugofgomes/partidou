// Aplica os modelos de e-mail do Auth (supabase/email-templates) no projeto Supabase do Partidou, pela API de gerenciamento.
// Guarda antes uma cópia da configuração atual dos e-mails em backups/. Lê de .env.deploy: SUPABASE_ACCESS_TOKEN e DATABASE_URL (para achar o projeto).
// Uso: node --env-file=.env.deploy scripts/supabase-email-templates.mjs [--dry-run]
import fs from "node:fs"
import path from "node:path"

const { SUPABASE_ACCESS_TOKEN: token, DATABASE_URL: db, SUPABASE_PROJECT_REF } = process.env
const ref = SUPABASE_PROJECT_REF || db?.match(/postgres\.([a-z0-9]+):/)?.[1]
if (!token) { console.error("Falta SUPABASE_ACCESS_TOKEN no .env.deploy (supabase.com/dashboard/account/tokens)."); process.exit(1) }
if (!ref) { console.error("Não achei o projeto: preencha DATABASE_URL ou SUPABASE_PROJECT_REF no .env.deploy."); process.exit(1) }
const dir = path.join(import.meta.dirname, "..", "supabase", "email-templates")
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8")
const SITE_URL = "https://app.partidou.com.br"
const body = {
  site_url: SITE_URL,
  mailer_subjects_recovery: "Redefina sua senha | Partidou", mailer_templates_recovery_content: read("recuperar-senha.html"),
  mailer_subjects_invite: "Você foi convidado para o Partidou", mailer_templates_invite_content: read("convite.html"),
  mailer_subjects_confirmation: "Confirme seu e-mail | Partidou", mailer_templates_confirmation_content: read("confirmar-email.html"),
}
const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`
const H = { authorization: `Bearer ${token}`, "content-type": "application/json" }
const cur = await fetch(api, { headers: H })
if (!cur.ok) { console.error(`✗ Supabase recusou (${cur.status}): confira o token e se ele é da conta dona do projeto.`, (await cur.text()).slice(0, 200)); process.exit(1) }
const conf = await cur.json()
const keep = Object.fromEntries(Object.entries(conf).filter(([k]) => /^(site_url|uri_allow_list|mailer_subjects_|mailer_templates_|smtp_admin_email|smtp_sender_name)/.test(k)))
fs.mkdirSync(path.join(import.meta.dirname, "..", "backups"), { recursive: true })
const bk = path.join(import.meta.dirname, "..", "backups", `auth-emails-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
fs.writeFileSync(bk, JSON.stringify(keep, null, 2))
console.log("Cópia da configuração atual:", bk)
console.log("Site URL atual:", conf.site_url, "| Redirect URLs:", conf.uri_allow_list || "(nenhuma)", "| SMTP próprio:", conf.smtp_host ? `${conf.smtp_host} (remetente ${conf.smtp_admin_email})` : "não")
if (process.argv.includes("--dry-run")) { console.log("(simulação: nada foi alterado)"); process.exit(0) }
const r = await fetch(api, { method: "PATCH", headers: H, body: JSON.stringify(body) })
if (!r.ok) { console.error(`✗ Não aplicou (${r.status}):`, (await r.text()).slice(0, 300)); process.exit(1) }
const after = await (await fetch(api, { headers: H })).json()
for (const k of ["recovery", "invite", "confirmation"]) console.log(`✓ ${k}: assunto "${after["mailer_subjects_" + k]}" · modelo Partidou: ${after["mailer_templates_" + k + "_content"]?.includes("partidou-logo.png") ? "sim" : "NÃO"}`)
console.log("✓ Site URL:", after.site_url)
