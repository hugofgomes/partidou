import Link from "next/link"

export const metadata = { title: "Política de privacidade · Partidou" }

/** Política de privacidade (texto base: revise com assessoria jurídica antes de divulgar amplamente). */
export default function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-relaxed">
      <Link href="/quadras" className="text-primary underline">← Voltar</Link>
      <h1 className="text-2xl font-bold">Política de privacidade</h1>
      <p>O Partidou conecta jogadores a quadras e oferece aos centros esportivos um sistema de gestão. Esta página explica como tratamos dados pessoais, em linha com a Lei Geral de Proteção de Dados (LGPD).</p>
      <h2 className="text-lg font-semibold">Quais dados coletamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Quem solicita reserva ou vaga:</strong> nome e telefone, informados por você. O telefone serve para o centro (ou o organizador da partida) falar com você sobre a reserva.</li>
        <li><strong>Clientes dos centros:</strong> cadastro mantido pelo próprio centro (nome, contatos, histórico de reservas e pagamentos), visível só à equipe daquele centro.</li>
        <li><strong>Equipe dos centros:</strong> nome, e-mail e perfil de acesso.</li>
      </ul>
      <h2 className="text-lg font-semibold">Como usamos e quem acessa</h2>
      <p>Cada centro acessa apenas os dados do próprio estabelecimento; centros diferentes não veem os dados uns dos outros. Telefones de jogadores que pedem vaga em uma partida são vistos somente pelo organizador. Não vendemos dados pessoais.</p>
      <h2 className="text-lg font-semibold">Seus direitos</h2>
      <p>Você pode pedir ao centro (controlador dos dados do cadastro dele) acesso, correção ou exclusão dos seus dados. Para pedidos sobre a plataforma, fale com o suporte do Partidou.</p>
      <h2 className="text-lg font-semibold">Segurança</h2>
      <p>Usamos controles de acesso por estabelecimento, conexão segura e registro de alterações relevantes. Backups e exportações contêm dados pessoais e são guardados com cuidado.</p>
    </main>
  )
}
