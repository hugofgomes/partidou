import { redirect } from "next/navigation"

/** A página inicial do painel é o Dashboard do centro esportivo. */
export default function Home() {
  redirect("/quadra")
}
