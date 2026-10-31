import { desc, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { patients, units } from '@/lib/db/schema'
import { logAudit } from '@/lib/audit'
import { CAN, requirePageSession } from '@/lib/auth'
import { isOverdue, queueCompare, waitMinutes } from '@/lib/regulation'
import { maskCns } from '@/lib/pii'
import { rankUnits } from '@/lib/triage'
import type { PatientRow } from '@/lib/types'
import { AppHeader } from '@/components/regulation/app-header'
import { AutoRefresh } from '@/components/regulation/auto-refresh'
import { StatsBar } from '@/components/regulation/stats-bar'
import { QueueList } from '@/components/regulation/queue-list'
import { PatientDetail } from '@/components/regulation/patient-detail'
import { UnitsPanel } from '@/components/regulation/units-panel'

export const dynamic = 'force-dynamic'

const REFERRED_LIMIT = 50

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; negado?: string }>
}) {
  const session = await requirePageSession()
  const { p, negado } = await searchParams
  const now = Date.now()
  const isUnit = session.role === 'unidade'

  const [waitingRaw, referredRaw, referredCount, allUnits] = await Promise.all([
    db.select().from(patients).where(ne(patients.status, 'encaminhado')),
    // só os encaminhamentos mais recentes (a lista não cresce sem limite)
    isUnit
      ? Promise.resolve([])
      : db.select().from(patients).where(eq(patients.status, 'encaminhado')).orderBy(desc(patients.referredAt)).limit(REFERRED_LIMIT),
    db.$count(patients, eq(patients.status, 'encaminhado')),
    db.select().from(units).orderBy(desc(units.level), units.name),
  ])

  // CNS mascarado antes de sair do servidor
  const toRow = (pt: (typeof waitingRaw)[number]): PatientRow => ({ ...pt, cns: maskCns(pt.cns) })
  const waiting = waitingRaw.map(toRow).sort((a, b) => queueCompare(a, b, now))
  const referred = referredRaw.map(toRow)

  const selected =
    (p ? [...waiting, ...referred].find((pt) => String(pt.id) === p) : undefined) ?? waiting[0] ?? referred[0] ?? null

  // leitura de dados do paciente fica na trilha (LGPD): só quando o regulador abre o caso de propósito
  if (!isUnit && p && selected && String(selected.id) === p) {
    await logAudit(session, 'paciente_visualizado', 'paciente', selected.id)
  }

  const candidates =
    !isUnit && selected?.complexity && selected.specialty
      ? rankUnits(allUnits, {
          complexity: selected.complexity,
          specialty: selected.specialty,
          city: selected.city,
          age: selected.age,
        })
          .slice(0, 4)
          .map((r) => ({ ...r.unit, sameCity: r.sameCity }))
      : []

  const unitById = Object.fromEntries(allUnits.map((u) => [u.id, u]))
  const critical = waiting.filter((pt) => pt.priority === 'vermelho' || pt.priority === 'laranja').length
  const overdue = waiting.filter((pt) => isOverdue(pt.priority, pt.createdAt, now)).length
  const avgWait = waiting.length
    ? Math.round(waiting.reduce((s, pt) => s + waitMinutes(pt.createdAt, now), 0) / waiting.length)
    : 0
  const beds = allUnits.reduce((s, u) => s + u.availableBeds, 0)

  const editableIds: number[] | 'all' =
    session.role === 'unidade' ? (session.unitId ? [session.unitId] : []) : CAN.vagas.includes(session.role) ? 'all' : []

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader session={session} unitName={session.unitId ? unitById[session.unitId]?.name : undefined} />
      <AutoRefresh />
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 md:p-6">
        {negado && (
          <p role="alert" className="rounded-lg border border-amber-600/50 bg-amber-500/10 p-3 text-sm">
            Seu perfil não tem acesso àquela página.
          </p>
        )}
        <StatsBar
          overdue={overdue}
          waiting={waiting.length}
          critical={critical}
          avgWait={avgWait}
          beds={beds}
          referred={referredCount}
        />
        {isUnit ? (
          <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)]">
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              Perfil de unidade: você atualiza as vagas da sua unidade. Os dados dos pacientes ficam restritos à
              regulação (LGPD).
            </p>
            <UnitsPanel units={allUnits} editableIds={editableIds} />
          </div>
        ) : (
          <div className="grid flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_340px]">
            <QueueList waiting={waiting} referred={referred} selectedId={selected?.id ?? null} now={now} />
            {selected ? (
              <PatientDetail
                key={selected.id}
                now={now}
                patient={selected}
                candidates={candidates}
                assignedUnit={selected.assignedUnitId ? unitById[selected.assignedUnitId] : undefined}
                canTriage={CAN.triar.includes(session.role)}
                canRefer={CAN.encaminhar.includes(session.role)}
              />
            ) : (
              <section className="flex items-center justify-center rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Nenhum paciente na fila. Cadastre um novo paciente para iniciar a regulação.
              </section>
            )}
            <UnitsPanel units={allUnits} editableIds={editableIds} />
          </div>
        )}
      </main>
    </div>
  )
}
