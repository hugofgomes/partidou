import { CONTACT_EMAIL, LINKS, LOGO, SOCIAL } from "@/lib/site-config"

const title = "mb-4 text-sm font-semibold text-white"
const link = "text-sm text-white/70 transition-colors hover:text-white"

export function SiteFooter() {
  const groups = [
    { label: "Plataforma", items: [["Encontrar um Jogo", LINKS.encontrarJogo], ["Buscar quadras", LINKS.buscarQuadras], ["Gestão de Quadras", "#para-quadras"], ["Para Organizadores", "#para-organizadores"], ["Entrar no sistema", LINKS.entrar]] },
    { label: "Empresa", items: [["Como Funciona", "#como-funciona"], ["Planos", "#planos"], ["Perguntas frequentes", "#faq"], ["Contato", "#contato"]] },
    { label: "Legal", items: [["Política de Privacidade", LINKS.privacidade], ["Termos de Uso", LINKS.termos], ["Política de Cookies", LINKS.cookies]] },
  ]
  return (
    <footer className="bg-forest px-4 pb-8 pt-16 text-white sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- PNG transparente já otimizado */}
          <img src={LOGO.src} alt="Partidou" width={LOGO.width} height={LOGO.height} loading="lazy" className="h-9 w-auto" />
          <p className="mt-5 font-display text-lg font-bold">O jogo começa aqui.</p>
          <p className="mt-1 text-sm text-white/70">Gestão de quadras e organização de partidas.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-block text-sm font-medium text-lime hover:underline">{CONTACT_EMAIL}</a>
          {SOCIAL.length > 0 && <ul className="mt-5 flex flex-wrap gap-2">{SOCIAL.map((s) => <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" data-track={`social_${s.label.split(" ")[0].toLowerCase()}`} className="inline-flex min-h-10 items-center rounded-full border border-white/20 px-4 text-sm text-white/85 transition-colors hover:bg-white/10">{s.label}<span className="sr-only"> (abre em nova aba)</span></a></li>)}</ul>}
        </div>
        {groups.map((g) => (
          <nav key={g.label} aria-label={g.label}>
            <h2 className={title}>{g.label}</h2>
            <ul className="space-y-3">{g.items.map(([t, h]) => <li key={t}><a className={link} href={h}>{t}</a></li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Partidou. Todos os direitos reservados.</p><p>partidou.com.br</p>
      </div>
    </footer>
  )
}
