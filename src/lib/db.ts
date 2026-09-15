import { Pool, types, type QueryResultRow } from "pg";

// Return DATE columns as plain "YYYY-MM-DD" strings instead of pg's default
// JS Date objects (which get parsed as local-midnight and cause off-by-one-day
// bugs). OID 1082 = date.
types.setTypeParser(1082, (val: string) => val);

// Return NUMERIC columns as JS numbers instead of strings (pg's default,
// to avoid float precision loss on huge numbers we don't have). OID 1700 = numeric.
types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));

declare global {
  var __workoutDbPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in (see README)."
    );
  }

  // Local Postgres (e.g. "localhost") typically has no TLS listener; hosted
  // providers (Neon / Vercel Postgres / Supabase) require SSL. Disable SSL only
  // for explicit local/dev connection strings.
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

  return new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}

// Reuse the pool across hot-reloads in dev and across invocations on serverless.
// Created lazily (not at module import time) so that `next build` doesn't
// require DATABASE_URL to exist -- only actual requests do.
export function getPool(): Pool {
  if (!global.__workoutDbPool) {
    global.__workoutDbPool = createPool();
  }
  return global.__workoutDbPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
