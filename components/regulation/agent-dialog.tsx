'use client'

import { useRef, useState, useTransition } from 'react'
import { Bot, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { askAgent } from '@/app/agent-actions'
import { cn } from '@/lib/utils'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Quem está fora do prazo de espera agora?',
  'Resuma a situação da fila e dos leitos.',
  'Para onde encaminhar os casos vermelhos?',
]

export function AgentDialog() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const endRef = useRef<HTMLDivElement>(null)

  const send = (text: string) => {
    const content = text.trim()
    if (!content || pending) return
    const next: Msg[] = [...msgs, { role: 'user', content }]
    setMsgs(next)
    setInput('')
    setError(null)
    startTransition(async () => {
      try {
        // só as últimas mensagens vão ao servidor (histórico longo não quebra o chat)
        const res = await askAgent(next.slice(-12))
        if (res.code === 'auth') window.location.assign('/login')
        else if (res.error) setError(res.error)
        else if (res.text) setMsgs([...next, { role: 'assistant', content: res.text }])
      } catch {
        setError('Falha de conexão com o servidor. Tente novamente.')
      }
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Bot aria-hidden="true" />
        <span className="hidden sm:inline">Agente IA</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Agente Regulador</DialogTitle>
          <DialogDescription>
            Consulta a fila e as vagas em tempo real e sugere encaminhamentos. A decisão final é sempre do
            regulador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[50dvh] min-h-40 flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
          {msgs.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border px-3 py-1.5 text-left text-xs hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed',
                m.role === 'user' ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted',
              )}
            >
              {m.content}
            </div>
          ))}
          {pending && (
            <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Consultando a fila…
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre a fila, vagas ou um paciente (#id)…"
            aria-label="Mensagem para o agente"
            maxLength={500}
          />
          <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Enviar">
            <Send aria-hidden="true" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
