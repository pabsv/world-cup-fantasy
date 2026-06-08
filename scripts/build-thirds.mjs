// Scrape the official 495-row Annex C third-place allocation table from Wikipedia
// raw wikitext -> src/lib/thirdsTable.json.
// Key   = sorted 8-letter set of groups whose third-placed team qualified ("EFGHIJKL").
// Value = the 8 qualifying-third group letters in COLUMN order [1A,1B,1D,1E,1G,1I,1K,1L].
//   (bracket.ts maps those columns -> R32 match numbers.)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "https://en.wikipedia.org/wiki/Template:2026_FIFA_World_Cup_third-place_table?action=raw";

const text = await (await fetch(SRC)).text();

// Split into row blocks: each starts with `! scope="row" | N`.
const parts = text.split(/!\s*scope="row"\s*\|/).slice(1);
const table = {};
let errors = 0;

for (const part of parts) {
  // row content up to the next row separator `|-` or table end `|}`
  const chunk = part.split(/\n\|-|\n\|\}/)[0];
  const noMatch = chunk.match(/^\s*(\d+)/);
  if (!noMatch) continue;
  const no = Number(noMatch[1]);

  // strip the row-1 spanning divider cell, then turn line-leading `|` into `||`
  let body = chunk
    .replace(/^\s*\d+\s*/, "")
    .replace(/!\s*rowspan="\d+"\s*\|/g, "")
    .replace(/\n\s*\|/g, "||");

  const cells = body
    .split("||")
    .map((c) => c.replace(/^\s*\|/, "").replace(/'''/g, "").trim());
  // cells[0] is group A (the leading `|` belongs to it — do not drop)

  // first 12 = qualifying A..L ; last 8 = allocation
  const qualCells = cells.slice(0, 12);
  const allocCells = cells.slice(12, 20);

  const qualifying = [];
  qualCells.forEach((c, i) => {
    if (c) qualifying.push(String.fromCharCode(65 + i)); // A..L
  });
  const alloc = allocCells.map((c) => (c.match(/3\s*([A-L])/) || [])[1]).filter(Boolean);

  if (qualifying.length !== 8 || alloc.length !== 8) {
    errors++;
    if (errors <= 5) console.error(`row ${no}: qual=${qualifying.join("")} alloc=${alloc.join("")}`);
    continue;
  }
  const key = qualifying.slice().sort().join("");
  // sanity: every allocated third's group must be in the qualifying set
  if (!alloc.every((g) => qualifying.includes(g))) {
    errors++;
    if (errors <= 5) console.error(`row ${no}: alloc not subset of qualifying (${key} -> ${alloc.join("")})`);
    continue;
  }
  table[key] = alloc;
}

const count = Object.keys(table).length;
console.log(`parsed ${count} rows, ${errors} errors`);
if (count !== 495 || errors > 0) {
  console.error("Expected 495 clean rows. Aborting.");
  process.exit(1);
}
writeFileSync(join(root, "src", "lib", "thirdsTable.json"), JSON.stringify(table) + "\n");
console.log("wrote src/lib/thirdsTable.json");
// spot-check row 1
console.log("sample EFGHIJKL ->", table["EFGHIJKL"].join(","), "(expect E,J,I,F,H,G,L,K)");
