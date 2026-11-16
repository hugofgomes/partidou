import { Sora } from "next/font/google"

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["700"], display: "swap" })

/** Fonte de títulos do site comercial (Sora Bold, peso único para carregar menos); o texto corrido usa Inter. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sora.variable} mk bg-ice text-graphite`}>{children}</div>
}
