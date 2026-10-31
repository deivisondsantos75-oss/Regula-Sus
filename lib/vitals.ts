/**
 * Limiares de sinais vitais por faixa etária — fonte única usada pela UI, pelo protocolo de reserva e
 * pelo prompt da IA (antes eram três conjuntos diferentes).
 */
export type VitalsInput = {
  age: number
  systolic?: number | null
  diastolic?: number | null
  heartRate?: number | null
  respRate?: number | null
  spo2?: number | null
  temperature?: number | string | null
  glasgow?: number | null
}

export type Severity = 'normal' | 'alerta' | 'critico'

const has = (v: unknown): v is number => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))

export function ageBand(age: number): 'lactente' | 'crianca' | 'adulto' {
  return age < 1 ? 'lactente' : age < 12 ? 'crianca' : 'adulto'
}

const LIM = {
  lactente: { hrHigh: 160, hrCrit: 180, hrLow: 90, rrHigh: 50, rrCrit: 60 },
  crianca: { hrHigh: 130, hrCrit: 150, hrLow: 55, rrHigh: 30, rrCrit: 40 },
  adulto: { hrHigh: 110, hrCrit: 130, hrLow: 45, rrHigh: 24, rrCrit: 28 },
} as const

export type VitalKey = 'pa' | 'fc' | 'fr' | 'spo2' | 'temp' | 'glasgow'

/** Gravidade de cada sinal vital (ausente = normal). Valor 0 é tratado como dado real, não como "vazio". */
export function vitalSeverity(p: VitalsInput): Record<VitalKey, Severity> {
  const l = LIM[ageBand(p.age)]
  const out: Record<VitalKey, Severity> = { pa: 'normal', fc: 'normal', fr: 'normal', spo2: 'normal', temp: 'normal', glasgow: 'normal' }
  const sys = has(p.systolic) ? Number(p.systolic) : null
  const dia = has(p.diastolic) ? Number(p.diastolic) : null
  if (sys !== null) {
    if (sys < 80 || sys >= 220) out.pa = 'critico'
    else if (sys < 90 || sys >= 180) out.pa = 'alerta'
  }
  if (dia !== null && dia >= 120 && out.pa === 'normal') out.pa = 'alerta'
  if (has(p.heartRate)) {
    const v = Number(p.heartRate)
    out.fc = v === 0 || v > l.hrCrit || v < l.hrLow - 15 ? 'critico' : v > l.hrHigh || v < l.hrLow ? 'alerta' : 'normal'
  }
  if (has(p.respRate)) {
    const v = Number(p.respRate)
    out.fr = v === 0 || v > l.rrCrit || v < 8 ? 'critico' : v > l.rrHigh ? 'alerta' : 'normal'
  }
  if (has(p.spo2)) {
    const v = Number(p.spo2)
    out.spo2 = v < 90 ? 'critico' : v < 94 ? 'alerta' : 'normal'
  }
  if (has(p.temperature)) {
    const v = Number(p.temperature)
    out.temp = v < 35 || v >= 40 ? 'critico' : v >= 38.5 || v < 36 ? 'alerta' : 'normal'
  }
  if (has(p.glasgow)) {
    const v = Number(p.glasgow)
    out.glasgow = v <= 8 ? 'critico' : v < 15 ? 'alerta' : 'normal'
  }
  return out
}

export const hasAnyVital = (p: VitalsInput) =>
  [p.systolic, p.diastolic, p.heartRate, p.respRate, p.spo2, p.temperature, p.glasgow].some(has)

export { has as isPresent }
