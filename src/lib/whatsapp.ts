/** Link wa.me: abre o WhatsApp com a mensagem pronta; quem envia é o administrador. */
export const waLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`

/** Normaliza para DDI+DDD+número (assume Brasil quando vier sem DDI). */
export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "")
  if (!d) return null
  return d.length <= 11 ? `55${d}` : d
}

/** Máscara (48) 99999-8888 enquanto digita; números com + (internacionais) ficam como digitados. */
export function maskPhone(v: string) {
  if (v.trim().startsWith("+")) return v.replace(/[^\d+ ()-]/g, "").slice(0, 20)
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
