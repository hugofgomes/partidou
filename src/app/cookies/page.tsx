import Link from "next/link"

export const metadata = { title: "Política de cookies · Partigol" }

/** Política de cookies (texto base: revise com assessoria jurídica antes de divulgar amplamente). */
export default function Cookies() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-relaxed">
      <Link href="/" className="text-primary underline">← Voltar</Link>
      <h1 className="text-2xl font-bold">Política de cookies</h1>
      <p>Cookies e armazenamento local são pequenos arquivos que o navegador guarda. O Partigol usa apenas o necessário para funcionar.</p>
      <h2 className="text-lg font-semibold">O que usamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Essenciais:</strong> mantêm você conectado no sistema (sessão de login) e protegem a conta. Sem eles o sistema não funciona.</li>
        <li><strong>Preferências:</strong> lembram escolhas simples, como o menu recolhido ou o convite de instalação do aplicativo, no próprio aparelho.</li>
      </ul>
      <h2 className="text-lg font-semibold">O que não usamos</h2>
      <p>Hoje não usamos cookies de publicidade nem de rastreamento de terceiros neste site. Se isso mudar, esta página será atualizada e pediremos o seu consentimento quando a lei exigir.</p>
      <h2 className="text-lg font-semibold">Como controlar</h2>
      <p>Você pode apagar ou bloquear cookies nas configurações do navegador. Bloquear os essenciais impede o login no sistema.</p>
    </main>
  )
}
