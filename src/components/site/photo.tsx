/* eslint-disable @next/next/no-img-element -- imagens já otimizadas (WebP em vários tamanhos) no build; <img> com srcset evita processamento no servidor */
import type { Photo as P } from "@/lib/site-config"

/** Foto responsiva: o navegador escolhe o tamanho certo pelo `sizes`. Abaixo da primeira dobra carrega sob demanda (lazy). */
export function Photo({ photo, sizes, className, priority, decorative }: { photo: P; sizes: string; className?: string; priority?: boolean; decorative?: boolean }) {
  return (
    <img
      src={`${photo.base}-${photo.widths[photo.widths.length - 1]}.webp`}
      srcSet={photo.widths.map((w) => `${photo.base}-${w}.webp ${w}w`).join(", ")}
      sizes={sizes}
      width={photo.w}
      height={photo.h}
      alt={decorative ? "" : photo.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      className={className}
    />
  )
}
