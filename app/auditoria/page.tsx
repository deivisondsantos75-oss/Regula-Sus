import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'
import { CAN, requirePageSession } from '@/lib/auth'
import { formatDateTime } from '@/lib/regulation'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Auditoria — RegulaSUS' }

const ACTION_LABEL: Record<string, string> = {
  login_provisorio: 'Login (provisório)',
  login_govbr: 'Login (gov.br)',
  login_negado: 'Login negado',
  logout: 'Logout',
  paciente_cadastrado: 'Paciente cadastrado',
  triagem: 'Triagem',
  encaminhamento: 'Encaminhamento',
  vaga_liberada: 'Vaga liberada',
  vaga_ocupada: 'Vaga ocupada',
  agente_consulta: 'Consulta ao agente',
  paciente_visualizado: 'Paciente aberto',
  acao_negada: 'Ação negada',
}

export default async function AuditPage() {
  await requirePageSession(CAN.auditoria)
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(200)
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar à regulação
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Trilha de auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Últimas {rows.length} ações (horário de Brasília). Registro exigido para tratamento de dados sensíveis de saúde (LGPD).
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Quando</th>
              <th className="p-3 font-medium">Quem</th>
              <th className="p-3 font-medium">Ação</th>
              <th className="p-3 font-medium">Objeto</th>
              <th className="p-3 font-medium">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 align-top">
                <td className="whitespace-nowrap p-3 font-mono text-xs tabular-nums">
                  {formatDateTime(r.createdAt, { dateStyle: 'short', timeStyle: 'medium' })}
                </td>
                <td className="p-3">
                  {r.actorName}
                  <span className="block text-xs text-muted-foreground">{r.actorRole}</span>
                </td>
                <td className="p-3">{ACTION_LABEL[r.action] ?? r.action}</td>
                <td className="p-3 font-mono text-xs">{r.entity ? `${r.entity} #${r.entityId ?? ''}` : '—'}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.detail ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Nenhum registro ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
