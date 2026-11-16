import { FAQ } from "@/lib/site-config"
import { Plus } from "lucide-react"

/** Perguntas frequentes (accordion nativo com <details>: acessível, indexável e sem JavaScript). */
export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-titulo" className="on-light scroll-mt-16 bg-ice px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <p className="mb-3 text-sm font-semibold text-forest/80">Perguntas frequentes</p>
          <h2 id="faq-titulo" className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-forest sm:text-[2.5rem]">Tire suas dúvidas.</h2>
          <p className="mt-4 text-lg text-graphite/75">Não encontrou o que procurava? <a href="#contato" className="font-semibold text-forest underline underline-offset-4">Fale com a equipe</a>.</p>
        </div>
        <div className="divide-y divide-forest/10 border-y border-forest/10">
          {FAQ.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[17px] font-semibold text-forest [&::-webkit-details-marker]:hidden">
                {f.q}<Plus aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="-mt-1 pb-6 pr-10 text-[15px] leading-relaxed text-graphite/75">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
