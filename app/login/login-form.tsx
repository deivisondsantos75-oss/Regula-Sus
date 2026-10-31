'use client'

import { useActionState, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginProvisional, type LoginState } from '@/app/auth-actions'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'regulador', label: 'Médico regulador' },
  { value: 'unidade', label: 'Unidade de saúde (atualiza as vagas da sua unidade)' },
  { value: 'gestor', label: 'Gestor / auditoria' },
] as const

export function LoginForm({
  govbr,
  provisional,
  needsCode,
  roles,
  units,
}: {
  govbr: boolean
  provisional: boolean
  needsCode: boolean
  roles: Record<string, boolean>
  units: { id: number; name: string }[]
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginProvisional, null)
  const available = ROLE_OPTIONS.filter((r) => roles[r.value])
  const [role, setRole] = useState(state?.values?.role ?? available[0]?.value ?? 'regulador')
  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-2">
        {govbr ? (
          <a href="/api/auth/govbr" className={cn(buttonVariants(), 'h-9 w-full bg-[#1351b4] text-white hover:bg-[#0c3b8a]')}>
            Entrar com gov.br
          </a>
        ) : (
          <Button disabled className="w-full" title="Requer credenciais do Login Único">
            Entrar com gov.br
          </Button>
        )}
        {!govbr && (
          <p className="text-xs text-muted-foreground">
            O Login Único exige adesão formal do órgão público. Enquanto as credenciais não são liberadas, use o
            acesso provisório.
          </p>
        )}
      </div>

      {provisional && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> acesso provisório <span className="h-px flex-1 bg-border" />
          </div>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              O acesso provisório não está configurado neste ambiente (defina PROVISIONAL_ACCESS_CODE).
            </p>
          ) : (
            // `key` remonta o formulário e restaura os valores digitados quando a validação falha
            // (o React 19 limpa os campos após cada action)
            <form action={action} key={state?.error ?? 'ok'} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required minLength={3} autoComplete="name" defaultValue={state?.values?.name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Perfil</Label>
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                  className="h-9 rounded-md border bg-transparent px-3 text-sm"
                >
                  {available.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {role === 'unidade' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="unitId">Sua unidade</Label>
                  <select
                    id="unitId"
                    name="unitId"
                    required
                    defaultValue={state?.values?.unitId ?? ''}
                    className="h-9 rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {needsCode && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="code">{role === 'gestor' ? 'Código do gestor' : 'Código de acesso'}</Label>
                  <Input id="code" name="code" type="password" required autoComplete="one-time-code" />
                </div>
              )}
              <p role="alert" className="min-h-5 text-sm text-red-700 dark:text-red-400">
                {state?.error}
              </p>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                Entrar
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
