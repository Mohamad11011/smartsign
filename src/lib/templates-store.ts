import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const TEMPLATES_FILE = path.join(DATA_DIR, "templates.json");

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

export async function createTemplate(
  template: Omit<Template, "id" | "createdAt">
): Promise<Template> {
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
  const store = await loadStore();
  return store.templates;
}

export async function getTemplateById(id: string): Promise<Template | null> {
  const store = await loadStore();
  return store.templates.find((t) => t.id === id) ?? null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const store = await loadStore();
  const filtered = store.templates.filter((t) => t.id !== id);
  if (filtered.length === store.templates.length) return false;
  await saveStore({ templates: filtered });
  return true;
}
