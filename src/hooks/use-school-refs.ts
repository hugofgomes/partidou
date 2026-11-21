"use client"

import { useLoad } from "@/hooks/use-load"
import type { Category, Coach, Position, SchoolClass, Unit } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"

/** Cadastros de apoio do módulo (categorias, posições, turmas, treinadores e unidades). Cada perfil recebe só o que o banco libera. */
export async function loadSchoolRefs() {
  const sb = supabase()
  const [c, p, k, t, u, o] = await Promise.all([
    sb.from("school_categories").select("*").order("season", { ascending: false }).order("min_age"),
    sb.from("school_positions").select("code, label, is_keeper, sport, active, sort_order").order("sort_order"),
    sb.from("school_classes").select("*").order("name"),
    sb.from("school_coaches").select("*").order("full_name"),
    sb.from("school_units").select("*").order("name"),
    sb.rpc("school_class_occupancy"),
  ])
  for (const r of [c, p, k, t, u]) if (r.error) throw new Error(r.error.message)
  const occ: Record<string, number> = {}
  for (const r of (o.data ?? []) as { class_id: string; enrolled: number }[]) occ[r.class_id] = r.enrolled
  return { categories: (c.data ?? []) as Category[], positions: (p.data ?? []) as Position[], classes: (k.data ?? []) as SchoolClass[], coaches: (t.data ?? []) as Coach[], units: (u.data ?? []) as Unit[], occupancy: occ }
}
export type SchoolRefs = Awaited<ReturnType<typeof loadSchoolRefs>>
export const useSchoolRefs = () => useLoad(loadSchoolRefs, [])
