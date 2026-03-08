"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Send, Bell, CheckCircle, Trash2 } from "lucide-react";
import type { DocumentStatus } from "@/lib/documents-store-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StoredRecipient {
  name: string;
  email: string;
  role: string;
  signingOrder: number;
}

interface StoredDocument {
  id: string;
  name: string;
  recipients: string;
  recipientsDetail?: StoredRecipient[];
  status: DocumentStatus;
  reminderCount?: number;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt?: string;
}

function getRecipientNames(doc: StoredDocument): string {
  if (doc.recipientsDetail && doc.recipientsDetail.length > 0) {
    return doc.recipientsDetail.map((r) => r.name?.trim() || r.email || "—").join(", ");
  }
  if (doc.recipients) {
    return doc.recipients
      .split(",")
      .map((s) => s.split("<")[0]?.trim() || s.trim())
      .filter(Boolean)
      .join(", ") || doc.recipients;
  }
  return "—";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const variantMap: Record<DocumentStatus, "default" | "secondary" | "destructive" | "outline" | "success"> = {
    draft: "secondary",
    sent: "default",
    viewed: "default",
    signed: "secondary",
    completed: "success",
    declined: "destructive",
    expired: "outline",
  };
  return <Badge variant={variantMap[status] ?? "secondary"}>{status}</Badge>;
}

const PENDING_FOR_REMINDER: DocumentStatus[] = ["sent", "viewed", "signed"];
const AWAITING_MY_SIGNATURE: DocumentStatus[] = ["sent", "viewed"];
const WAITING_FOR_OTHERS: DocumentStatus[] = ["sent", "viewed", "signed"];

function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocs =
    filter === "awaiting"
      ? documents.filter((d) => AWAITING_MY_SIGNATURE.includes(d.status))
      : filter === "waiting"
        ? documents.filter((d) => WAITING_FOR_OTHERS.includes(d.status))
        : filter === "completed"
          ? documents.filter((d) => d.status === "completed")
          : documents;

  const handleStatusChange = async (id: string, status: DocumentStatus) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchDocuments();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) fetchDocuments();
    } catch {
      // ignore
    }
  };

  const handleSendReminder = async (id: string) => {
    setSendingReminderId(id);
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "POST" });
      if (res.ok) fetchDocuments();
    } catch {
      // ignore
    } finally {
      setSendingReminderId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-surface-border bg-surface-light/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-10">
        <h1 className="text-xl font-bold text-accent tracking-tight">
          Documents
        </h1>
        <Button asChild>
          <Link href="/documents/new" className="gap-2">
            <Plus className="h-4 w-4" />
            New document
          </Link>
        </Button>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-accent-muted">
              Loading…
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-accent-muted">
              <p>No documents yet.</p>
              <p className="mt-2 text-sm">
                Upload a PDF and click &quot;Save to dashboard&quot; to add
                documents here.
              </p>
              <Button asChild className="mt-4">
                <Link href="/documents/new">New document</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-surface-border rounded-xl overflow-hidden">
                <thead className="bg-surface-light">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-accent">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-accent">
                      Recipients
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-accent">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-accent">
                      Reminders
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-accent">
                      Created
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-accent">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="bg-surface-card hover:bg-surface-light/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/documents/${doc.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm text-accent group-hover:text-primary font-medium">
                          {doc.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-accent-muted max-w-xs truncate">
                        {getRecipientNames(doc)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-accent-muted">
                        {doc.reminderCount != null && doc.reminderCount > 0 ? (
                          <span
                            title={
                              doc.lastReminderAt
                                ? `Last: ${new Date(doc.lastReminderAt).toLocaleString()}`
                                : ""
                            }
                          >
                            {doc.reminderCount} sent
                          </span>
                        ) : (
                          <span className="text-accent-muted/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-accent-muted">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {doc.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                              onClick={() => handleStatusChange(doc.id, "sent")}
                              title="Mark sent"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {PENDING_FOR_REMINDER.includes(doc.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                              onClick={() => handleSendReminder(doc.id)}
                              disabled={sendingReminderId === doc.id}
                              title={sendingReminderId === doc.id ? "Sending…" : "Send reminder"}
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                          )}
                          {(doc.status === "sent" || doc.status === "viewed") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              onClick={() => handleStatusChange(doc.id, "signed")}
                              title="Mark signed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {doc.status === "signed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              onClick={() => handleStatusChange(doc.id, "completed")}
                              title="Mark completed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDelete(doc.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-full">
        <header className="border-b border-surface-border bg-surface-light/50 px-6 py-4">
          <div className="text-accent-muted">Loading…</div>
        </header>
      </div>
    }>
      <DocumentsContent />
    </Suspense>
  );
}
