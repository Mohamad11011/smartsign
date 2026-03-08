import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const TOKENS_FILE = path.join(DATA_DIR, "signing-tokens.json");
const PDFS_DIR = path.join(DATA_DIR, "signing-pdfs");

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
  const tokens = await loadTokens();
  tokens[token] = full;
  await saveTokens(tokens);
  return token;
}

export async function getSigningSession(token: string): Promise<SigningSession | null> {
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
  const tokens = await loadTokens();
  return tokens[token] ?? null;
}

export async function getSessionsByDocumentId(
  documentId: string
): Promise<SigningSession[]> {
  const tokens = await loadTokens();
  return Object.values(tokens).filter(
    (s) => s.documentId === documentId && (!s.expiresAt || new Date(s.expiresAt) >= new Date())
  );
}

/** Get any session for a document (for PDF preview, ignores expiry) */
export async function getAnySessionByDocumentId(
  documentId: string
): Promise<SigningSession | null> {
  const tokens = await loadTokens();
  const session = Object.values(tokens).find((s) => s.documentId === documentId);
  return session ?? null;
}
