import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DOCUMENTS_FILE = path.join(DATA_DIR, "documents.json");

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

export async function createDocument(
  doc: Omit<StoredDocument, "id" | "createdAt" | "updatedAt">
): Promise<StoredDocument> {
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
  const store = await loadStore();
  return store.documents;
}

export async function getDocumentById(id: string): Promise<StoredDocument | null> {
  const store = await loadStore();
  return store.documents.find((d) => d.id === id) ?? null;
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
  const store = await loadStore();
  const filtered = store.documents.filter((d) => d.id !== id);
  if (filtered.length === store.documents.length) return false;
  await saveStore({ documents: filtered });
  return true;
}
