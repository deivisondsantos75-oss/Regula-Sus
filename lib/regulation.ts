export const PRIORITIES = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_META: Record<
  Priority,
  { label: string; maxWait: string; maxWaitMin: number; className: string; dot: string; rank: number }
> = {
  vermelho: { maxWaitMin: 0, label: 'Emergência', maxWait: 'Imediato', className: 'bg-red-700 text-white', dot: 'bg-red-500', rank: 0 },
  laranja: { maxWaitMin: 10, label: 'Muito urgente', maxWait: '10 min', className: 'bg-orange-700 text-white', dot: 'bg-orange-500', rank: 1 },
  amarelo: { maxWaitMin: 60, label: 'Urgente', maxWait: '60 min', className: 'bg-yellow-400 text-yellow-950', dot: 'bg-yellow-400', rank: 2 },
  verde: { maxWaitMin: 120, label: 'Pouco urgente', maxWait: '120 min', className: 'bg-emerald-700 text-white', dot: 'bg-emerald-500', rank: 3 },
  azul: { maxWaitMin: 240, label: 'Não urgente', maxWait: '240 min', className: 'bg-sky-700 text-white', dot: 'bg-sky-500', rank: 4 },
}

export const SPECIALTIES = [
  'clinica_geral',
  'pediatria',
  'ortopedia',
  'obstetricia',
  'cirurgia_geral',
  'cardiologia',
  'neurologia',
  'oncologia',
  'nefrologia',
  'trauma',
  'pneumologia',
  'psiquiatria',
  'uti',
] as const
export type Specialty = (typeof SPECIALTIES)[number]

export const SPECIALTY_LABEL: Record<string, string> = {
  clinica_geral: 'Clínica geral',
  pediatria: 'Pediatria',
  ortopedia: 'Ortopedia',
  obstetricia: 'Obstetrícia',
  cirurgia_geral: 'Cirurgia geral',
  cardiologia: 'Cardiologia',
  neurologia: 'Neurologia',
  oncologia: 'Oncologia',
  nefrologia: 'Nefrologia',
  trauma: 'Trauma',
  pneumologia: 'Pneumologia',
  psiquiatria: 'Psiquiatria',
  uti: 'UTI',
}

export const COMPLEXITY_LEVEL: Record<string, { level: number; label: string }> = {
  basica: { level: 1, label: 'Atenção básica' },
  media_urgencia: { level: 2, label: 'Urgência (UPA)' },
  media: { level: 3, label: 'Média complexidade' },
  alta: { level: 4, label: 'Alta complexidade' },
}

/** Minutos de espera. `now` pode ser injetado (servidor) para evitar divergência na hidratação. */
export function waitMinutes(from: Date | string, now: number = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000))
}

/** Metadados da cor, tolerante a valores inesperados (nunca lança). */
export function metaOf(priority: string | null | undefined) {
  return priority && priority in PRIORITY_META ? PRIORITY_META[priority as Priority] : null
}

export const TIME_ZONE = 'America/Sao_Paulo'
export const formatDateTime = (d: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }) =>
  new Date(d).toLocaleString('pt-BR', { ...opts, timeZone: TIME_ZONE })

export function formatWait(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

/** Paciente já passou do tempo-alvo do Protocolo de Manchester para a sua cor? */
export function isOverdue(priority: string | null, createdAt: Date | string, now: number = Date.now()) {
  const meta = metaOf(priority)
  if (!meta) return false
  return waitMinutes(createdAt, now) > meta.maxWaitMin
}

/** Ordem da fila: cor → prazo de Manchester estourado há mais tempo → risco → chegada. Sem análise = tratado como laranja. */
export function queueCompare(
  a: { priority: string | null; riskScore: number | null; createdAt: Date | string },
  b: { priority: string | null; riskScore: number | null; createdAt: Date | string },
  now: number = Date.now(),
) {
  const rank = (p: string | null) => metaOf(p)?.rank ?? 1.5
  if (rank(a.priority) !== rank(b.priority)) return rank(a.priority) - rank(b.priority)
  const over = (x: typeof a) => waitMinutes(x.createdAt, now) - (metaOf(x.priority)?.maxWaitMin ?? 10)
  if (over(a) !== over(b)) return over(b) - over(a)
  if ((b.riskScore ?? 0) !== (a.riskScore ?? 0)) return (b.riskScore ?? 0) - (a.riskScore ?? 0)
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}
