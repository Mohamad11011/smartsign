import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.POSTGRES_URL;
  if (!url) return null;
  return neon(url);
}

export function isPostgresEnabled(): boolean {
  return !!process.env.POSTGRES_URL;
}

export function getDb() {
  const sql = getSql();
  if (!sql) throw new Error("POSTGRES_URL is not set");
  return sql;
}
