/** Site comercial: as fontes (Inter e Sora) vêm do layout raiz; aqui só a classe do site (cores e títulos herdados da seção). */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="mk bg-ice text-graphite">{children}</div>
}
