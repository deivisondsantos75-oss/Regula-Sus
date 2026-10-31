import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { appUrl, exchangeCode, maskCpf, roleForCpf } from '@/lib/govbr'
import { safeErr } from '@/lib/pii'
import { createSession, verify } from '@/lib/session'

const COOKIE = { name: 'rsus_oidc', path: '/api/auth/govbr' }

export async function GET(req: NextRequest) {
  const done = (to: string) => {
    // o cookie de estado é de uso único: apagado em TODOS os caminhos
    const res = NextResponse.redirect(new URL(to, appUrl()))
    res.cookies.delete(COOKIE)
    return res
  }
  const saved = verify<{ state: string; nonce: string; verifier: string; exp: number }>(
    req.cookies.get(COOKIE.name)?.value,
    'oidc',
  )
  const code = req.nextUrl.searchParams.get('code')

  if (!saved || saved.exp < Date.now() / 1000 || !code || req.nextUrl.searchParams.get('state') !== saved.state) {
    return done('/login?erro=govbr_falhou')
  }
  try {
    const claims = await exchangeCode(code, saved.verifier, saved.nonce)
    const cpf = claims.sub.replace(/\D/g, '')
    const role = roleForCpf(cpf)
    const actor = { id: maskCpf(cpf), name: claims.name ?? 'Usuário gov.br', role: role ?? ('regulador' as const) }
    if (!role) {
      await logAudit(actor, 'login_negado', 'sessao', undefined, 'CPF fora das listas de autorização')
      return done('/login?erro=nao_autorizado')
    }
    await createSession({ id: actor.id, name: actor.name, role, provider: 'govbr' })
    await logAudit(actor, 'login_govbr')
    return done('/')
  } catch (err) {
    console.error('Callback gov.br falhou:', safeErr(err))
    return done('/login?erro=govbr_falhou')
  }
}
