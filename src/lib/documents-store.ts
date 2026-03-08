const STORAGE_KEY = "smartsign-documents";

export interface StoredRecipient {
  name: string;
  email: string;
  role: string;
  signingOrder: number;
}

export interface StoredDocument {
  id: string;
  name: string;
  recipients: string;
  recipientsDetail?: StoredRecipient[];
  status: "draft" | "pending" | "signed";
  createdAt: string;
}

export function getDocuments(): StoredDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDocument(
  doc: Omit<StoredDocument, "id" | "createdAt"> & { recipientsDetail?: StoredRecipient[] }
): StoredDocument {
  const stored: StoredDocument = {
    ...doc,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const docs = getDocuments();
  docs.unshift(stored);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  return stored;
}

export function updateDocumentStatus(id: string, status: StoredDocument["status"]): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx >= 0) {
    docs[idx].status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }
}

export function deleteDocument(id: string): void {
  const docs = getDocuments().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}
