import { NextResponse } from 'next/server'
import { appUrl, govbrEnabled, newAuthRequest } from '@/lib/govbr'
import { sign } from '@/lib/session'

export async function GET(req: Request) {
  if (!govbrEnabled()) {
    return NextResponse.redirect(new URL('/login?erro=govbr_indisponivel', appUrl()))
  }
  const { url, state, nonce, verifier } = newAuthRequest()
  const res = NextResponse.redirect(url)
  res.cookies.set('rsus_oidc', sign({ state, nonce, verifier, exp: Math.floor(Date.now() / 1000) + 600 }, 'oidc'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/govbr',
    maxAge: 600,
  })
  return res
}
