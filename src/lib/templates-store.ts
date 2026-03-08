import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { isPostgresEnabled, getDb } from "./db";

export interface TemplateSignerRole {
  role: string;
  signingOrder: number;
}

export interface TemplateField {
  id: string;
  page: number;
  x: number;
  y: number;
  signerId?: string;
  label?: string;
}

export interface Template {
  id: string;
  name: string;
  documentName: string;
  pdfBase64: string;
  fields: TemplateField[];
  signerRoles: TemplateSignerRole[];
  createdAt: string;
}

interface TemplatesStore {
  templates: Template[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const TEMPLATES_FILE = path.join(DATA_DIR, "templates.json");

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function loadStore(): Promise<TemplatesStore> {
  try {
    const raw = await readFile(TEMPLATES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return { templates: Array.isArray(parsed.templates) ? parsed.templates : [] };
  } catch {
    return { templates: [] };
  }
}

async function saveStore(store: TemplatesStore) {
  await ensureDir(DATA_DIR);
  await writeFile(TEMPLATES_FILE, JSON.stringify(store, null, 2));
}

function rowToTemplate(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    name: row.name as string,
    documentName: row.document_name as string,
    pdfBase64: row.pdf_base64 as string,
    fields: (row.fields as TemplateField[]) ?? [],
    signerRoles: (row.signer_roles as TemplateSignerRole[]) ?? [],
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function createTemplate(
  template: Omit<Template, "id" | "createdAt">
): Promise<Template> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();
    await sql`
      INSERT INTO templates (id, name, document_name, pdf_base64, fields, signer_roles, created_at)
      VALUES (
        ${id},
        ${template.name},
        ${template.documentName},
        ${template.pdfBase64},
        ${JSON.stringify(template.fields)},
        ${JSON.stringify(template.signerRoles)},
        ${now}
      )
    `;
    return {
      ...template,
      id,
      createdAt: now,
    };
  }

  const now = new Date().toISOString();
  const stored: Template = {
    ...template,
    id: randomUUID(),
    createdAt: now,
  };
  const store = await loadStore();
  store.templates.unshift(stored);
  await saveStore(store);
  return stored;
}

export async function getTemplates(): Promise<Template[]> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM templates ORDER BY created_at DESC
    `;
    return rows.map((r) => rowToTemplate(r as Record<string, unknown>));
  }

  const store = await loadStore();
  return store.templates;
}

export async function getTemplateById(id: string): Promise<Template | null> {
  if (isPostgresEnabled()) {
    const sql = getDb();
    const rows = await sql`SELECT * FROM templates WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return rowToTemplate(rows[0] as Record<string, unknown>);
  }

  const store = await loadStore();
  const found = store.templates.find((t) => t.id === id);
  return found ?? null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  if (isPostgresEnabled()) {
    const existing = await getTemplateById(id);
    if (!existing) return false;
    const sql = getDb();
    await sql`DELETE FROM templates WHERE id = ${id}`;
    return true;
  }

  const store = await loadStore();
  const filtered = store.templates.filter((t) => t.id !== id);
  if (filtered.length === store.templates.length) return false;
  await saveStore({ templates: filtered });
  return true;
}
