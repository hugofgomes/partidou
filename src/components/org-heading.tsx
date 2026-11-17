/** Logotipo do Partidou (o logo é para fundo escuro: vai sobre faixa verde-escura) e a ação da tela, no topo de login e redefinição de senha. */
export function OrgHeading({ subtitle }: { org?: unknown; subtitle: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 rounded-2xl bg-primary px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/partidou-logo-520.png" alt="Partidou" width={520} height={120} fetchPriority="high" className="mx-auto h-14 w-auto max-w-full object-contain" />
      </div>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}
