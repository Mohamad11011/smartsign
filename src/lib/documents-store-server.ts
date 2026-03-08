import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { isPostgresEnabled, getDb } from "./db";

export type DocumentStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "completed"
  | "declined"
  | "expired";

export interface StoredRecipient {
  name: string;
  email: string;
  role: string;
  signingOrder: number;
  signerId?: string;
}

export interface StoredDocument {
  id: string;
  name: string;
  recipients: string;
  recipientsDetail?: StoredRecipient[];
  status: DocumentStatus;
  signedBy?: string[];
  reminderCount?: number;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsStore {
  documents: StoredDocument[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DOCUMENTS_FILE = path.join(DATA_DIR, "documents.json");

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function loadStore(): Promise<DocumentsStore> {
  try {
    const raw = await readFile(DOCUMENTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return { documents: Array.isArray(parsed.documents) ? parsed.documents : [] };
  } catch {
    return { documents: [] };
  }
}

async function saveStore(store: DocumentsStore) {
  await ensureDir(DATA_DIR);
  await writeFile(DOCUMENTS_FILE, JSON.stringify(store, null, 2));
}

function rowToDocument(row: Record<string, unknown>): StoredDocument {
  return {
    id: row.id as string,
    name: row.name as string,
    recipients: row.recipients as string,
    recipientsDetail: (row.recipients_detail as StoredRecipient[]) ?? undefined,
    status: row.status as DocumentStatus,
    signedBy: (row.signed_by as string[]) ?? undefined,
    reminderCount: row.reminder_count as number | undefined,
    lastReminderAt: row.last_reminder_at ? new Date(row.last_reminder_at as string).toISOString() : undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export async function createDocument(
  doc: Omit<StoredDocument, "id" | "createdAt" | "updatedAt">
): Promise<StoredDocument> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();
    await sql`
      INSERT INTO documents (id, name, recipients, recipients_detail, status, signed_by, reminder_count, last_reminder_at, created_at, updated_at)
      VALUES (
        ${id},
        ${doc.name},
        ${doc.recipients},
        ${JSON.stringify(doc.recipientsDetail ?? [])},
        ${doc.status},
        ${doc.signedBy ?? []},
        ${doc.reminderCount ?? 0},
        ${doc.lastReminderAt ?? null},
        ${now},
        ${now}
      )
    `;
    return {
      ...doc,
      id,
      createdAt: now,
      updatedAt: now,
    };
  }

  const now = new Date().toISOString();
  const stored: StoredDocument = {
    ...doc,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const store = await loadStore();
  store.documents.unshift(stored);
  await saveStore(store);
  return stored;
}

export async function getDocuments(): Promise<StoredDocument[]> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM documents ORDER BY created_at DESC
    `;
    return rows.map((r) => rowToDocument(r as Record<string, unknown>));
  }

  const store = await loadStore();
  return store.documents;
}

export async function getDocumentById(id: string): Promise<StoredDocument | null> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`SELECT * FROM documents WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return rowToDocument(rows[0] as Record<string, unknown>);
  }

  const store = await loadStore();
  const found = store.documents.find((d) => d.id === id);
  return found ?? null;
}

export async function updateDocument(
  id: string,
  updates: Partial<
    Pick<
      StoredDocument,
      "recipients" | "recipientsDetail" | "status" | "reminderCount" | "lastReminderAt"
    >
  >
): Promise<StoredDocument | null> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    await sql`
      UPDATE documents SET
        status = COALESCE(${updates.status ?? null}, status),
        recipients = COALESCE(${updates.recipients ?? null}, recipients),
        recipients_detail = COALESCE(${updates.recipientsDetail ? JSON.stringify(updates.recipientsDetail) : null}, recipients_detail),
        reminder_count = COALESCE(${updates.reminderCount ?? null}, reminder_count),
        last_reminder_at = COALESCE(${updates.lastReminderAt ?? null}, last_reminder_at),
        updated_at = NOW()
      WHERE id = ${id}
    `;
    return getDocumentById(id);
  }

  const store = await loadStore();
  const idx = store.documents.findIndex((d) => d.id === id);
  if (idx < 0) return null;

  const doc = store.documents[idx];
  if (updates.status !== undefined) doc.status = updates.status;
  if (updates.recipients !== undefined) doc.recipients = updates.recipients;
  if (updates.recipientsDetail !== undefined)
    doc.recipientsDetail = updates.recipientsDetail;
  if (updates.reminderCount !== undefined) doc.reminderCount = updates.reminderCount;
  if (updates.lastReminderAt !== undefined)
    doc.lastReminderAt = updates.lastReminderAt;
  doc.updatedAt = new Date().toISOString();
  await saveStore(store);
  return doc;
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  metadata?: { signedBy?: string }
): Promise<StoredDocument | null> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const doc = await getDocumentById(id);
    if (!doc) return null;

    let signedBy = doc.signedBy ?? [];
    if (metadata?.signedBy) {
      signedBy = [...signedBy, metadata.signedBy];
    }

    await sql`
      UPDATE documents SET status = ${status}, signed_by = ${signedBy}, updated_at = NOW() WHERE id = ${id}
    `;
    return getDocumentById(id);
  }

  const store = await loadStore();
  const idx = store.documents.findIndex((d) => d.id === id);
  if (idx < 0) return null;

  const doc = store.documents[idx];
  doc.status = status;
  doc.updatedAt = new Date().toISOString();
  if (metadata?.signedBy) {
    doc.signedBy = [...(doc.signedBy ?? []), metadata.signedBy];
  }
  await saveStore(store);
  return doc;
}

export async function updateDocumentStatusByToken(
  token: string,
  status: DocumentStatus,
  metadata?: { signedBy?: string }
): Promise<StoredDocument | null> {
  const { getSigningSession } = await import("./signing-tokens");
  const session = await getSigningSession(token);
  if (!session?.documentId) return null;
  return updateDocumentStatus(session.documentId, status, metadata);
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (isPostgresEnabled()) {
    const existing = await getDocumentById(id);
    if (!existing) return false;
    const sql = getDb();
    await sql`DELETE FROM documents WHERE id = ${id}`;
    return true;
  }

  const store = await loadStore();
  const filtered = store.documents.filter((d) => d.id !== id);
  if (filtered.length === store.documents.length) return false;
  await saveStore({ documents: filtered });
  return true;
}
