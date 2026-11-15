import Link from "next/link"

export const metadata = { title: "Termos de uso · Partidou" }

/** Termos de uso (texto base: revise com assessoria jurídica antes de divulgar amplamente). */
export default function Termos() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-relaxed">
      <Link href="/" className="text-primary underline">← Voltar</Link>
      <h1 className="text-2xl font-bold">Termos de uso</h1>
      <p>Ao usar o Partidou você concorda com os termos abaixo.</p>
      <h2 className="text-lg font-semibold">Reservas</h2>
      <p>Uma solicitação feita pelo site <strong>não garante</strong> a reserva até a confirmação do centro esportivo (salvo quando o centro confirma automaticamente). Preços, horários, regras de cancelamento e eventuais cobranças são definidos por cada centro.</p>
      <h2 className="text-lg font-semibold">Partidas com vagas</h2>
      <p>A partida é organizada pelo organizador, que aprova os jogadores. O Partidou apenas facilita o contato e não se responsabiliza pela organização, pelo pagamento entre participantes ou pela conduta de terceiros.</p>
      <h2 className="text-lg font-semibold">Centros esportivos</h2>
      <p>O uso do sistema de gestão depende de plano e assinatura. O centro é responsável pelos dados que cadastra e pelo uso adequado das contas da sua equipe.</p>
      <h2 className="text-lg font-semibold">Disponibilidade</h2>
      <p>Buscamos manter o serviço disponível, mas ele pode sofrer interrupções para manutenção ou por causas fora do nosso controle.</p>
    </main>
  )
}
