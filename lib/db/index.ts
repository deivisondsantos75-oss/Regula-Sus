import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const globalForPg = globalThis as unknown as { __pgPool?: Pool }

// Reaproveita o pool entre recarregamentos (dev) e limita conexões em ambiente serverless.
export const pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
  })
if (process.env.NODE_ENV !== 'production') globalForPg.__pgPool = pool

export const db = drizzle(pool, { schema })
