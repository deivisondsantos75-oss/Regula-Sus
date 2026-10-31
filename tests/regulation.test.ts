import { describe, expect, it } from 'vitest'
import { formatWait, isOverdue, queueCompare, waitMinutes } from '@/lib/regulation'
import { vitalSeverity } from '@/lib/vitals'
import { redactPII, maskCns } from '@/lib/pii'

const NOW = Date.parse('2026-10-28T12:00:00Z')
const ago = (min: number) => new Date(NOW - min * 60000)

describe('tempo e prazo', () => {
  it('waitMinutes usa floor e nunca fica negativo', () => {
    expect(waitMinutes(ago(10.9), NOW)).toBe(10)
    expect(waitMinutes(new Date(NOW + 60000), NOW)).toBe(0)
  })
  it('isOverdue respeita o tempo-alvo de cada cor', () => {
    expect(isOverdue('laranja', ago(9), NOW)).toBe(false)
    expect(isOverdue('laranja', ago(11), NOW)).toBe(true)
    expect(isOverdue('desconhecida', ago(999), NOW)).toBe(false)
    expect(isOverdue(null, ago(999), NOW)).toBe(false)
  })
  it('formatWait', () => {
    expect(formatWait(45)).toBe('45 min')
    expect(formatWait(125)).toBe('2h 5min')
  })
})

describe('ordem da fila', () => {
  const mk = (priority: string | null, riskScore: number | null, min: number) => ({ priority, riskScore, createdAt: ago(min) })
  it('vermelho antes de não analisado; não analisado antes de verde', () => {
    const l = [mk('verde', 20, 5), mk(null, null, 5), mk('vermelho', 80, 1)].sort((a, b) => queueCompare(a, b, NOW))
    expect(l.map((x) => x.priority)).toEqual(['vermelho', null, 'verde'])
  })
  it('verde antigo não sofre starvation por verde novo com risco maior', () => {
    const l = [mk('verde', 25, 5), mk('verde', 15, 200)].sort((a, b) => queueCompare(a, b, NOW))
    expect(l[0].riskScore).toBe(15)
  })
  it('cor inválida não derruba a ordenação', () => {
    expect(() => [mk('roxo', 1, 1), mk('azul', 1, 1)].sort((a, b) => queueCompare(a, b, NOW))).not.toThrow()
  })
})

describe('sinais vitais por idade', () => {
  it('FC 150 é normal-alta em criança de 3 anos mas crítica em adulto', () => {
    expect(vitalSeverity({ age: 3, heartRate: 125 }).fc).toBe('normal')
    expect(vitalSeverity({ age: 40, heartRate: 150 }).fc).toBe('critico')
  })
  it('zero é dado real', () => {
    expect(vitalSeverity({ age: 40, spo2: 0 }).spo2).toBe('critico')
  })
})

describe('PII', () => {
  it('remove CPF, telefone, e-mail e CNS do texto livre', () => {
    const t = redactPII('Ligar 71 99999-8888, cpf 123.456.789-09, a@b.com, cns 123456789012345')
    expect(t).not.toMatch(/9999|123\.456|a@b|123456789012345/)
  })
  it('mascara CNS', () => expect(maskCns('123456789012345')).toBe('•••••••••••2345'))
})
