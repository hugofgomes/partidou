import type { Metadata } from "next"

/** Área privada: fora dos buscadores. */
export const metadata: Metadata = { title: { absolute: "Partigol" }, robots: { index: false, follow: false } }
export default function Layout({ children }: { children: React.ReactNode }) { return children }
