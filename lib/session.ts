import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ROLES = ['regulador', 'unidade', 'gestor'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  regulador: 'Médico regulador',
  unidade: 'Unidade de saúde',
  gestor: 'Gestor / auditoria',
}

export type Session = {
  /** identificador estável (CPF mascarado no gov.br, ou "provisorio") */
  id: string
  name: string
  role: Role
  provider: 'govbr' | 'provisorio'
  /** perfil "unidade": só pode atualizar as vagas desta unidade */
  unitId?: number
  exp: number
}

const COOKIE = 'rsus_session'
const TTL_SECONDS = 60 * 60 * 8

function secret(ctx: string) {
  const s = process.env.AUTH_SECRET
  // Só o modo de desenvolvimento local usa chave de exemplo; build/preview/produção exigem AUTH_SECRET.
  const base = s || (process.env.NODE_ENV === 'development' ? 'dev-only-insecure-secret' : null)
  if (!base) throw new Error('AUTH_SECRET não definido. Gere com: openssl rand -base64 32')
  // chave derivada por contexto: um cookie de um tipo não vale como outro
  return createHmac('sha256', base).update(`rsus:${ctx}`).digest()
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')

export function sign(payload: object, ctx = 'session'): string {
  const body = b64(JSON.stringify(payload))
  const mac = createHmac('sha256', secret(ctx)).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verify<T>(token: string | undefined, ctx = 'session'): T | null {
  if (!token) return null
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expected = createHmac('sha256', secret(ctx)).update(body).digest()
  const given = Buffer.from(mac, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

export async function createSession(data: Omit<Session, 'exp'>) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const jar = await cookies()
  jar.set(COOKIE, sign({ ...data, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  })
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies()
  const s = verify<Session>(jar.get(COOKIE)?.value)
  if (!s || s.exp < Math.floor(Date.now() / 1000)) return null
  if (!ROLES.includes(s.role)) return null
  return s
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}
