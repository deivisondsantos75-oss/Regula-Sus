import { AlarmClock, BedDouble, Clock, Send, Siren, Users } from 'lucide-react'
import { formatWait } from '@/lib/regulation'

export function StatsBar({
  overdue,
  waiting,
  critical,
  avgWait,
  beds,
  referred,
}: {
  overdue: number
  waiting: number
  critical: number
  avgWait: number
  beds: number
  referred: number
}) {
  const items = [
    { label: 'Na fila', value: String(waiting), icon: Users },
    { label: 'Críticos (vermelho/laranja)', value: String(critical), icon: Siren, alert: critical > 0 },
    { label: 'Fora do prazo (Manchester)', value: String(overdue), icon: AlarmClock, alert: overdue > 0 },
    { label: 'Espera média', value: formatWait(avgWait), icon: Clock },
    { label: 'Leitos disponíveis', value: String(beds), icon: BedDouble },
    { label: 'Encaminhados', value: String(referred), icon: Send },
  ]

  return (
    <section aria-label="Indicadores da regulação" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-3 rounded-xl border bg-card p-4 ${item.alert ? 'border-red-600/50' : ''}`}
        >
          <item.icon
            className={`size-5 shrink-0 ${item.alert ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-mono text-xl font-semibold tabular-nums">{item.value}</p>
            <p className="truncate text-xs text-muted-foreground">{item.label}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
