'use client'

import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PatientRow } from '@/lib/types'
import { formatWait, isOverdue, metaOf, waitMinutes } from '@/lib/regulation'
import { cn } from '@/lib/utils'
import { PriorityBadge } from './priority-badge'

function QueueItem({ patient, active, now }: { patient: PatientRow; active: boolean; now: number }) {
  const dot = metaOf(patient.priority)?.dot ?? 'bg-muted-foreground'
  const wait = waitMinutes(patient.createdAt, now)
  const overdue = patient.status !== 'encaminhado' && isOverdue(patient.priority, patient.createdAt, now)
  return (
    <li>
      <Link
        href={`/?p=${patient.id}`}
        scroll={false}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex gap-3 rounded-lg border border-transparent p-3 transition-colors hover:bg-accent',
          active && 'border-primary/40 bg-accent',
        )}
      >
        <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{patient.name}</p>
            <span
              className={cn(
                'shrink-0 font-mono text-xs tabular-nums text-muted-foreground',
                overdue && 'font-semibold text-red-700 dark:text-red-400',
              )}
              title={overdue ? 'Tempo-alvo de Manchester excedido' : undefined}
            >
              {formatWait(wait)}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {patient.age} anos · {patient.city}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <PriorityBadge priority={patient.priority} />
            {overdue && (
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:text-red-400">
                Prazo excedido
              </span>
            )}
            {patient.riskScore != null && (
              <span className="font-mono text-xs text-muted-foreground">
                risco {patient.riskScore}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}

export function QueueList({
  waiting,
  referred,
  selectedId,
  now,
}: {
  waiting: PatientRow[]
  referred: PatientRow[]
  selectedId: number | null
  now: number
}) {
  return (
    <section aria-label="Fila de regulação" className="flex flex-col rounded-xl border bg-card">
      <Tabs defaultValue="fila" className="flex flex-1 flex-col gap-0">
        <div className="border-b p-3">
          <TabsList className="w-full">
            <TabsTrigger value="fila">Fila ({waiting.length})</TabsTrigger>
            <TabsTrigger value="encaminhados">Encaminhados (últimos {referred.length})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="fila" className="flex-1">
          {waiting.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Fila vazia.</p>
          ) : (
            <ol className="flex max-h-[calc(100dvh-260px)] flex-col gap-1 overflow-y-auto p-2">
              {waiting.map((pt) => (
                <QueueItem key={pt.id} patient={pt} active={pt.id === selectedId} now={now} />
              ))}
            </ol>
          )}
        </TabsContent>
        <TabsContent value="encaminhados" className="flex-1">
          {referred.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum encaminhamento ainda.
            </p>
          ) : (
            <ul className="flex max-h-[calc(100dvh-260px)] flex-col gap-1 overflow-y-auto p-2">
              {referred.map((pt) => (
                <QueueItem key={pt.id} patient={pt} active={pt.id === selectedId} now={now} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
