// Create or delete a single temp verification user. Usage:
//   node scripts/temp-user.mjs create
//   node scripts/temp-user.mjs delete
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in env)) env[m[1]] = m[2];
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
const H = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };
const EMAIL = "verify@wc26.local";

const action = process.argv[2] || "create";
const list = await (await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
const existing = list.users?.find((u) => u.email === EMAIL);

if (action === "delete") {
  if (existing) {
    await fetch(`${URL}/auth/v1/admin/users/${existing.id}`, { method: "DELETE", headers: H });
    console.log("deleted", EMAIL);
  } else console.log("nothing to delete");
} else {
  if (existing) {
    console.log("exists", existing.id);
  } else {
    const r = await fetch(`${URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        email: EMAIL,
        password: "worldcup26",
        email_confirm: true,
        user_metadata: { display_name: "Verify" },
      }),
    });
    const j = await r.json();
    console.log(r.ok ? "created " + j.id : "FAILED " + JSON.stringify(j));
  }
}
