import { cn } from '@/lib/utils'
import { metaOf } from '@/lib/regulation'

export function PriorityBadge({
  priority,
  className,
}: {
  priority: string | null
  className?: string
}) {
  const meta = metaOf(priority)
  if (!meta) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground',
          className,
        )}
      >
        Aguardando análise
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
