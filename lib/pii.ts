/** Remove identificadores diretos de texto livre antes de enviar ao LLM (minimização de dados, LGPD). */
export function redactPII(text: string | null | undefined, max = 600): string {
  if (!text) return ''
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[e-mail]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\b\d{15}\b/g, '[cns]')
    .replace(/(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, '[telefone]')
    .replace(/[<>]/g, '')
    .slice(0, max)
}

export const maskCns = (cns: string | null | undefined) =>
  cns ? `${'•'.repeat(Math.max(cns.length - 4, 0))}${cns.slice(-4)}` : null

/** Log seguro: nunca imprime corpo de requisição/prompt (pode conter dados de saúde). */
export function safeErr(err: unknown) {
  const e = err as { name?: string; message?: string; statusCode?: number; status?: number }
  return `${e?.name ?? 'Error'}${e?.statusCode ?? e?.status ? ` [${e.statusCode ?? e.status}]` : ''}: ${String(e?.message ?? '').slice(0, 200)}`
}
