import { LINKS, SOCIAL } from "@/lib/site-config"

const col = "mb-4 text-xs font-semibold uppercase tracking-wider text-lime"
const link = "text-sm text-white/70 transition hover:text-white"

export function SiteFooter() {
  return (
    <footer className="bg-forest px-4 pb-10 pt-16 text-white sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/partidou-logo.png" alt="Partidou" width={1200} height={277} loading="lazy" className="h-10 w-auto" />
          <p className="mt-5 font-display text-lg font-bold">O jogo começa aqui.</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">Conectando jogadores, organizadores e centros esportivos.</p>
          {SOCIAL.length > 0 && <ul className="mt-5 flex flex-wrap gap-2">{SOCIAL.map((s) => <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">{s.label}</a></li>)}</ul>}
        </div>
        <nav aria-label="Plataforma"><h3 className={col}>Plataforma</h3><ul className="space-y-2.5">
          <li><a className={link} href={LINKS.buscarQuadras}>Encontrar Partidas</a></li><li><a className={link} href={LINKS.buscarQuadras}>Encontrar Quadras</a></li>
          <li><a className={link} href="#para-organizadores">Organizar Jogos</a></li><li><a className={link} href="#para-quadras">Gestão de Quadras</a></li><li><a className={link} href={LINKS.entrar}>Entrar no sistema</a></li></ul></nav>
        <nav aria-label="Empresa"><h3 className={col}>Empresa</h3><ul className="space-y-2.5">
          <li><a className={link} href="#como-funciona">Sobre o Partidou</a></li><li><a className={link} href="#planos">Planos</a></li><li><a className={link} href="#contato">Contato</a></li><li><a className={link} href="#faq">Suporte e dúvidas</a></li></ul></nav>
        <nav aria-label="Legal"><h3 className={col}>Legal</h3><ul className="space-y-2.5">
          <li><a className={link} href={LINKS.privacidade}>Política de Privacidade</a></li><li><a className={link} href={LINKS.termos}>Termos de Uso</a></li><li><a className={link} href={LINKS.cookies}>Política de Cookies</a></li></ul></nav>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:justify-between">
        <p>© 2026 Partidou. Todos os direitos reservados.</p><p>partidou.com.br</p>
      </div>
    </footer>
  )
}
