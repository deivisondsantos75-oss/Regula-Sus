'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui', display: 'grid', placeItems: 'center', minHeight: '100dvh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <h1>RegulaSUS indisponível</h1>
          <p>Ocorreu um erro inesperado. Tente novamente em instantes.</p>
          <button onClick={reset} style={{ padding: '8px 16px' }}>
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
