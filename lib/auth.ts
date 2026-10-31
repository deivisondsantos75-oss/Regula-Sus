import 'server-only'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { getSession, type Role, type Session } from '@/lib/session'

/** Para páginas: redireciona ao login se não houver sessão (ou papel insuficiente). */
export async function requirePageSession(roles?: Role[]): Promise<Session> {
  const s = await getSession()
  if (!s) redirect('/login')
  if (roles && !roles.includes(s.role)) redirect('/?negado=1')
  return s
}

/** Para server actions: lança erro se não autorizado. */
export class ForbiddenError extends Error {
  constructor(message: string, public code: 'auth' | 'role' = 'role') {
    super(message)
  }
}

export async function requireActionSession(roles: Role[]): Promise<Session> {
  const s = await getSession()
  if (!s) throw new ForbiddenError('Sessão expirada. Entre novamente.', 'auth')
  if (!roles.includes(s.role)) {
    await logAudit(s, 'acao_negada', 'acao', undefined, `perfil ${s.role} tentou ação restrita a ${roles.join('/')}`)
    throw new ForbiddenError('Seu perfil não tem permissão para esta ação.', 'role')
  }
  return s
}

/** Permissões por capacidade (uma única fonte de verdade para UI e servidor). */
export const CAN = {
  registrar: ['regulador', 'gestor'] as Role[],
  triar: ['regulador', 'gestor'] as Role[],
  encaminhar: ['regulador', 'gestor'] as Role[],
  vagas: ['unidade', 'regulador', 'gestor'] as Role[],
  agente: ['regulador', 'gestor'] as Role[],
  auditoria: ['gestor'] as Role[],
}
