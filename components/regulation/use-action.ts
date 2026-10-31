'use client'

import { useRouter } from 'next/navigation'

/** Trata o resultado de uma server action: sessão expirada → login; erro/estado defasado → recarrega os dados. */
export function useActionResult(setError: (m: string | null) => void) {
  const router = useRouter()
  return (res: { error?: string; code?: string } | undefined) => {
    if (!res?.error) return setError(null)
    if (res.code === 'auth') return router.push('/login')
    setError(res.error)
    if (res.code === 'stale' || res.code === undefined) router.refresh()
  }
}
