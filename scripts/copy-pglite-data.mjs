import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = "node_modules/@electric-sql/pglite/dist";
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];
const root = ".vercel/output/functions";
if (!existsSync(root)) process.exit(0);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.includes("pglite") && name.endsWith(".mjs")) {
      for (const file of files) {
        const src = join(dist, file);
        if (existsSync(src)) copyFileSync(src, join(dir, file));
      }
    }
  }
}

walk(root);
