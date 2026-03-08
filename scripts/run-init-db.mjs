#!/usr/bin/env node
/**
 * Runs scripts/init-db.sql against Postgres.
 * Called automatically during build when POSTGRES_URL is set.
 * Safe to run multiple times (uses CREATE IF NOT EXISTS).
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    try {
      const path = join(process.cwd(), name);
      const raw = readFileSync(path, "utf-8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
      break;
    } catch {
      /* ignore */
    }
  }
}

loadEnv();

const url = process.env.POSTGRES_URL;
if (!url) {
  console.log("init-db: POSTGRES_URL not set, skipping");
  process.exit(0);
}

async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  const raw = readFileSync(join(__dirname, "init-db.sql"), "utf-8");
  const statements = raw
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    await sql.query(stmt + ";", []);
  }
  console.log(`init-db: executed ${statements.length} statements`);
}

main().catch((err) => {
  console.error("init-db error:", err.message);
  process.exit(1);
});
