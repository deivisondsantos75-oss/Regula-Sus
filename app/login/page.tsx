import { redirect } from 'next/navigation'
import { Activity, ShieldCheck } from 'lucide-react'
import { db } from '@/lib/db'
import { units } from '@/lib/db/schema'
import { provisionalConfig } from '@/lib/provisional'
import { govbrEnabled } from '@/lib/govbr'
import { getSession } from '@/lib/session'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Entrar — RegulaSUS' }

const ERRORS: Record<string, string> = {
  govbr_indisponivel: 'Login gov.br ainda não habilitado neste ambiente (faltam as credenciais do Login Único).',
  govbr_falhou: 'Não foi possível concluir o login com o gov.br. Tente novamente.',
  nao_autorizado: 'Seu CPF autenticou no gov.br, mas não está autorizado a operar a regulação.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await getSession()) redirect('/')
  const { erro } = await searchParams
  const cfg = provisionalConfig()
  const unitList = cfg.enabled
    ? await db.select({ id: units.id, name: units.name }).from(units).orderBy(units.name).catch(() => [])
    : []
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Activity className="size-6" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <h1 className="text-xl font-semibold tracking-tight">RegulaSUS</h1>
          <p className="text-sm text-muted-foreground">Central de Regulação com IA</p>
        </div>
      </div>
      {erro && ERRORS[erro] && (
        <p role="alert" className="rounded-lg border border-red-600/50 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {ERRORS[erro]}
        </p>
      )}
      <LoginForm
        govbr={govbrEnabled()}
        provisional={cfg.enabled}
        needsCode={cfg.needsCode}
        roles={cfg.roles}
        units={unitList}
      />
      <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Dados de saúde são dados pessoais sensíveis (LGPD, art. 11). Logins, consultas a pacientes e decisões
        ficam registrados em trilha de auditoria. Os pacientes deste ambiente são fictícios.
      </p>
    </main>
  )
}
