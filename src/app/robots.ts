import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/quadras", "/privacidade", "/termos"], disallow: ["/partida/", "/api/", "/super", "/quadra", "/assinatura", "/login"] }],
    sitemap: "https://app.partidou.com.br/sitemap.xml",
  }
}
