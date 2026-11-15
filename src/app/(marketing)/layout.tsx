import { Sora } from "next/font/google"

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" })

/** Fonte de títulos do site comercial (Sora); o texto corrido usa Inter (fonte do sistema). */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sora.variable} mk bg-ice text-graphite`}>{children}</div>
}
