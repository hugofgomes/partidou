import { SITE_URL, APP_URL, isMarketingHost } from "@/lib/site-config"
import type { MetadataRoute } from "next"
import { headers } from "next/headers"

/** robots.txt por endereço: o site comercial é indexável; no sistema, só as páginas públicas (busca de jogos e quadras, partidas, centros, cadastro, login e textos legais).
 *  Áreas privadas (painel, jogador, organizador, convites, gestão de partida por código, APIs) ficam fora. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host") ?? ""
  if (isMarketingHost(host)) return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }], sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL }
  return {
    rules: [{ userAgent: "*", allow: ["/jogos", "/quadras", "/cadastro", "/login", "/privacidade", "/termos", "/cookies"],
      disallow: ["/api/", "/partida/", "/jogador", "/organizar", "/convite/", "/super", "/quadra/", "/assinatura", "/conta", "/auth/", "/recuperar", "/redefinir-senha", "/sem-acesso"] }],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
