"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SignatureDrawing } from "@/components/SignatureDrawing";
import Link from "next/link";

interface SessionData {
  documentName: string;
  signerName: string;
  signerEmail: string;
  coordinates: Array<{ page: number; x: number; y: number }>;
  pdfBase64: string;
}

export default function SignPage() {
  const params = useParams();
  const token = params.token as string;
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/signing-session/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid or expired link");
        return res.json();
      })
      .then((data: SessionData) => {
        setSession(data);
        // Audit: document viewed
        fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            documentName: data.documentName,
            eventType: "document_viewed",
            signerEmail: data.signerEmail,
            signerName: data.signerName,
          }),
        }).catch(() => {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = useCallback(async () => {
    if (!session || !signatureBase64 || session.coordinates.length === 0) return;
    setIsSigning(true);
    setError(null);
    try {
      const res = await fetch("/api/sign-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64: session.pdfBase64,
          signatureBase64,
          coordinates: session.coordinates,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to sign");
      }

      const { signedPdfBase64 } = await res.json();
      const blob = new Blob(
        [Uint8Array.from(atob(signedPdfBase64), (c) => c.charCodeAt(0))],
        { type: "application/pdf" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = session.documentName.replace(/\.pdf$/i, "-signed.pdf");
      a.click();
      URL.revokeObjectURL(url);

      // Audit: signature added
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          documentName: session.documentName,
          eventType: "signature_added",
          signerEmail: session.signerEmail,
          signerName: session.signerName,
        }),
      }).catch(() => {});

      setSigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign");
    } finally {
      setIsSigning(false);
    }
  }, [session, signatureBase64, token]);

  const handleDecline = useCallback(async () => {
    if (!session || !confirm("Decline to sign this document?")) return;
    try {
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          documentName: session.documentName,
          eventType: "document_declined",
          signerEmail: session.signerEmail,
          signerName: session.signerName,
        }),
      });
      setDeclined(true);
    } catch {
      setError("Failed to record decline");
    }
  }, [session, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-accent-muted">Loading…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface">
        <p className="text-red-400 mb-4">{error ?? "Session not found"}</p>
        <Link href="/" className="text-primary hover:text-primary-hover">
          Return home
        </Link>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface">
        <p className="text-amber-400 font-medium mb-2">Document declined</p>
        <p className="text-accent-muted text-sm mb-4">
          You have declined to sign this document.
        </p>
        <Link href="/" className="text-primary hover:text-primary-hover">
          Return home
        </Link>
      </div>
    );
  }

  if (signed) {
    const certUrl = `/api/certificate/${token}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface">
        <p className="text-green-400 font-medium mb-2">Document signed successfully!</p>
        <p className="text-accent-muted text-sm mb-4">
          Your signed PDF has been downloaded.
        </p>
        <a
          href={certUrl}
          download="certificate-of-completion.pdf"
          className="mb-4 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
        >
          Download certificate of completion
        </a>
        <Link href="/" className="text-primary hover:text-primary-hover">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="border-b border-surface-border bg-surface-light/80 backdrop-blur-sm px-4 py-4">
        <h1 className="text-xl font-bold text-accent">
          Sign: {session.documentName}
        </h1>
        <p className="text-sm text-accent-muted">
          Signing as {session.signerName} ({session.signerEmail})
        </p>
      </header>
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm text-accent-muted mb-4">
            Draw your signature below, then click Sign to complete.
          </p>
          <SignatureDrawing onSave={setSignatureBase64} />
        </div>
        {signatureBase64 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-surface-border bg-surface-card p-4">
              <h3 className="font-medium text-accent mb-2">Your signature</h3>
              <img
                src={signatureBase64}
                alt="Signature"
                className="max-h-24 border border-surface-border rounded-lg bg-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSign}
                disabled={isSigning}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-50"
              >
                {isSigning ? "Signing…" : "Sign and download"}
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={isSigning}
                className="px-4 py-3 border border-red-500/50 text-red-400 rounded-xl font-medium hover:bg-red-500/20 hover:border-red-500 active:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        )}
        {!signatureBase64 && (
          <button
            type="button"
            onClick={handleDecline}
            className="text-sm text-accent-muted hover:text-red-400"
          >
            Decline to sign
          </button>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </main>
    </div>
  );
}
