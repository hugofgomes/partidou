import { Cadastro } from "./cadastro"

/** O "next" (página para voltar depois do cadastro) é lido no servidor: a tela já chega pronta, sem esperar o JavaScript. */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const n = (await searchParams).next
  const next = typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : null
  return <Cadastro next={next} />
}
