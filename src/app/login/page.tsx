import { LoginPage } from "./login-form"

/** "next" e "erro" lidos no servidor: a tela de entrar chega pronta (sem esperar o JavaScript e sem "pulo" de layout). */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[]; erro?: string | string[] }> }) {
  const sp = await searchParams
  const s = (v: string | string[] | undefined) => (typeof v === "string" ? v : null)
  return <LoginPage next={s(sp.next)} erro={s(sp.erro)} />
}
