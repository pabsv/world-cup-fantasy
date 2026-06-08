// Ad-hoc SQL runner against the WCF DB. Usage: node scripts/sql.mjs "select ..."
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
try {
  for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2];
  }
} catch {}

const REF = env.SUPABASE_PROJECT_REF, REGION = env.SUPABASE_DB_REGION || 'eu-central-1';
const candidates = [
  { host: `db.${REF}.supabase.co`, port: 5432, user: 'postgres' },
  { host: `aws-1-${REGION}.pooler.supabase.com`, port: 5432, user: `postgres.${REF}` },
  { host: `aws-0-${REGION}.pooler.supabase.com`, port: 5432, user: `postgres.${REF}` },
];

export async function connect() {
  for (const c of candidates) {
    const client = new pg.Client({ ...c, password: env.SUPABASE_DB_PASSWORD, database: 'postgres',
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    try { await client.connect(); return client; } catch { try { await client.end(); } catch {} }
  }
  throw new Error('no db connection');
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[2]) {
  const q = process.argv[2];
  if (q) {
    const client = await connect();
    const r = await client.query(q);
    console.log(JSON.stringify(r.rows, null, 2));
    await client.end();
  }
}
