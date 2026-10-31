'use server'

import { z } from 'zod'
import { countRecent, logAudit } from '@/lib/audit'
import { CAN, ForbiddenError, requireActionSession } from '@/lib/auth'
import { runAgent, type ChatMsg } from '@/lib/agent'
import { safeErr } from '@/lib/pii'

const schema = z
  .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) }))
  .min(1)
  .max(30)

const MAX_PER_HOUR = 40

export async function askAgent(history: ChatMsg[]): Promise<{ text?: string; error?: string; code?: 'auth' | 'role' }> {
  try {
    const actor = await requireActionSession(CAN.agente)
    const parsed = schema.safeParse(history.slice(-12))
    if (!parsed.success) return { error: 'Mensagem inválida ou vazia.' }
    const msgs = parsed.data
    if (msgs[msgs.length - 1].role !== 'user') return { error: 'Mensagem inválida.' }

    // limite de uso (custo): por usuário, por hora
    if ((await countRecent('agente_consulta', actor.id, 60, actor.name)) >= MAX_PER_HOUR) {
      return { error: `Limite de ${MAX_PER_HOUR} consultas por hora atingido. Tente mais tarde.` }
    }
    const { text, toolsUsed } = await runAgent(msgs)
    await logAudit(actor, 'agente_consulta', 'agente', undefined, `ferramentas: ${toolsUsed.join(', ') || 'nenhuma'}`)
    return { text: text || 'Não consegui gerar uma resposta. Reformule a pergunta.' }
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message, code: err.code }
    console.error('Agente falhou:', safeErr(err))
    return { error: 'O agente de IA está indisponível agora. A fila continua funcionando normalmente.' }
  }
}
