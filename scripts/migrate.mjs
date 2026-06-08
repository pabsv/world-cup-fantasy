// Apply SQL migrations in supabase/migrations/ to the WCF Postgres DB.
// Connects directly (no Supabase MCP — that points at a different project).
// Usage: node scripts/migrate.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// --- load .env.local (simple parser) ---
const env = { ...process.env };
try {
  for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2];
  }
} catch {}

const PASSWORD = env.SUPABASE_DB_PASSWORD;
const REF = env.SUPABASE_PROJECT_REF;
const REGION = env.SUPABASE_DB_REGION || 'eu-central-1';
if (!PASSWORD || !REF) {
  console.error('Missing SUPABASE_DB_PASSWORD or SUPABASE_PROJECT_REF in .env.local');
  process.exit(1);
}

const candidates = [
  { label: 'direct',          host: `db.${REF}.supabase.co`,                port: 5432, user: 'postgres' },
  { label: 'session-pooler',  host: `aws-0-${REGION}.pooler.supabase.com`,  port: 5432, user: `postgres.${REF}` },
  { label: 'session-pooler2', host: `aws-1-${REGION}.pooler.supabase.com`,  port: 5432, user: `postgres.${REF}` },
];

async function connect() {
  for (const c of candidates) {
    const client = new pg.Client({
      host: c.host, port: c.port, user: c.user, password: PASSWORD,
      database: 'postgres', ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      console.log(`✓ connected via ${c.label} (${c.host})`);
      return client;
    } catch (e) {
      console.log(`✗ ${c.label} (${c.host}): ${e.message}`);
      try { await client.end(); } catch {}
    }
  }
  throw new Error('Could not connect to the database on any host.');
}

async function main() {
  const client = await connect();
  await client.query(`create table if not exists public._wcf_migrations (
    name text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set(
    (await client.query('select name from public._wcf_migrations')).rows.map((r) => r.name)
  );

  const dir = join(root, 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const f of files) {
    if (applied.has(f)) { console.log(`• skip   ${f}`); continue; }
    const sql = readFileSync(join(dir, f), 'utf8');
    process.stdout.write(`• apply  ${f} ... `);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into public._wcf_migrations(name) values ($1)', [f]);
      await client.query('commit');
      console.log('ok');
    } catch (e) {
      await client.query('rollback');
      console.error(`FAILED\n${e.message}`);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
