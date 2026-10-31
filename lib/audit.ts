import 'server-only'
import { and, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { safeErr } from '@/lib/pii'
import type { Session } from '@/lib/session'

type Actor = Pick<Session, 'id' | 'name' | 'role'>
// Aceita o db ou uma transação, para gravar a auditoria na mesma transação da ação.
type Executor = Pick<typeof db, 'insert'>

function row(actor: Actor, action: string, entity?: string, entityId?: string | number, detail?: string) {
  return {
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entity: entity ?? null,
    entityId: entityId != null ? String(entityId) : null,
    detail: detail?.slice(0, 500) ?? null,
  }
}

/** Auditoria "melhor esforço": nunca derruba a operação (leituras, logins, consultas ao agente). */
export async function logAudit(
  actor: Actor,
  action: string,
  entity?: string,
  entityId?: string | number,
  detail?: string,
) {
  try {
    await db.insert(auditLog).values(row(actor, action, entity, entityId, detail))
  } catch (err) {
    console.error('Falha ao gravar auditoria:', safeErr(err))
  }
}

/** Auditoria OBRIGATÓRIA: use dentro da transação de ações críticas; se falhar, a ação é desfeita. */
export async function auditStrict(
  tx: Executor,
  actor: Actor,
  action: string,
  entity?: string,
  entityId?: string | number,
  detail?: string,
) {
  await tx.insert(auditLog).values(row(actor, action, entity, entityId, detail))
}

/** Quantos eventos desta ação o ator (ou chave) gerou nos últimos `minutes`? Base dos limites de uso. */
export async function countRecent(action: string, actorId: string, minutes: number, actorName?: string) {
  const since = new Date(Date.now() - minutes * 60_000)
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, action),
        eq(auditLog.actorId, actorId),
        gte(auditLog.createdAt, since),
        actorName ? eq(auditLog.actorName, actorName) : undefined,
      ),
    )
  return r?.n ?? 0
}
