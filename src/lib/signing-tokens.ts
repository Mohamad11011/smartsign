import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { isPostgresEnabled, getDb } from "./db";

export interface SigningSession {
  token: string;
  documentId?: string;
  documentName: string;
  signerEmail: string;
  signerName: string;
  signerId: string;
  pdfBase64: string;
  coordinates: Array<{ page: number; x: number; y: number }>;
  createdAt: string;
  expiresAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const TOKENS_FILE = path.join(DATA_DIR, "signing-tokens.json");

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function loadTokens(): Promise<Record<string, SigningSession>> {
  try {
    const raw = await readFile(TOKENS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveTokens(tokens: Record<string, SigningSession>) {
  await ensureDir(DATA_DIR);
  await writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

function rowToSession(row: Record<string, unknown>): SigningSession {
  return {
    token: row.token as string,
    documentId: row.document_id as string | undefined,
    documentName: row.document_name as string,
    signerEmail: row.signer_email as string,
    signerName: row.signer_name as string,
    signerId: row.signer_id as string,
    pdfBase64: row.pdf_base64 as string,
    coordinates: (row.coordinates as Array<{ page: number; x: number; y: number }>) ?? [],
    createdAt: new Date(row.created_at as string).toISOString(),
    expiresAt: row.expires_at ? new Date(row.expires_at as string).toISOString() : undefined,
  };
}

const DEFAULT_EXPIRY_DAYS = 30;

export async function createSigningSession(
  session: Omit<SigningSession, "token" | "createdAt" | "expiresAt">
): Promise<string> {
  const token = randomUUID().replace(/-/g, "");
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);
  const full: SigningSession = {
    ...session,
    token,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  if (isPostgresEnabled()) {
    const sql = getDb();
    await sql`
      INSERT INTO signing_sessions (token, document_id, document_name, signer_email, signer_name, signer_id, pdf_base64, coordinates, created_at, expires_at)
      VALUES (
        ${token},
        ${session.documentId ?? null},
        ${session.documentName},
        ${session.signerEmail},
        ${session.signerName},
        ${session.signerId},
        ${session.pdfBase64},
        ${JSON.stringify(session.coordinates)},
        ${now.toISOString()},
        ${expiresAt.toISOString()}
      )
    `;
    return token;
  }

  const tokens = await loadTokens();
  tokens[token] = full;
  await saveTokens(tokens);
  return token;
}

export async function getSigningSession(token: string): Promise<SigningSession | null> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`SELECT * FROM signing_sessions WHERE token = ${token}`;
    if (rows.length === 0) return null;
    const session = rowToSession(rows[0] as Record<string, unknown>);
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return null;
    }
    return session;
  }

  const tokens = await loadTokens();
  const session = tokens[token] ?? null;
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    return null;
  }
  return session;
}

export async function getSigningSessionIgnoreExpiry(
  token: string
): Promise<SigningSession | null> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`SELECT * FROM signing_sessions WHERE token = ${token}`;
    if (rows.length === 0) return null;
    return rowToSession(rows[0] as Record<string, unknown>);
  }

  const tokens = await loadTokens();
  return tokens[token] ?? null;
}

export async function getSessionsByDocumentId(
  documentId: string
): Promise<SigningSession[]> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM signing_sessions
      WHERE document_id = ${documentId}
      AND (expires_at IS NULL OR expires_at >= NOW())
    `;
    return rows.map((r) => rowToSession(r as Record<string, unknown>));
  }

  const tokens = await loadTokens();
  return Object.values(tokens).filter(
    (s) => s.documentId === documentId && (!s.expiresAt || new Date(s.expiresAt) >= new Date())
  );
}

export async function getAnySessionByDocumentId(
  documentId: string
): Promise<SigningSession | null> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM signing_sessions WHERE document_id = ${documentId} LIMIT 1
    `;
    if (rows.length === 0) return null;
    return rowToSession(rows[0] as Record<string, unknown>);
  }

  const tokens = await loadTokens();
  const session = Object.values(tokens).find((s) => s.documentId === documentId);
  return session ?? null;
}
