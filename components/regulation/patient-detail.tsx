'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, BedDouble, Brain, CheckCircle2, Loader2, MapPin, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { confirmReferral, triagePatient } from '@/app/actions'
import type { Unit } from '@/lib/db/schema'
import type { PatientRow } from '@/lib/types'
import { vitalSeverity, type Severity } from '@/lib/vitals'
import {
  COMPLEXITY_LEVEL,
  SPECIALTY_LABEL,
  formatDateTime,
  formatWait,
  metaOf,
  waitMinutes,
} from '@/lib/regulation'
import { useActionResult } from './use-action'
import { cn } from '@/lib/utils'
import { PriorityBadge } from './priority-badge'

type Candidate = Unit & { sameCity: boolean }

function Vital({ label, value, unit, severity = 'normal' }: { label: string; value: unknown; unit?: string; severity?: Severity }) {
  const alert = severity !== 'normal'
  const empty = value == null || value === ''
  return (
    <div className={cn('rounded-lg border p-3', alert && 'border-red-600/50 bg-red-500/10')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-mono text-base font-semibold tabular-nums', alert && 'text-red-700 dark:text-red-400')}>
        {empty ? '—' : String(value)}
        {!empty && unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}
        {alert && !empty && (
          <>
            <AlertTriangle className="ml-1 inline size-3" aria-hidden="true" />
            <span className="sr-only"> {severity === 'critico' ? 'crítico' : 'alterado'}</span>
          </>
        )}
      </p>
    </div>
  )
}

export function PatientDetail({
  patient,
  candidates,
  assignedUnit,
  canTriage,
  canRefer,
  now,
}: {
  now: number
  patient: PatientRow
  candidates: Candidate[]
  assignedUnit?: Unit
  canTriage: boolean
  canRefer: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [action, setAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handle = useActionResult(setError)

  const runTriage = () => {
    setError(null)
    setAction('triage')
    startTransition(async () => {
      try {
        handle(await triagePatient(patient.id))
      } catch {
        setError('Falha de conexão. Tente novamente.')
      }
    })
  }

  const refer = (unitId: number) => {
    setError(null)
    setAction(`refer-${unitId}`)
    startTransition(async () => {
      try {
        handle(await confirmReferral(patient.id, unitId))
      } catch {
        setError('Falha de conexão. Tente novamente.')
      }
    })
  }

  const temp = patient.temperature ? Number(patient.temperature) : null
  const priorityMeta = metaOf(patient.priority)
  const sev = vitalSeverity(patient)
  const complexity = patient.complexity ? COMPLEXITY_LEVEL[patient.complexity] : null

  return (
    <section aria-label="Análise do paciente" className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-balance">{patient.name}</h1>
            <span className="font-mono text-xs text-muted-foreground">#{patient.id}</span>
            <PriorityBadge priority={patient.priority} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient.age} anos · {patient.sex === 'F' ? 'Feminino' : 'Masculino'} · {patient.city}
            {patient.cns ? ` · CNS ${patient.cns}` : ''} · aguardando há {formatWait(waitMinutes(patient.createdAt, now))}
          </p>
        </div>
        {patient.status !== 'encaminhado' && canTriage && (
          <Button variant="outline" size="sm" onClick={runTriage} disabled={pending}>
            {pending && action === 'triage' ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : patient.priority ? (
              <RefreshCw aria-hidden="true" />
            ) : (
              <Brain aria-hidden="true" />
            )}
            {patient.priority ? 'Reanalisar com IA' : 'Analisar com IA'}
          </Button>
        )}
      </header>

      <div>
        <h2 className="mb-2 text-sm font-medium">Queixa principal</h2>
        <p className="text-sm leading-relaxed text-pretty">{patient.complaint}</p>
        {patient.comorbidities && (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Comorbidades:</span> {patient.comorbidities}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        <Vital
          label="PA"
          value={patient.systolic && patient.diastolic ? `${patient.systolic}/${patient.diastolic}` : null}
          unit="mmHg"
          severity={sev.pa}
        />
        <Vital label="FC" value={patient.heartRate} unit="bpm" severity={sev.fc} />
        <Vital label="FR" value={patient.respRate} unit="irpm" severity={sev.fr} />
        <Vital label="SpO2" value={patient.spo2} unit="%" severity={sev.spo2} />
        <Vital label="Temp." value={temp} unit="°C" severity={sev.temp} />
        <Vital label="Glasgow" value={patient.glasgow} severity={sev.glasgow} />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-600/50 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {!patient.priority ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <Brain className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Este paciente ainda não foi analisado. Clique em <strong>Analisar com IA</strong> para
            classificar o risco e encontrar a unidade adequada.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Brain className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-medium">
                {patient.aiSummary?.startsWith('Classificação por protocolo') ? 'Análise por protocolo' : 'Análise da IA'}
              </h2>
              <span className="text-xs text-muted-foreground">apoio à decisão do regulador</span>
            </div>
            <dl className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Escore de risco</dt>
                <dd className="font-mono text-2xl font-semibold tabular-nums">{patient.riskScore}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tempo-alvo</dt>
                <dd className="text-sm font-medium">{priorityMeta?.maxWait}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Complexidade</dt>
                <dd className="text-sm font-medium">{complexity?.label}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Especialidade</dt>
                <dd className="text-sm font-medium">{SPECIALTY_LABEL[patient.specialty ?? ''] ?? patient.specialty}</dd>
              </div>
            </dl>
            <p className="text-sm font-medium text-pretty">{patient.aiSummary}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              {patient.aiJustification}
            </p>
            {patient.redFlags && patient.redFlags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Sinais de alarme">
                {patient.redFlags.map((flag) => (
                  <li
                    key={flag}
                    className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400"
                  >
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    {flag}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {patient.status === 'encaminhado' && assignedUnit ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Encaminhado para {assignedUnit.name}</p>
                <p className="text-xs text-muted-foreground">
                  {assignedUnit.levelLabel} · {assignedUnit.city} · vaga reservada
                  {patient.referredAt ? ` em ${formatDateTime(patient.referredAt)}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="mb-2 text-sm font-medium">Unidades capacitadas com vaga</h2>
              {candidates.length === 0 ? (
                <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-pretty">
                  Nenhuma unidade com o nível e a especialidade necessários tem vaga no momento.
                  Mantenha o paciente na fila prioritária e acione a regulação estadual.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {candidates.map((u, i) => (
                    <li
                      key={u.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3',
                        i === 0 && 'border-primary/60 bg-primary/5',
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          {i === 0 && (
                            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                              Recomendada
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{u.levelLabel}</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden="true" />
                            {u.city}
                            {u.sameCity ? ' (mesmo município)' : ''}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <BedDouble className="size-3" aria-hidden="true" />
                            {u.availableBeds} vaga{u.availableBeds === 1 ? '' : 's'}
                          </span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={i === 0 ? 'default' : 'outline'}
                        disabled={pending || !canRefer}
                        onClick={() => refer(u.id)}
                      >
                        {pending && action === `refer-${u.id}` && (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        )}
                        Encaminhar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
