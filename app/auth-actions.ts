'use server'

import { timingSafeEqual } from 'node:crypto'
import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { countRecent, logAudit } from '@/lib/audit'
import { db } from '@/lib/db'
import { units } from '@/lib/db/schema'
import { provisionalConfig } from '@/lib/provisional'
import { createSession, destroySession, getSession, ROLES } from '@/lib/session'

const schema = z.object({
  name: z.string().trim().min(3, 'Informe seu nome (mínimo 3 letras)').max(80),
  role: z.enum(ROLES, { message: 'Escolha um perfil' }),
  code: z.string().max(100).optional(),
  unitId: z.coerce.number().int().positive().optional(),
})

export type LoginState = { error?: string; values?: { name: string; role: string; unitId?: string } } | null

const safeEqual = (a: string, b: string) => {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function loginProvisional(_p: LoginState, fd: FormData): Promise<LoginState> {
  const cfg = provisionalConfig()
  if (!cfg.enabled) return { error: 'Acesso provisório desativado.' }
  const raw = Object.fromEntries(fd) as Record<string, string>
  const values = { name: raw.name ?? '', role: raw.role ?? 'regulador', unitId: raw.unitId }
  const parsed = schema.safeParse({ ...raw, unitId: raw.unitId || undefined })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos', values }
  const { name, role, code, unitId } = parsed.data

  if (!cfg.roles[role]) return { error: 'Este perfil não está disponível no acesso provisório deste ambiente.', values }

  // limite de tentativas por IP (contado na trilha de auditoria: funciona em ambiente serverless)
  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? 'desconhecido').split(',')[0].trim()
  const key = `ip:${createHash('sha256').update(ip).digest('hex').slice(0, 16)}`
  if ((await countRecent('login_negado', key, 10)) >= 5) {
    return { error: 'Muitas tentativas. Aguarde 10 minutos e tente novamente.', values }
  }

  const expected = role === 'gestor' ? process.env.PROVISIONAL_GESTOR_CODE : process.env.PROVISIONAL_ACCESS_CODE
  if (expected && !safeEqual(code ?? '', expected)) {
    // não grava o nome digitado em tentativas negadas (evita falsificação/poluição da auditoria)
    await logAudit({ id: key, name: 'não autenticado', role }, 'login_negado', 'sessao', undefined, 'código incorreto')
    return { error: 'Código de acesso incorreto.', values }
  }

  if (role === 'unidade') {
    if (!unitId) return { error: 'Escolha a sua unidade de saúde.', values }
    const found = await db.select({ id: units.id }).from(units)
    if (!found.some((u) => u.id === unitId)) return { error: 'Unidade inválida.', values }
  }

  const actor = { id: 'provisorio', name: `${name} (provisório)`, role }
  await createSession({ ...actor, provider: 'provisorio', unitId: role === 'unidade' ? unitId : undefined })
  await logAudit(actor, 'login_provisorio', role === 'unidade' ? 'unidade' : undefined, unitId)
  redirect('/')
}

export async function logout() {
  const s = await getSession()
  if (s) await logAudit(s, 'logout')
  await destroySession()
  redirect('/login')
}
