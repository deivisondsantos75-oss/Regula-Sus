'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Erro de página:', error.digest ?? error.name)
  }, [error])
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar a regulação (o banco de dados ou a sessão podem estar indisponíveis). Nenhum dado
        foi perdido.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Tentar novamente</Button>
        <a href="/login" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted">
          Ir para o login
        </a>
      </div>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">ref. {error.digest}</p>}
    </main>
  )
}
