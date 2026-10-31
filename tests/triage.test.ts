import { describe, expect, it } from 'vitest'
import { protocolTriage, reconcileTriage, rankUnits, type TriageResult } from '@/lib/triage'
import { patient, unit, NORMAL } from './helpers'

const RANK = { vermelho: 0, laranja: 1, amarelo: 2, verde: 3, azul: 4 } as const
const atLeast = (got: keyof typeof RANK, want: keyof typeof RANK) => RANK[got] <= RANK[want]

type Case = { name: string; p: Parameters<typeof patient>[0]; min: keyof typeof RANK; max?: keyof typeof RANK; specialty?: string; complexity?: string }

// Casos clínicos (golden): a cor precisa ser NO MÍNIMO a esperada — falso negativo é o erro perigoso.
const CASES: Case[] = [
  { name: 'anafilaxia sem vitais', p: { complaint: 'Inchaço de lábios e língua, garganta fechando após picada de abelha' }, min: 'vermelho', complexity: 'alta' },
  { name: 'convulsão sem recuperar consciência', p: { complaint: 'Convulsão há 10 minutos, ainda não recuperou a consciência' }, min: 'laranja', specialty: 'neurologia' },
  { name: 'ideação suicida com plano', p: { complaint: 'Paciente refere ideação suicida com plano, quer se matar hoje' }, min: 'laranja', specialty: 'psiquiatria' },
  { name: 'hematemese', p: { complaint: 'Vômito com sangue abundante desde ontem', systolic: 95, heartRate: 125 }, min: 'laranja' },
  { name: 'abdome agudo', p: { complaint: 'Dor abdominal forte, vômitos e febre desde ontem' }, min: 'amarelo', specialty: 'cirurgia_geral' },
  { name: 'trauma com deformidade', p: { complaint: 'Queda de moto, trauma em perna direita com deformidade' }, min: 'amarelo', specialty: 'ortopedia' },
  { name: 'neonato febril', p: { age: 0, complaint: 'Bebê de 20 dias com febre', temperature: '38.5' as never }, min: 'laranja', specialty: 'pediatria' },
  { name: 'gestante com sangramento', p: { age: 28, sex: 'F', complaint: 'Gestante de 30 semanas com sangramento vaginal intenso', heartRate: 115 }, min: 'laranja', specialty: 'obstetricia', complexity: 'alta' },
  { name: 'pré-eclâmpsia', p: { age: 29, sex: 'F', complaint: 'Gestante de 36 semanas com dor de cabeça forte e visão turva', systolic: 168, diastolic: 108 }, min: 'laranja', specialty: 'obstetricia', complexity: 'alta' },
  { name: 'hipoglicemia confuso', p: { complaint: 'Diabético confuso, glicemia 40' }, min: 'laranja' },
  { name: 'hipotermia', p: { age: 80, complaint: 'Idoso sonolento encontrado na rua', temperature: '33' as never }, min: 'laranja' },
  { name: 'dor torácica sem vitais', p: { complaint: 'Dor no peito intensa há 40 minutos' }, min: 'laranja', specialty: 'cardiologia' },
  { name: 'AVC sem vitais', p: { age: 70, complaint: 'Desvio de rima e fraqueza no braço esquerdo há 1 hora' }, min: 'laranja', specialty: 'neurologia' },
  { name: 'Glasgow 3', p: { glasgow: 3, complaint: 'Encontrado caído em casa' }, min: 'vermelho', complexity: 'alta' },
  { name: 'PCR (SpO2 0, FC 0)', p: { spo2: 0, heartRate: 0, complaint: 'Paciente desacordado sem sinais vitais' }, min: 'vermelho' },
  { name: 'criança asmática', p: { age: 8, complaint: 'Febre alta há 2 dias e dificuldade para respirar, com chiado no peito', systolic: 100, diastolic: 60, heartRate: 128, spo2: 90, temperature: '39.4' as never, respRate: 32 }, min: 'laranja', specialty: 'pediatria' },
  { name: 'crise hipertensiva com cefaleia', p: { complaint: 'Dor de cabeça forte e visão turva', systolic: 200, diastolic: 125 }, min: 'laranja' },
  { name: 'sepse', p: { age: 70, complaint: 'Febre, calafrios e confusão', temperature: '39.1' as never, heartRate: 125, systolic: 88, respRate: 26, spo2: 93 }, min: 'laranja' },
  { name: 'idoso SpO2 baixa', p: { age: 78, complaint: 'Cansaço, tosse e falta de ar', spo2: 86, respRate: 26 }, min: 'laranja' },
  { name: 'caso leve com vitais normais', p: { complaint: 'Dor de garganta e tosse há 3 dias', ...NORMAL, temperature: '37.2' as never }, min: 'azul', max: 'verde' },
  { name: 'nega dor no peito', p: { complaint: 'Tosse leve há 2 dias. Nega dor no peito e falta de ar', ...NORMAL }, min: 'azul', max: 'verde', specialty: 'clinica_geral' },
  { name: '"falar" não é AVC', p: { complaint: 'Paciente fala que está com dor de dente há 2 dias', ...NORMAL }, min: 'azul', max: 'verde', specialty: 'clinica_geral' },
  { name: 'sem sinais vitais não é azul', p: { complaint: 'Mal-estar geral há alguns dias' }, min: 'amarelo' },
]

describe('protocolTriage — casos clínicos', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const r = protocolTriage(patient(c.p))
      expect(atLeast(r.priority, c.min), `${c.name}: obteve ${r.priority} r=${r.riskScore} (${r.redFlags.join('; ')})`).toBe(true)
      if (c.max) expect(RANK[r.priority] >= RANK[c.max], `${c.name}: grave demais (${r.priority})`).toBe(true)
      if (c.specialty) expect(r.specialty).toBe(c.specialty)
      if (c.complexity) expect(r.complexity).toBe(c.complexity)
    })
  }

  it('comorbidade "não" não conta como comorbidade', () => {
    const a = protocolTriage(patient({ ...NORMAL, comorbidities: 'não', complaint: 'Dor de garganta há 3 dias' }))
    const b = protocolTriage(patient({ ...NORMAL, comorbidities: null, complaint: 'Dor de garganta há 3 dias' }))
    expect(a.riskScore).toBe(b.riskScore)
  })
  it('FC 150 em criança de 3 anos febril não é laranja só por isso', () => {
    const r = protocolTriage(patient({ age: 3, complaint: 'Febre e choro', heartRate: 140, temperature: '38.6' as never, spo2: 98, respRate: 28 }))
    expect(RANK[r.priority]).toBeGreaterThanOrEqual(RANK.amarelo)
  })
})

describe('reconcileTriage', () => {
  const protocol: TriageResult = { priority: 'laranja', riskScore: 60, complexity: 'media', specialty: 'neurologia', summary: '', justification: '', redFlags: ['Suspeita de AVC'] }
  it('IA mais branda que as regras é elevada e sinalizada', () => {
    const ai: TriageResult = { ...protocol, priority: 'azul', riskScore: 5, complexity: 'basica', specialty: 'clinica_geral', redFlags: [] }
    const r = reconcileTriage(ai, protocol)
    expect(r.priority).toBe('laranja')
    expect(r.complexity).toBe('media')
    expect(r.specialty).toBe('neurologia')
    expect(r.redFlags.join(' ')).toContain('Segurança')
  })
  it('IA mais grave que as regras prevalece', () => {
    const ai: TriageResult = { ...protocol, priority: 'vermelho', riskScore: 90, complexity: 'basica', redFlags: [] }
    const r = reconcileTriage(ai, protocol)
    expect(r.priority).toBe('vermelho')
    expect(r.complexity).toBe('alta') // coerência cor ↔ complexidade
  })
})

describe('rankUnits', () => {
  const base = { complexity: 'media', specialty: 'clinica_geral', city: 'Salvador' }
  it('ignora unidade sem vaga e nível insuficiente', () => {
    const r = rankUnits([unit({ id: 1, availableBeds: 0 }), unit({ id: 2, level: 2 }), unit({ id: 3 })], base)
    expect(r.map((x) => x.unit.id)).toEqual([3])
  })
  it('compara município sem acento/caixa', () => {
    const r = rankUnits([unit({ id: 1, city: 'Feira de Santana' }), unit({ id: 2, city: 'Salvador' })], { ...base, city: 'feira de SANTANA' })
    expect(r[0].unit.id).toBe(1)
    expect(r[0].sameCity).toBe(true)
  })
  it('criança não vai para unidade só de adultos; adulto não vai para pediátrica', () => {
    const us = [unit({ id: 1, audience: 'adulto', specialties: ['pediatria'] }), unit({ id: 2, audience: 'pediatrico', specialties: ['pediatria'] })]
    expect(rankUnits(us, { ...base, specialty: 'pediatria', age: 8 }).map((x) => x.unit.id)).toEqual([2])
    expect(rankUnits(us, { ...base, specialty: 'pediatria', age: 40 }).map((x) => x.unit.id)).toEqual([1])
  })
  it('maternidade não recebe criança de 8 anos com asma', () => {
    const us = [unit({ id: 1, audience: 'materno_infantil', specialties: ['pediatria', 'uti'], level: 4 }), unit({ id: 2, level: 4, specialties: ['pediatria'] })]
    expect(rankUnits(us, { complexity: 'alta', specialty: 'pediatria', city: 'Salvador', age: 8 }).map((x) => x.unit.id)).toEqual([2])
  })
  it('dados inconsistentes (total 0) são ignorados e empate é determinístico', () => {
    const r = rankUnits([unit({ id: 9, totalBeds: 0, availableBeds: 1 }), unit({ id: 5 }), unit({ id: 4 })], base)
    expect(r.map((x) => x.unit.id)).toEqual([4, 5])
  })
  it('complexidade inválida falha em vez de assumir UPA', () => {
    expect(() => rankUnits([unit()], { ...base, complexity: 'xyz' })).toThrow()
  })
  it('prefere o menor nível suficiente (não gasta leito de referência)', () => {
    const r = rankUnits([unit({ id: 1, level: 4 }), unit({ id: 2, level: 3 })], base)
    expect(r[0].unit.id).toBe(2)
  })
})
