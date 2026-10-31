import type { Patient, Unit } from '@/lib/db/schema'

export const patient = (o: Partial<Patient> = {}): Patient => ({
  id: 1, name: 'Teste', age: 40, sex: 'M', cns: null, city: 'Salvador', complaint: 'queixa de teste genérica',
  comorbidities: null, systolic: null, diastolic: null, heartRate: null, spo2: null, temperature: null,
  respRate: null, glasgow: null, status: 'aguardando', priority: null, complexity: null, riskScore: null,
  specialty: null, aiSummary: null, aiJustification: null, redFlags: null, assignedUnitId: null,
  triagedAt: null, referredAt: null, createdAt: new Date(), ...o,
})

export const unit = (o: Partial<Unit> = {}): Unit => ({
  id: 1, name: 'U', city: 'Salvador', level: 3, levelLabel: 'Média', specialties: ['clinica_geral'],
  audience: 'todos', totalBeds: 10, availableBeds: 5, createdAt: new Date(), ...o,
})

/** sinais vitais normais de adulto */
export const NORMAL = { systolic: 120, diastolic: 80, heartRate: 78, respRate: 16, spo2: 98, temperature: '36.6' as unknown as string, glasgow: 15 }
