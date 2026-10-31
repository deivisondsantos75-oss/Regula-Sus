'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Atualiza fila, vagas e tempos de espera periodicamente (só com a aba visível). */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && router.refresh()
    const t = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [router, intervalMs])
  return null
}
