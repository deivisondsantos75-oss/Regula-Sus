import type { Patient } from '@/lib/db/schema'

/** Paciente como enviado ao navegador: CNS mascarado (LGPD). */
export type PatientRow = Omit<Patient, 'cns'> & { cns: string | null }
