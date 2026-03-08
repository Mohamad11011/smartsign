"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface ContractSummaryResult {
  summary: string;
  keyClauses: string[];
  potentialRisks: string[];
}

interface ContractSummaryProps {
  onAnalyze: () => Promise<string>;
  disabled?: boolean;
  embedded?: boolean;
}

export function ContractSummary({ onAnalyze, disabled, embedded }: ContractSummaryProps) {
  const [result, setResult] = useState<ContractSummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const text = await onAnalyze();
      if (!text.trim()) {
        setError("No text could be extracted from the PDF");
        return;
      }

      const res = await fetch("/api/contract-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? "space-y-3" : "rounded-xl border border-surface-border bg-surface-card p-4 space-y-3"}>
      {!embedded && <h3 className="font-medium text-accent">AI Contract Summary</h3>}
      <Button
        type="button"
        onClick={handleAnalyze}
        disabled={disabled || loading}
        className="w-full"
      >
        {loading ? "Analyzing…" : "Analyze contract"}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && (
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium text-accent mb-1">Summary</h4>
            <p className="text-accent-muted">{result.summary}</p>
          </div>
          {result.keyClauses.length > 0 && (
            <div>
              <h4 className="font-medium text-accent mb-1">Key clauses</h4>
              <ul className="list-disc list-inside text-accent-muted space-y-1">
                {result.keyClauses.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {result.potentialRisks.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-400 mb-1">Potential risks</h4>
              <ul className="list-disc list-inside text-accent-muted space-y-1">
                {result.potentialRisks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
