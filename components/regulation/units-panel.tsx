'use client'

import { useState, useTransition } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateBeds } from '@/app/actions'
import type { Unit } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import { useActionResult } from './use-action'

function UnitRow({ unit, canEdit }: { unit: Unit; canEdit: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const handle = useActionResult(setError)
  const full = unit.availableBeds === 0
  const pct = unit.totalBeds > 0 ? Math.round(((unit.totalBeds - unit.availableBeds) / unit.totalBeds) * 100) : 0

  const change = (delta: 1 | -1) =>
    startTransition(async () => {
      try {
        handle(await updateBeds(unit.id, delta))
      } catch {
        setError('Falha de conexão. Tente novamente.')
      }
    })

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{unit.name}</p>
          <p className="text-xs text-muted-foreground">
            {unit.levelLabel} · {unit.city}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
            full
              ? 'bg-red-500/15 text-red-700 dark:text-red-400'
              : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400',
          )}
        >
          {full ? 'Lotada' : `${unit.availableBeds} vagas`}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Ocupação de ${unit.name}`}
        >
          <div
            className={cn('h-full rounded-full', pct >= 95 ? 'bg-red-600' : pct >= 80 ? 'bg-orange-600' : 'bg-primary')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={!canEdit || pending || unit.availableBeds === 0}
          onClick={() => change(-1)}
          aria-label={`Ocupar uma vaga em ${unit.name}`}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={!canEdit || pending || unit.availableBeds >= unit.totalBeds}
          onClick={() => change(1)}
          aria-label={`Liberar uma vaga em ${unit.name}`}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  )
}

export function UnitsPanel({ units, editableIds }: { units: Unit[]; editableIds: number[] | 'all' }) {
  return (
    <section
      aria-label="Unidades de saúde"
      className="flex flex-col rounded-xl border bg-card lg:col-span-2 xl:col-span-1"
    >
      <div className="border-b p-4">
        <h2 className="text-sm font-medium">Unidades de saúde</h2>
        <p className="text-xs text-muted-foreground">Vagas por nível de complexidade (atualiza a cada 30 s)</p>
      </div>
      <ul className="grid max-h-[calc(100dvh-260px)] gap-2 overflow-y-auto p-3 md:grid-cols-2 xl:grid-cols-1">
        {units.map((u) => (
          <UnitRow key={u.id} unit={u} canEdit={editableIds === 'all' || editableIds.includes(u.id)} />
        ))}
      </ul>
    </section>
  )
}
