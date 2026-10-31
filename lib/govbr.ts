import 'server-only'
import { createHash, createPublicKey, createVerify, randomBytes } from 'node:crypto'

/**
 * Login Único gov.br (OpenID Connect, Authorization Code + PKCE).
 * Só funciona com GOVBR_CLIENT_ID / GOVBR_CLIENT_SECRET liberados pelo governo
 * após adesão formal do órgão. Sem eles, `govbrEnabled()` é false e o botão fica desativado.
 */
export const govbrEnabled = () => !!(process.env.GOVBR_CLIENT_ID && process.env.GOVBR_CLIENT_SECRET)

const issuer = () => (process.env.GOVBR_ISSUER ?? 'https://sso.staging.acesso.gov.br').replace(/\/$/, '')
export const redirectUri = () =>
  `${(process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/api/auth/govbr/callback`

type Jwk = JsonWebKey & { kid?: string }
let jwksCache: { at: number; keys: Jwk[] } | null = null

/** Busca a chave pelo `kid` (sem cair na "primeira chave"); cache de 10 min com 1 refresh forçado se o kid não existir. */
async function findKey(kid?: string): Promise<Jwk | undefined> {
  const load = async () => {
    const res = await fetch(`${issuer()}/jwk`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`JWKS indisponível (${res.status})`)
    jwksCache = { at: Date.now(), keys: ((await res.json()) as { keys: Jwk[] }).keys }
  }
  if (!jwksCache || Date.now() - jwksCache.at > 600_000) await load()
  let key = jwksCache!.keys.find((k) => k.kid === kid)
  if (!key && kid) {
    await load()
    key = jwksCache!.keys.find((k) => k.kid === kid)
  }
  return key
}

export const appUrl = () => (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export function newAuthRequest() {
  const state = randomBytes(16).toString('base64url')
  const nonce = randomBytes(16).toString('base64url')
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const url = new URL(`${issuer()}/authorize`)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GOVBR_CLIENT_ID!,
    scope: 'openid email profile',
    redirect_uri: redirectUri(),
    nonce,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()
  return { url: url.toString(), state, nonce, verifier }
}

type IdClaims = { sub: string; name?: string; email?: string; nonce?: string; aud?: string | string[]; iss?: string; exp?: number }

export async function exchangeCode(code: string, verifier: string, nonce: string): Promise<IdClaims> {
  const basic = Buffer.from(`${process.env.GOVBR_CLIENT_ID}:${process.env.GOVBR_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${issuer()}/token`, {
    signal: AbortSignal.timeout(10_000),
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error(`Token gov.br recusado (${res.status})`)
  const { id_token } = (await res.json()) as { id_token?: string }
  if (!id_token) throw new Error('gov.br não retornou id_token')

  const [h, p, s] = id_token.split('.')
  const header = JSON.parse(Buffer.from(h, 'base64url').toString())
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString()) as IdClaims

  // Assinatura via JWKS do provedor
  const jwk = await findKey(header.kid)
  if (!jwk || header.alg !== 'RS256') throw new Error('Chave/algoritmo do id_token inválido')
  const ok = createVerify('RSA-SHA256')
    .update(`${h}.${p}`)
    .verify(createPublicKey({ key: jwk as unknown as import('node:crypto').JsonWebKey, format: 'jwk' }), Buffer.from(s, 'base64url'))
  if (!ok) throw new Error('Assinatura do id_token inválida')

  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!aud.includes(process.env.GOVBR_CLIENT_ID)) throw new Error('aud inválido')
  if (claims.iss && claims.iss.replace(/\/$/, '') !== issuer()) throw new Error('iss inválido')
  if (!claims.exp || claims.exp < Date.now() / 1000) throw new Error('id_token expirado')
  if (claims.nonce !== nonce) throw new Error('nonce inválido')
  return claims
}

const list = (v?: string) => (v ?? '').split(',').map((x) => x.replace(/\D/g, '')).filter(Boolean)

/** gov.br prova identidade, não autorização: o perfil vem de uma lista de CPFs autorizados. */
export function roleForCpf(cpf: string): 'gestor' | 'regulador' | null {
  if (list(process.env.GOVBR_GESTOR_CPFS).includes(cpf)) return 'gestor'
  if (list(process.env.GOVBR_REGULADOR_CPFS).includes(cpf)) return 'regulador'
  return null
}

export const maskCpf = (cpf: string) => `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`
