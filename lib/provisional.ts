import { ROLES } from '@/lib/session'

/**
 * Acesso provisório (demonstração).
 * - Em produção exige código: PROVISIONAL_ACCESS_CODE (regulador/unidade) e PROVISIONAL_GESTOR_CODE (gestor).
 *   Sem o código configurado, o perfil fica indisponível (falha fechada).
 * - Fora de produção, sem códigos configurados, o acesso é livre (só para desenvolver).
 */
export function provisionalConfig() {
  const prod = process.env.NODE_ENV === 'production'
  const enabled = process.env.PROVISIONAL_ACCESS !== 'off'
  const code = process.env.PROVISIONAL_ACCESS_CODE
  const gestorCode = process.env.PROVISIONAL_GESTOR_CODE
  return {
    enabled,
    needsCode: prod || !!code,
    roles: {
      regulador: !prod || !!code,
      unidade: !prod || !!code,
      gestor: !prod || !!gestorCode,
    } as Record<(typeof ROLES)[number], boolean>,
  }
}

