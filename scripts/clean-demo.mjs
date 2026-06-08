// Remove all demo/test users and their data + fake results. Safe to re-run.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in env)) env[m[1]] = m[2];
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
const REF = env.SUPABASE_PROJECT_REF;
const REGION = env.SUPABASE_DB_REGION || "eu-central-1";
const authHeaders = { apikey: SECRET, Authorization: `Bearer ${SECRET}` };

async function connect() {
  for (const c of [
    { host: `aws-1-${REGION}.pooler.supabase.com`, port: 5432, user: `postgres.${REF}` },
    { host: `aws-0-${REGION}.pooler.supabase.com`, port: 5432, user: `postgres.${REF}` },
  ]) {
    const client = new pg.Client({ ...c, password: env.SUPABASE_DB_PASSWORD, database: "postgres",
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    try { await client.connect(); return client; } catch { try { await client.end(); } catch {} }
  }
  throw new Error("no db connection");
}

async function main() {
  // delete every auth user (no real users yet) -> cascades to profiles/predictions/memberships
  const res = await fetch(`${URL}/auth/v1/admin/users?per_page=500`, { headers: authHeaders });
  const { users } = await res.json();
  for (const u of users) {
    const d = await fetch(`${URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: authHeaders });
    console.log(`${d.ok ? "✓ deleted" : "✗ failed"} ${u.email}`);
  }
  // wipe fake results + any orphan rows
  const db = await connect();
  for (const t of ["group_results", "bracket_results", "bracket_predictions", "group_predictions"]) {
    const r = await db.query(`delete from ${t}`);
    console.log(`✓ cleared ${t} (${r.rowCount})`);
  }
  const { rows } = await db.query("select count(*)::int n from profiles");
  console.log(`profiles remaining: ${rows[0].n}`);
  await db.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
