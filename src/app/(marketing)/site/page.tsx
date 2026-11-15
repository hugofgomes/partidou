import { FaqSection } from "@/components/site/faq"
import { SiteFooter } from "@/components/site/footer"
import { SiteHeader } from "@/components/site/header"
import { LeadForm } from "@/components/site/lead-form"
import { FinalCta, FindPlayers, ForOrganizers, ForPlayers, Hero, HowItWorks, Management, OwnerBenefits, Plans, SmartAgenda, Sports, Testimonials } from "@/components/site/sections"
import { APP_URL, FAQ, SEO, SITE_URL } from "@/lib/site-config"
import type { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { absolute: SEO.title },
  description: SEO.description,
  alternates: { canonical: SITE_URL + "/" },
  openGraph: { type: "website", url: SITE_URL + "/", siteName: "Partidou", locale: "pt_BR", title: SEO.title, description: SEO.description, images: [{ url: "/brand/og-partidou.png", width: 1200, height: 630, alt: "Partidou: o jogo começa aqui" }] },
  twitter: { card: "summary_large_image", title: SEO.title, description: SEO.description, images: ["/brand/og-partidou.png"] },
  robots: { index: true, follow: true },
}

/** Dados estruturados (Schema.org): organização, site, aplicativo e perguntas frequentes (conteúdo igual ao da página). */
const jsonLd = [
  { "@context": "https://schema.org", "@type": "Organization", name: "Partidou", url: SITE_URL, logo: `${SITE_URL}/brand/icon-512.png`, slogan: "O jogo começa aqui." },
  { "@context": "https://schema.org", "@type": "WebSite", name: "Partidou", url: SITE_URL, inLanguage: "pt-BR" },
  { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Partidou", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: APP_URL, description: SEO.description, inLanguage: "pt-BR" },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
]

export default function SitePage() {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-lime focus:px-4 focus:py-2 focus:font-semibold focus:text-forest">Ir para o conteúdo</a>
      <SiteHeader />
      <main id="conteudo">
        <Hero />
        <HowItWorks />
        <Management />
        <SmartAgenda />
        <FindPlayers />
        <ForOrganizers />
        <ForPlayers />
        <Sports />
        <Plans />
        <OwnerBenefits />
        <Testimonials />
        <FaqSection />
        <LeadForm />
        <FinalCta />
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  )
}
