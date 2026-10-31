'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type ActionState, registerPatient } from '@/app/actions'

function Field({
  id,
  label,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; id: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} />
    </div>
  )
}

export function NewPatientDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerPatient, null)

  useEffect(() => {
    if (state?.patientId) {
      setOpen(false)
      router.push(`/?p=${state.patientId}`, { scroll: false })
    }
  }, [state, router])

  const v = state?.values ?? {}
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus aria-hidden="true" />
        Novo paciente
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar paciente na regulação</DialogTitle>
          <DialogDescription>
            A IA classifica o risco automaticamente e indica a unidade mais capacitada com vaga.
          </DialogDescription>
        </DialogHeader>
        {/* key: remonta o form e devolve o que foi digitado quando há erro (o React 19 limpa os campos após a action) */}
        <form action={formAction} key={state?.error ?? 'ok'} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Field id="name" defaultValue={v.name} label="Nome completo" required className="col-span-2 md:col-span-4" autoComplete="off" />
            <Field id="age" defaultValue={v.age} label="Idade" type="number" min={0} max={120} step={1} required className="md:col-span-1" />
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <Label htmlFor="sex">Sexo</Label>
              <select
                id="sex"
                name="sex"
                required
                defaultValue={v.sex ?? ''}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="" disabled>
                  Selecione
                </option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </select>
            </div>
            <Field id="cns" defaultValue={v.cns} label="Cartão SUS (CNS)" inputMode="numeric" className="col-span-2 md:col-span-3" />
            <Field id="city" defaultValue={v.city} label="Município" required className="col-span-2 md:col-span-3" placeholder="Salvador" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="complaint">Queixa principal e história</Label>
            <Textarea
              id="complaint"
              name="complaint"
              defaultValue={v.complaint}
              required
              rows={3}
              placeholder="Ex.: dor torácica há 2h irradiando para braço esquerdo, sudorese..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comorbidities">Comorbidades</Label>
            <Input id="comorbidities" name="comorbidities" defaultValue={v.comorbidities} placeholder="Hipertensão, diabetes..." />
          </div>

          <fieldset className="grid grid-cols-3 gap-3 md:grid-cols-7">
            <legend className="mb-2 text-sm font-medium">Sinais vitais (opcional, mas recomendado)</legend>
            <Field id="systolic" defaultValue={v.systolic} label="PAS" type="number" placeholder="120" />
            <Field id="diastolic" defaultValue={v.diastolic} label="PAD" type="number" placeholder="80" />
            <Field id="heartRate" defaultValue={v.heartRate} label="FC" type="number" placeholder="80" />
            <Field id="respRate" defaultValue={v.respRate} label="FR" type="number" placeholder="16" />
            <Field id="spo2" defaultValue={v.spo2} label="SpO2 %" type="number" placeholder="98" />
            <Field id="temperature" defaultValue={v.temperature} label="Temp. °C" type="number" step="0.1" placeholder="36.5" />
            <Field id="glasgow" defaultValue={v.glasgow} label="Glasgow" type="number" min={3} max={15} placeholder="15" />
          </fieldset>

          {state?.error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {pending ? 'Analisando com IA...' : 'Cadastrar e analisar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
