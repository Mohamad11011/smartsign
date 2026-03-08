import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_FILE = path.join(DATA_DIR, "audit-trail.json");

export type AuditEventType =
  | "document_viewed"
  | "signature_added"
  | "document_declined";

export interface AuditEvent {
  id: string;
  token: string;
  documentName: string;
  eventType: AuditEventType;
  timestamp: string;
  ipAddress: string;
  signerEmail: string;
  signerName?: string;
  metadata?: Record<string, unknown>;
}

interface AuditStore {
  events: AuditEvent[];
}

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function loadStore(): Promise<AuditStore> {
  try {
    const raw = await readFile(AUDIT_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { events: [] };
  }
}

async function saveStore(store: AuditStore) {
  await ensureDir(DATA_DIR);
  await writeFile(AUDIT_FILE, JSON.stringify(store, null, 2));
}

export async function recordEvent(
  event: Omit<AuditEvent, "id" | "timestamp">
): Promise<AuditEvent> {
  const full: AuditEvent = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const store = await loadStore();
  store.events.push(full);
  await saveStore(store);
  return full;
}

export async function getEventsByToken(token: string): Promise<AuditEvent[]> {
  const store = await loadStore();
  return store.events
    .filter((e) => e.token === token)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
