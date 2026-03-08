"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Bell,
  CheckCircle,
  Trash2,
  FileText,
  FileQuestion,
} from "lucide-react";
import type { DocumentStatus } from "@/lib/documents-store-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PdfPreview } from "@/components/PdfPreview";

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

const PENDING_FOR_REMINDER: DocumentStatus[] = ["sent", "viewed", "signed"];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

export default function DocumentPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [doc, setDoc] = useState<StoredDocument | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchDoc = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDoc(data);
      } else {
        setDoc(null);
      }
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  useEffect(() => {
    if (!id) return;
    setPdfError(null);
    setPdfBase64(null);
    fetch(`/api/documents/${id}/pdf`)
      .then((res) => {
        if (res.ok) return res.json();
        return res.json().then((d) => {
          throw new Error(d.error ?? "PDF not available");
        });
      })
      .then((data) => setPdfBase64(data.pdfBase64))
      .catch((err) => setPdfError(err instanceof Error ? err.message : "Failed to load PDF"));
  }, [id]);

  const handleStatusChange = async (status: DocumentStatus) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchDoc();
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this document?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/documents");
    } catch {
      // ignore
    }
  };

  const handleSendReminder = async () => {
    if (!id) return;
    setSendingReminder(true);
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "POST" });
      if (res.ok) fetchDoc();
    } catch {
      // ignore
    } finally {
      setSendingReminder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-full p-6">
        <div className="text-accent-muted">Loading…</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col min-h-full p-6">
        <p className="text-red-400 mb-4">Document not found</p>
        <Button asChild variant="outline">
          <Link href="/documents">Back to documents</Link>
        </Button>
      </div>
    );
  }

  const recipientNames = doc.recipientsDetail?.length
    ? doc.recipientsDetail.map((r) => r.name?.trim() || r.email || "—").join(", ")
    : doc.recipients;

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-surface-border bg-surface-light/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/documents" aria-label="Back to documents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-accent tracking-tight truncate max-w-md">
            {doc.name}
          </h1>
          <StatusBadge status={doc.status} />
        </div>
        <Button asChild>
          <Link href="/documents/new">New document</Link>
        </Button>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* PDF Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDF Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {pdfBase64 ? (
                <PdfPreview pdfBase64={pdfBase64} />
              ) : pdfError ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-surface-border bg-surface-light/30">
                  <FileQuestion className="h-12 w-12 text-accent-muted mb-4" />
                  <p className="text-sm text-accent-muted text-center max-w-md">
                    {pdfError}
                  </p>
                  <p className="text-xs text-accent-muted/80 mt-2 text-center">
                    PDFs are stored when you send signing links to recipients. Send the document from the new document wizard to enable preview.
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center text-accent-muted">Loading PDF…</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Document details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-accent-muted uppercase tracking-wider">Name</p>
                <p className="text-accent mt-1">{doc.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-accent-muted uppercase tracking-wider">Status</p>
                <p className="mt-1">
                  <StatusBadge status={doc.status} />
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-accent-muted uppercase tracking-wider">Recipients</p>
                <p className="text-accent mt-1">{recipientNames || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-accent-muted uppercase tracking-wider">Created</p>
                <p className="text-accent-muted mt-1">{formatDate(doc.createdAt)}</p>
              </div>
              {doc.updatedAt && (
                <div>
                  <p className="text-xs font-medium text-accent-muted uppercase tracking-wider">Last updated</p>
                  <p className="text-accent-muted mt-1">{formatDate(doc.updatedAt)}</p>
                </div>
              )}
              {doc.reminderCount != null && doc.reminderCount > 0 && (
                <div>
                  <p className="text-xs font-medium text-accent-muted uppercase tracking-wider">Reminders sent</p>
                  <p className="text-accent-muted mt-1">
                    {doc.reminderCount}
                    {doc.lastReminderAt && (
                      <span className="text-xs ml-2">
                        (last: {formatDate(doc.lastReminderAt)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {doc.status === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange("sent")}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Mark sent
                  </Button>
                )}
                {PENDING_FOR_REMINDER.includes(doc.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendReminder}
                    disabled={sendingReminder}
                    className="gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    {sendingReminder ? "Sending…" : "Send reminder"}
                  </Button>
                )}
                {(doc.status === "sent" || doc.status === "viewed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange("signed")}
                    className="gap-2 text-green-400 border-green-500/50 hover:bg-green-500/10"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark signed
                  </Button>
                )}
                {doc.status === "signed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange("completed")}
                    className="gap-2 text-green-400 border-green-500/50 hover:bg-green-500/10"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark completed
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="gap-2 text-red-400 border-red-500/50 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
