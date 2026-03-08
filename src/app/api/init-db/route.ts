import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getDb, isPostgresEnabled } from "@/lib/db";

/**
 * POST /api/init-db
 * Runs scripts/init-db.sql against the Postgres database.
 * Protected by INIT_DB_SECRET header. Call once after deploying to a new database.
 *
 * Example:
 *   curl -X POST https://your-app.vercel.app/api/init-db \
 *     -H "x-init-db-secret: your-secret"
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-init-db-secret");
  const expected = process.env.INIT_DB_SECRET;

  if (!expected) {
    return NextResponse.json(
      {
        error:
          "INIT_DB_SECRET is not set. Add it in Vercel env vars, then call this endpoint with header x-init-db-secret.",
      },
      { status: 500 }
    );
  }

  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPostgresEnabled()) {
    return NextResponse.json(
      { error: "POSTGRES_URL is not set. Database init skipped." },
      { status: 400 }
    );
  }

  try {
    const sqlPath = join(process.cwd(), "scripts", "init-db.sql");
    const raw = readFileSync(sqlPath, "utf-8");

    // Split by semicolon, trim, filter empty and comment-only lines
    const statements = raw
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    const db = getDb();
    for (const stmt of statements) {
      const query = stmt + ";";
      await db.query(query, []);
    }

    return NextResponse.json({
      ok: true,
      message: `Executed ${statements.length} statements. Tables created.`,
    });
  } catch (err) {
    console.error("Init DB error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Database init failed",
      },
      { status: 500 }
    );
  }
}
