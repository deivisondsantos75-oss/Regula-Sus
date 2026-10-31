import Link from 'next/link'
import { Activity, LogOut, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/auth-actions'
import { CAN } from '@/lib/auth'
import { ROLE_LABEL, type Session } from '@/lib/session'
import { AgentDialog } from './agent-dialog'
import { NewPatientDialog } from './new-patient-dialog'

export function AppHeader({ session, unitName }: { session: Session; unitName?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">RegulaSUS</p>
            <p className="text-xs text-muted-foreground">Central de Regulação com IA</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {CAN.agente.includes(session.role) && <AgentDialog />}
          {CAN.auditoria.includes(session.role) && (
            <Link
              href="/auditoria"
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-sm hover:bg-muted"
            >
              <ScrollText className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Auditoria</span>
            </Link>
          )}
          {CAN.registrar.includes(session.role) && <NewPatientDialog />}
          <div className="ml-2 hidden border-l pl-3 text-right leading-tight md:block">
            <p className="max-w-40 truncate text-sm font-medium">{session.name}</p>
            <p className="text-xs text-muted-foreground">
              {ROLE_LABEL[session.role]}
              {unitName ? ` · ${unitName}` : ''}
              {session.provider === 'provisorio' ? ' · provisório' : ' · gov.br'}
            </p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sair">
              <LogOut aria-hidden="true" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
