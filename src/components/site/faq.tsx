import { FAQ } from "@/lib/site-config"
import { ChevronDown } from "lucide-react"
import { Reveal } from "./reveal"

/** Perguntas frequentes (accordion nativo com <details>: acessível e sem JavaScript). */
export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 bg-ice px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <div className="text-center"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-forest/70">Perguntas frequentes</p><h2 className="font-display text-3xl font-extrabold text-forest sm:text-4xl">Tire suas dúvidas.</h2></div>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border bg-white px-5 open:shadow-md">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-display text-[15px] font-bold text-forest [&::-webkit-details-marker]:hidden">
                {f.q}<ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-5 text-[15px] leading-relaxed text-graphite/80">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
