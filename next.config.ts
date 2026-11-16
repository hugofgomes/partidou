import type { NextConfig } from "next";

// Identificador único da versão publicada (definido no build do Docker).
const BUILD_ID = process.env.BUILD_ID || "dev";

const nextConfig: NextConfig = {
  output: "standalone", // imagem Docker enxuta
  generateBuildId: async () => BUILD_ID,
  // Build econômico (VPS pequena): um processo por vez e menos memória no webpack
  experimental: { cpus: 1, webpackMemoryOptimizations: true },
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  poweredByHeader: false, // não anuncia o framework
  async headers() {
    return [
      // Cabeçalhos de segurança em todas as respostas (sem CSP por enquanto: exigiria mapear Supabase e scripts inline do Next).
      { source: "/:path*", headers: [
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ] },
      // Logos e ícones (nomes fixos): cache de 1 dia, revalidando em segundo plano.
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      // Arquivos com hash no nome: cache longo (já é o padrão do Next, explícito aqui).
      { source: "/_next/static/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Páginas e endpoint de versão nunca ficam presos em cache.
      { source: "/api/versao", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
    ];
  },
};

export default nextConfig;
