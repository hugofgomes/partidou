"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import * as React from "react"

/** Página inicial do painel: leva ao módulo que a pessoa usa (Quadra Esportiva primeiro; só Escolinhas → Escolinhas). */
export default function Home() {
  const router = useRouter()
  React.useEffect(() => {
    const sb = supabase()
    Promise.all([sb.rpc("court_role"), sb.rpc("school_role")]).then(([c, s]) => {
      router.replace(c.data ? "/quadra" : s.data ? (s.data === "treinador" ? "/escolinha/turmas" : "/escolinha") : "/quadra")
    }, () => router.replace("/quadra"))
  }, [router])
  return <Skeleton className="h-60" />
}
