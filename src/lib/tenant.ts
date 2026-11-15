/** Identificador (slug) de um centro: "Arena Floripa!" → "arena-floripa" (sem acento, minúsculo, hífens). */
export function slugify(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "")
}
