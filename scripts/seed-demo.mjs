// Seed demo users + predictions + a few results so the app is demoable.
// Uses the Auth Admin REST API (users) + direct Postgres (data). Safe to re-run.
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
const LEAGUE_ID = "11111111-1111-1111-1111-111111111111";

const DEMO = [
  { email: "alex@wc26.local", name: "Alex", admin: true },
  { email: "sam@wc26.local", name: "Sam", admin: false },
  { email: "jordan@wc26.local", name: "Jordan", admin: false },
];
const PASSWORD = "worldcup26";

const authHeaders = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };

async function ensureUser(d) {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      email: d.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: d.name },
    }),
  });
  if (res.ok) return (await res.json()).id;
  // already exists -> look it up
  const list = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: authHeaders });
  const u = (await list.json()).users.find((x) => x.email === d.email);
  if (!u) throw new Error(`createUser failed for ${d.email}: ${await res.text()}`);
  return u.id;
}

async function connect() {
  const candidates = [
    { host: `aws-1-${REGION}.pooler.supabase.com`, port: 5432, user: `postgres.${REF}` },
    { host: `aws-0-${REGION}.pooler.supabase.com`, port: 5432, user: `postgres.${REF}` },
  ];
  for (const c of candidates) {
    const client = new pg.Client({ ...c, password: env.SUPABASE_DB_PASSWORD, database: "postgres",
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    try { await client.connect(); return client; } catch { try { await client.end(); } catch {} }
  }
  throw new Error("no db connection");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const db = await connect();
  const { rows: teams } = await db.query("select id, group_id, seed from teams");
  const byGroup = new Map();
  for (const t of teams) {
    if (!byGroup.has(t.group_id)) byGroup.set(t.group_id, []);
    byGroup.get(t.group_id).push(t);
  }
  for (const arr of byGroup.values()) arr.sort((a, b) => a.seed - b.seed);
  const groupIds = [...byGroup.keys()].sort();

  for (const d of DEMO) {
    const id = await ensureUser(d);
    if (d.admin) await db.query("update profiles set is_admin = true where id = $1", [id]);
    await db.query(
      "insert into league_members(league_id,user_id) values($1,$2) on conflict do nothing",
      [LEAGUE_ID, id],
    );
    for (const g of groupIds) {
      const order = shuffle(byGroup.get(g).map((t) => t.id));
      await db.query(
        `insert into group_predictions(league_id,user_id,group_id,predicted_order,updated_at)
         values($1,$2,$3,$4::uuid[],now())
         on conflict (league_id,user_id,group_id)
         do update set predicted_order = excluded.predicted_order, updated_at = now()`,
        [LEAGUE_ID, id, g, order],
      );
    }
    console.log(`✓ ${d.name} <${d.email}> ${d.admin ? "(admin)" : ""} — 12 groups`);
  }

  for (const g of ["A", "B", "C", "D"]) {
    const order = byGroup.get(g).map((t) => t.id); // seed order = "actual" result
    await db.query(
      `insert into group_results(group_id,final_order,entered_at)
       values($1,$2::uuid[],now())
       on conflict (group_id) do update set final_order = excluded.final_order, entered_at = now()`,
      [g, order],
    );
  }
  console.log("✓ results entered for groups A, B, C, D");
  await db.end();
  console.log(`\nDemo login: ${DEMO.map((d) => d.email).join(", ")}  /  password: ${PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
