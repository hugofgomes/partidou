"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { initials, signedUrls } from "@/lib/school"
import { cn } from "@/lib/utils"
import { Camera, Loader2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

/** Foto do atleta ou treinador por link temporário; sem foto, mostra as iniciais (foto padrão). */
export function SchoolAvatar({ path, name, url, className }: { path: string | null | undefined; name: string; url?: string; className?: string }) {
  const [src, setSrc] = React.useState<string | null>(url ?? null)
  React.useEffect(() => {
    if (url) { setSrc(url); return }
    if (!path) { setSrc(null); return }
    let alive = true
    signedUrls([path]).then((m) => alive && setSrc(m[path] ?? null), () => {})
    return () => { alive = false }
  }, [path, url])
  return (
    <span className={cn("relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#142C25] text-sm font-semibold text-[#B9F344]", className)}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={`Foto de ${name}`} className="size-full object-cover" onError={() => setSrc(null)} />
        : <span aria-hidden>{initials(name) || "?"}</span>}
    </span>
  )
}

const OUT = 640          // lado da foto final (px)
const VIEW = 280         // lado da área de recorte na tela (px)
const MAX_IN = 15 * 1024 * 1024

/** Escolher, recortar (quadrado) e comprimir a foto antes de enviar. Só imagens; sai em JPEG leve, sem metadados (localização). */
export function PhotoPicker({ onPicked, disabled, label = "Alterar foto" }: { onPicked: (blob: Blob) => Promise<void>; disabled?: boolean; label?: string }) {
  const input = React.useRef<HTMLInputElement>(null)
  const [img, setImg] = React.useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = React.useState(1)
  const [off, setOff] = React.useState({ x: 0, y: 0 })
  const [busy, setBusy] = React.useState(false)
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""
    if (!f) return
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type)) return toast.error("Escolha uma imagem (JPG, PNG ou WebP).")
    if (f.size > MAX_IN) return toast.error("Imagem grande demais (máximo 15 MB).")
    const url = URL.createObjectURL(f), im = new Image()
    im.onload = () => { setImg(im); setZoom(1); setOff({ x: 0, y: 0 }) }
    im.onerror = () => { URL.revokeObjectURL(url); toast.error("Não foi possível abrir esta imagem.") }
    im.src = url
  }
  // Escala mínima: a imagem sempre cobre o quadrado inteiro.
  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1
  const s = base * zoom
  const clamp = (o: { x: number; y: number }) => {
    if (!img) return o
    const mx = Math.max(0, (img.naturalWidth * s - VIEW) / 2), my = Math.max(0, (img.naturalHeight * s - VIEW) / 2)
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) }
  }
  React.useEffect(() => { setOff((o) => clamp(o)) }, [zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  async function confirm() {
    if (!img) return
    setBusy(true)
    try {
      const c = document.createElement("canvas"); c.width = OUT; c.height = OUT
      const ctx = c.getContext("2d")!
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, OUT, OUT)
      const k = OUT / VIEW
      ctx.translate(OUT / 2 + off.x * k, OUT / 2 + off.y * k); ctx.scale(s * k, s * k)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      let blob: Blob | null = null
      for (const q of [0.85, 0.72, 0.6]) { blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q)); if (blob && blob.size <= 900_000) break }
      if (!blob) throw new Error("Não foi possível preparar a foto.")
      await onPicked(blob)
      URL.revokeObjectURL(img.src); setImg(null)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto.") }
    setBusy(false)
  }

  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" onChange={choose} aria-hidden tabIndex={-1} />
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => input.current?.click()}><Camera className="size-4" /> {label}</Button>
      <Dialog open={!!img} onOpenChange={(o) => { if (!o && !busy) { if (img) URL.revokeObjectURL(img.src); setImg(null) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ajustar foto</DialogTitle><DialogDescription>Arraste para posicionar e use o controle para aproximar.</DialogDescription></DialogHeader>
          {img && (
            <div className="space-y-3">
              <div className="relative mx-auto touch-none overflow-hidden rounded-xl bg-muted" style={{ width: VIEW, height: VIEW }}
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y } }}
                onPointerMove={(e) => { const d = drag.current; if (d) setOff(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y })) }}
                onPointerUp={() => { drag.current = null }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
                  style={{ width: img.naturalWidth * s, height: img.naturalHeight * s, transform: `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y}px))` }} />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/10" />
              </div>
              <label className="flex items-center gap-3 text-sm"><span className="text-muted-foreground">Zoom</span>
                <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[#142C25]" aria-label="Aproximar" />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => { if (img) URL.revokeObjectURL(img.src); setImg(null) }}>Cancelar</Button>
            <Button type="button" disabled={busy} onClick={confirm}>{busy && <Loader2 className="size-4 animate-spin" />} Usar foto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
