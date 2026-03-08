import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { isPostgresEnabled, getDb } from "./db";

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

function rowToEvent(row: Record<string, unknown>): AuditEvent {
  return {
    id: row.id as string,
    token: row.token as string,
    documentName: row.document_name as string,
    eventType: row.event_type as AuditEventType,
    timestamp: new Date(row.timestamp as string).toISOString(),
    ipAddress: row.ip_address as string,
    signerEmail: row.signer_email as string,
    signerName: row.signer_name as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
  };
}

export async function recordEvent(
  event: Omit<AuditEvent, "id" | "timestamp">
): Promise<AuditEvent> {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const full: AuditEvent = {
    ...event,
    id,
    timestamp,
  };

  if (isPostgresEnabled()) {
    const sql = getDb();
    await sql`
      INSERT INTO audit_events (id, token, document_name, event_type, timestamp, ip_address, signer_email, signer_name, metadata)
      VALUES (
        ${id},
        ${event.token},
        ${event.documentName},
        ${event.eventType},
        ${timestamp},
        ${event.ipAddress},
        ${event.signerEmail},
        ${event.signerName ?? null},
        ${event.metadata ? JSON.stringify(event.metadata) : null}
      )
    `;
    return full;
  }

  const store = await loadStore();
  store.events.push(full);
  await saveStore(store);
  return full;
}

export async function getEventsByToken(token: string): Promise<AuditEvent[]> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM audit_events
      WHERE token = ${token}
      ORDER BY timestamp ASC
    `;
    return rows.map((r) => rowToEvent(r as Record<string, unknown>));
  }

  const store = await loadStore();
  return store.events
    .filter((e) => e.token === token)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
