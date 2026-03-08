"use client";

import { useState } from "react";
import type { Signer } from "@/types/document";
import type { SignatureFieldCoord } from "@/types/document";

interface SendSigningInviteProps {
  signers: Signer[];
  fields: SignatureFieldCoord[];
  onGetPdfBase64: () => Promise<string>;
  documentName: string;
  documentId?: string | null;
  onDocumentIdReceived?: (id: string) => void;
  disabled?: boolean;
}

export function SendSigningInvite({
  signers,
  fields,
  onGetPdfBase64,
  documentName,
  documentId,
  onDocumentIdReceived,
  disabled,
}: SendSigningInviteProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [localDocId, setLocalDocId] = useState<string | null>(documentId ?? null);

  const effectiveDocId = documentId ?? localDocId;

  const handleSend = async (signer: Signer) => {
    if (disabled || fields.length === 0) return;
    setSendingId(signer.id);
    setError(null);
    try {
      const pdfBase64 = await onGetPdfBase64();
      const res = await fetch("/api/send-signing-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          documentName,
          signerEmail: signer.email,
          signerName: signer.name,
          signerId: signer.id,
          documentId: effectiveDocId ?? undefined,
          recipientsDetail: signers.map((s) => ({
            name: s.name,
            email: s.email,
            role: s.role || "Signer",
            signingOrder: s.signingOrder,
            signerId: s.id,
          })),
          coordinates: fields.map((f) => ({ page: f.page, x: f.x, y: f.y })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.documentId && !effectiveDocId) {
        setLocalDocId(data.documentId);
        onDocumentIdReceived?.(data.documentId);
      }
      setSentIds((prev) =>
        prev.includes(signer.id) ? prev : [...prev, signer.id]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingId(null);
    }
  };

  if (signers.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-3">
      <h3 className="font-medium text-accent">Send signing link</h3>
      <p className="text-xs text-accent-muted">
        Email a unique signing link to each recipient.
      </p>
      <ul className="space-y-2">
        {signers.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-accent">
              #{s.signingOrder} {s.name} &lt;{s.email}&gt;
              {sentIds.includes(s.id) && (
                <span className="ml-2 text-green-400 text-xs">Sent ✓</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => handleSend(s)}
              disabled={disabled || fields.length === 0 || sendingId !== null || sentIds.includes(s.id)}
              className="shrink-0 px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingId === s.id ? "Sending…" : sentIds.includes(s.id) ? "Sent" : "Send"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
