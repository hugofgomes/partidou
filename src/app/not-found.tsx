import type { Metadata } from "next"

export const metadata: Metadata = { title: "Página não encontrada | Partigol", robots: { index: false, follow: true } }

/** 404 com a marca, fora do índice dos buscadores, com caminhos úteis de volta. */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#002923] px-4 text-center text-white">
      <div className="max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/partigol-logo-520.png" alt="Partigol" width={520} height={117} className="mx-auto h-9 w-auto" />
        <p className="mt-10 text-sm font-semibold text-[#C5FA41]">Erro 404</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Essa página saiu de campo.</h1>
        <p className="mt-3 text-white/75">O endereço não existe ou foi movido.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="https://partidou.com.br" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#C5FA41] px-6 font-semibold text-[#002923]">Ir para o início</a>
          <a href="https://app.partidou.com.br/quadras" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 font-semibold text-white hover:bg-white/10">Encontrar um Jogo</a>
        </div>
      </div>
    </main>
  )
}
