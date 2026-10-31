import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  level: integer('level').notNull(),
  levelLabel: text('level_label').notNull(),
  specialties: text('specialties').array().notNull().default([]),
  /** público atendido: todos | adulto | pediatrico | materno_infantil */
  audience: text('audience').notNull().default('todos'),
  totalBeds: integer('total_beds').notNull(),
  availableBeds: integer('available_beds').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  sex: text('sex').notNull(),
  cns: text('cns'),
  city: text('city').notNull(),
  complaint: text('complaint').notNull(),
  comorbidities: text('comorbidities'),
  systolic: integer('systolic'),
  diastolic: integer('diastolic'),
  heartRate: integer('heart_rate'),
  spo2: integer('spo2'),
  temperature: numeric('temperature', { precision: 4, scale: 1 }),
  respRate: integer('resp_rate'),
  glasgow: integer('glasgow'),
  status: text('status').notNull().default('aguardando'),
  priority: text('priority'),
  complexity: text('complexity'),
  riskScore: integer('risk_score'),
  specialty: text('specialty'),
  aiSummary: text('ai_summary'),
  aiJustification: text('ai_justification'),
  redFlags: text('red_flags').array(),
  assignedUnitId: integer('assigned_unit_id'),
  triagedAt: timestamp('triaged_at', { withTimezone: true }),
  referredAt: timestamp('referred_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Unit = typeof units.$inferSelect
export type Patient = typeof patients.$inferSelect

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  entity: text('entity'),
  entityId: text('entity_id'),
  detail: text('detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditEntry = typeof auditLog.$inferSelect
