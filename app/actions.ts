'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, gt, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { patients, units } from '@/lib/db/schema'
import { auditStrict, logAudit } from '@/lib/audit'
import { CAN, ForbiddenError, requireActionSession } from '@/lib/auth'
import { safeErr } from '@/lib/pii'
import { analyzePatient, protocolTriage, rankUnits, reconcileTriage } from '@/lib/triage'

export type ActionResult = { error?: string; code?: 'auth' | 'role' | 'stale' }
export type ActionState = (ActionResult & { patientId?: number; values?: Record<string, string> }) | null

// ───────────── validação (mensagens em português) ─────────────

const num = (label: string, min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(String(v).replace(',', '.'))),
    z
      .number({ message: `${label}: informe um número` })
      .min(min, `${label}: mínimo ${min}`)
      .max(max, `${label}: máximo ${max}`)
      .optional(),
  )
const int = (label: string, min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z
      .number({ message: `${label}: informe um número inteiro` })
      .int(`${label}: use número inteiro`)
      .min(min, `${label}: mínimo ${min}`)
      .max(max, `${label}: máximo ${max}`)
      .optional(),
  )

const patientSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo').max(120, 'Nome muito longo'),
  // '' NÃO vira 0: idade é obrigatória
  age: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z
      .number({ message: 'Informe a idade' })
      .int('Idade: use número inteiro')
      .min(0, 'Idade inválida')
      .max(120, 'Idade: máximo 120'),
  ),
  sex: z.enum(['F', 'M'], { message: 'Selecione o sexo' }),
  cns: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v === '' || v.length === 15, 'CNS deve ter 15 dígitos')
    .optional(),
  city: z.string().trim().min(2, 'Informe o município').max(80, 'Município muito longo'),
  complaint: z.string().trim().min(10, 'Descreva a queixa com mais detalhes (mínimo 10 caracteres)').max(2000, 'Queixa muito longa'),
  comorbidities: z.string().trim().max(500, 'Comorbidades: máximo 500 caracteres').optional(),
  // limites amplos de propósito: PCR/SpO2 baixíssima são os casos mais graves e precisam ser aceitos (viram vermelho)
  systolic: int('PAS', 0, 300),
  diastolic: int('PAD', 0, 200),
  heartRate: int('FC', 0, 300),
  spo2: int('SpO2', 0, 100),
  temperature: num('Temperatura', 25, 45),
  respRate: int('FR', 0, 100),
  glasgow: int('Glasgow', 3, 15),
})

const id = z.number().int().positive()

const authFail = (e: unknown): ActionResult | null =>
  e instanceof ForbiddenError ? { error: e.message, code: e.code } : null

// ───────────── cadastro ─────────────

export async function registerPatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>
  const values = Object.fromEntries(Object.entries(raw).filter(([k]) => typeof raw[k] === 'string'))
  let actor
  try {
    actor = await requireActionSession(CAN.registrar)
  } catch (e) {
    return { ...(authFail(e) ?? { error: 'Erro de autorização' }), values }
  }
  const parsed = patientSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos', values }
  }
  const d = parsed.data

  try {
    const [created] = await db
      .insert(patients)
      .values({
        ...d,
        cns: d.cns || null,
        comorbidities: d.comorbidities || null,
        temperature: d.temperature?.toString(),
      })
      .returning()
    await logAudit(actor, 'paciente_cadastrado', 'paciente', created.id)

    try {
      await runTriage(created.id, actor)
    } catch (err) {
      // o paciente já está na fila; a triagem pode ser refeita pelo botão "Analisar com IA"
      console.error('Falha na triagem:', safeErr(err))
    }
    revalidatePath('/')
    return { patientId: created.id }
  } catch (err) {
    console.error('Falha ao cadastrar paciente:', safeErr(err))
    return { error: 'Não foi possível cadastrar agora. Tente novamente.', values }
  }
}

// ───────────── triagem ─────────────

async function runTriage(patientId: number, actor: Parameters<typeof logAudit>[0]) {
  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId))
  if (!patient) throw new Error('Paciente não encontrado')
  if (patient.status === 'encaminhado') throw new Error('Paciente já encaminhado')

  // As regras clínicas SEMPRE rodam: são a rede de segurança sobre a resposta da IA.
  const rules = protocolTriage(patient)
  let result = rules
  let source = 'protocolo'
  try {
    const ai = await analyzePatient(patient)
    result = reconcileTriage(ai, rules)
    source = result.priority !== ai.priority ? 'ia+regras(elevada)' : 'ia'
  } catch (err) {
    console.error('IA indisponível, usando protocolo automático:', safeErr(err))
  }

  const updated = await db
    .update(patients)
    .set({
      priority: result.priority,
      riskScore: result.riskScore,
      complexity: result.complexity,
      specialty: result.specialty,
      aiSummary: result.summary,
      aiJustification: result.justification,
      redFlags: result.redFlags,
      status: 'triado',
      triagedAt: new Date(),
    })
    // nunca "desencaminha" quem já foi encaminhado em paralelo
    .where(and(eq(patients.id, patientId), ne(patients.status, 'encaminhado')))
    .returning({ id: patients.id })
  if (updated.length === 0) throw new Error('Paciente já encaminhado')

  await logAudit(
    actor,
    'triagem',
    'paciente',
    patientId,
    `${source}: ${result.priority}, risco ${result.riskScore}, ${result.complexity}/${result.specialty}` +
      (source === 'ia+regras(elevada)' ? ` (regras elevaram a classificação da IA)` : ''),
  )
}

export async function triagePatient(patientId: number): Promise<ActionResult> {
  try {
    id.parse(patientId)
    const actor = await requireActionSession(CAN.triar)
    await runTriage(patientId, actor)
  } catch (err) {
    const f = authFail(err)
    if (f) return f
    if (err instanceof Error && err.message === 'Paciente já encaminhado') {
      revalidatePath('/')
      return { error: 'Este paciente já foi encaminhado.', code: 'stale' }
    }
    console.error('Falha na triagem:', safeErr(err))
    return { error: 'Não foi possível analisar o paciente. Tente novamente.' }
  }
  revalidatePath('/')
  return {}
}

// ───────────── encaminhamento ─────────────

class Abort extends Error {
  constructor(
    message: string,
    public code?: ActionResult['code'],
  ) {
    super(message)
  }
}

export async function confirmReferral(patientId: number, unitId: number): Promise<ActionResult> {
  let actor
  try {
    id.parse(patientId)
    id.parse(unitId)
    actor = await requireActionSession(CAN.encaminhar)
  } catch (e) {
    return authFail(e) ?? { error: 'Requisição inválida' }
  }

  try {
    await db.transaction(async (tx) => {
      // trava a linha do paciente: dois encaminhamentos simultâneos são serializados
      const [patient] = await tx.select().from(patients).where(eq(patients.id, patientId)).for('update')
      if (!patient) throw new Abort('Paciente não encontrado')
      if (patient.status === 'encaminhado') throw new Abort('Este paciente já foi encaminhado.', 'stale')
      if (!patient.complexity || !patient.specialty) throw new Abort('Analise o paciente antes de encaminhar.')

      const all = await tx.select().from(units)
      const unit = all.find((u) => u.id === unitId)
      if (!unit) throw new Abort('Unidade não encontrada')
      const opts = { complexity: patient.complexity, specialty: patient.specialty, city: patient.city, age: patient.age }
      // capacidade (nível + especialidade + público), ignorando vaga aqui; a vaga é validada ao reservar
      const capable = rankUnits([{ ...unit, availableBeds: Math.max(unit.availableBeds, 1) }], opts).length > 0
      if (!capable) throw new Abort('Esta unidade não tem a complexidade/especialidade necessária para este paciente.')
      const recommended = rankUnits(all, opts)[0]?.unit

      const reserved = await tx
        .update(units)
        .set({ availableBeds: sql`${units.availableBeds} - 1` })
        .where(and(eq(units.id, unitId), gt(units.availableBeds, 0)))
        .returning({ left: units.availableBeds })
      if (reserved.length === 0) throw new Abort('A unidade não tem mais vagas. Escolha outra unidade.', 'stale')

      await tx
        .update(patients)
        .set({ status: 'encaminhado', assignedUnitId: unitId, referredAt: new Date() })
        .where(eq(patients.id, patientId))

      // auditoria na MESMA transação: sem registro, não há encaminhamento
      await auditStrict(
        tx,
        actor,
        'encaminhamento',
        'paciente',
        patientId,
        `unidade: ${unit.name} (#${unitId}), vagas ${unit.availableBeds}→${reserved[0].left}` +
          (recommended && recommended.id !== unitId ? `; DIFERENTE da recomendada: ${recommended.name} (#${recommended.id})` : ''),
      )
    })
  } catch (err) {
    revalidatePath('/')
    if (err instanceof Abort) return { error: err.message, code: err.code }
    console.error('Falha ao encaminhar:', safeErr(err))
    return { error: 'Não foi possível encaminhar agora. Nada foi alterado; tente novamente.' }
  }
  revalidatePath('/')
  return {}
}

// ───────────── vagas ─────────────

export async function updateBeds(unitId: number, delta: 1 | -1): Promise<ActionResult> {
  try {
    id.parse(unitId)
    if (delta !== 1 && delta !== -1) return { error: 'Operação inválida' }
    const actor = await requireActionSession(CAN.vagas)
    // perfil "unidade" só mexe nas vagas da própria unidade
    if (actor.role === 'unidade' && actor.unitId !== unitId) {
      await logAudit(actor, 'acao_negada', 'unidade', unitId, 'tentou alterar vagas de outra unidade')
      return { error: 'Você só pode atualizar as vagas da sua própria unidade.', code: 'role' }
    }

    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(units).where(eq(units.id, unitId)).for('update')
      if (!before) throw new Abort('Unidade não encontrada')
      const next = Math.min(before.totalBeds, Math.max(0, before.availableBeds + delta))
      if (next === before.availableBeds) throw new Abort('Sem alteração possível (limite de vagas).', 'stale')
      await tx.update(units).set({ availableBeds: next }).where(eq(units.id, unitId))
      await auditStrict(tx, actor, delta === 1 ? 'vaga_liberada' : 'vaga_ocupada', 'unidade', unitId, `${before.name}: ${before.availableBeds}→${next}`)
    })
  } catch (err) {
    revalidatePath('/')
    const f = authFail(err)
    if (f) return f
    if (err instanceof Abort) return { error: err.message, code: err.code }
    console.error('Falha ao atualizar vagas:', safeErr(err))
    return { error: 'Não foi possível atualizar as vagas.' }
  }
  revalidatePath('/')
  return {}
}
