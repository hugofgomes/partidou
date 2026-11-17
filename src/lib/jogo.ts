/** Encontre um Jogo: rótulos e listas usados nas telas e nos e-mails (os códigos são os aceitos pelo banco, migration 0046). */
export const POSITIONS: [string, string][] = [["goleiro", "Goleiro"], ["zagueiro", "Zagueiro"], ["lateral", "Lateral"], ["meio_campo", "Meio-campo"], ["atacante", "Atacante"], ["qualquer", "Qualquer posição"]]
export const POSITION_LABEL = Object.fromEntries(POSITIONS) as Record<string, string>
export const LEVELS: [string, string][] = [["iniciante", "Iniciante"], ["recreativo", "Recreativo"], ["intermediario", "Intermediário"], ["avancado", "Avançado"]]
export const LEVEL_LABEL = Object.fromEntries(LEVELS) as Record<string, string>
export const SPORTS: [string, string][] = [["futebol_society", "Futebol society"], ["futsal", "Futsal"], ["futebol_campo", "Futebol de campo"], ["volei", "Vôlei"], ["volei_praia", "Vôlei de praia"], ["beach_tennis", "Beach tennis"], ["basquete", "Basquete"], ["tenis", "Tênis"], ["padel", "Padel"], ["outra", "Outra"]]
export const SPORT_LABEL = Object.fromEntries(SPORTS) as Record<string, string>
export const PERIODS: [string, string][] = [["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"]]
export const DAYS: [number, string, string][] = [[1, "Seg", "Segunda-feira"], [2, "Ter", "Terça-feira"], [3, "Qua", "Quarta-feira"], [4, "Qui", "Quinta-feira"], [5, "Sex", "Sexta-feira"], [6, "Sáb", "Sábado"], [0, "Dom", "Domingo"]]
export const WEEKDAY_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]
export const AGE_RANGES: [string, string][] = [["ate_17", "Até 17 anos"], ["18_29", "18 a 29"], ["30_39", "30 a 39"], ["40_49", "40 a 49"], ["50_mais", "50 ou mais"]]
export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]

export type GameNeed = { position: string; quantity: number; filled: number }
export type Game = {
  id: string; title: string; sport: string; starts_at: string; ends_at: string; timezone: string; location_name: string; address: string | null; district: string | null
  city: string; state: string; level: string | null; slots_total: number; approved: number; price_cents: number | null; description: string | null; status: string; closed: boolean
  organizer: string; needs: GameNeed[]; court: { reserved: boolean; slug: string } | null
  is_organizer?: boolean; has_profile?: boolean; my_status?: string | null; my_invite?: string | null; my_position?: string | null
}

const fmt = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, ...o }).format(new Date(iso))
export const gameDay = (g: Pick<Game, "starts_at" | "timezone">) => fmt(g.starts_at, g.timezone, { weekday: "long", day: "2-digit", month: "2-digit" })
export const gameTime = (g: Pick<Game, "starts_at" | "ends_at" | "timezone">) => `${fmt(g.starts_at, g.timezone, { hour: "2-digit", minute: "2-digit" })}–${fmt(g.ends_at, g.timezone, { hour: "2-digit", minute: "2-digit" })}`
export const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
export const slotsLeft = (g: Pick<Game, "slots_total" | "approved">) => Math.max(0, g.slots_total - g.approved)
/** Partida guardada antes do login/cadastro, para o jogador voltar a ela depois ("o sistema preserva a partida selecionada"). */
export const PENDING_GAME_KEY = "partidou.jogo.pendente"
