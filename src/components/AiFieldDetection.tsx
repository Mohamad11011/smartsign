"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PageHint {
  page: number;
  reason: string;
}

interface AiFieldDetectionProps {
  onGetPages: () => Promise<Array<{ page: number; text: string }>>;
  disabled?: boolean;
  onPageHintClick?: (page: number) => void;
  embedded?: boolean;
}

export function AiFieldDetection({
  onGetPages,
  disabled,
  onPageHintClick,
  embedded,
}: AiFieldDetectionProps) {
  const [pageHints, setPageHints] = useState<PageHint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async () => {
    setLoading(true);
    setError(null);
    setPageHints(null);
    try {
      const pages = await onGetPages();
      if (pages.length === 0) {
        setError("No text could be extracted from the PDF");
        return;
      }

      const res = await fetch("/api/detect-signature-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const { pageHints: hints } = await res.json();
      setPageHints(hints ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to detect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? "space-y-3" : "rounded-xl border border-surface-border bg-surface-card p-4 space-y-3"}>
      {!embedded && <h3 className="font-medium text-accent">AI Field Detection</h3>}
      <p className="text-xs text-accent-muted">
        Scans for &quot;Signed by&quot;, &quot;Signature&quot;, &quot;Authorized representative&quot;, etc.
      </p>
      <Button
        type="button"
        onClick={handleDetect}
        disabled={disabled || loading}
        className="w-full"
      >
        {loading ? "Scanning…" : "Detect signature fields"}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {pageHints && pageHints.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-accent text-sm">Suggested pages</h4>
          <ul className="space-y-1">
            {pageHints.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onPageHintClick?.(h.page)}
                  className={`text-left text-sm w-full p-2 rounded-lg border transition-colors ${
                    onPageHintClick
                      ? "border-surface-border hover:bg-primary/20 hover:border-primary active:bg-primary/30 cursor-pointer"
                      : "border-surface-border"
                  }`}
                >
                  <span className="font-medium text-primary">Page {h.page}</span>
                  <span className="text-accent-muted"> — {h.reason}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pageHints && pageHints.length === 0 && (
        <p className="text-sm text-accent-muted">No signature positions detected.</p>
      )}
    </div>
  );
}
