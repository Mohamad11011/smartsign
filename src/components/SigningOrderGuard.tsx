"use client";

import type { Signer } from "@/types/document";

interface SigningOrderGuardProps {
  signers: Signer[];
  completedSignerIds: string[];
  currentSignerId: string | null;
  onCurrentSignerChange: (id: string | null) => void;
  canSign: boolean;
  children: React.ReactNode;
}

export function SigningOrderGuard({
  signers,
  completedSignerIds,
  currentSignerId,
  onCurrentSignerChange,
  canSign,
  children,
}: SigningOrderGuardProps) {
  const nextSigner = signers.find(
    (s) => !completedSignerIds.includes(s.id)
  );
  const isNextSigner = (id: string) => nextSigner?.id === id;
  const canSignAs = (id: string) => {
    const signer = signers.find((s) => s.id === id);
    if (!signer) return false;
    const prevSigners = signers
      .filter((s) => s.signingOrder < signer.signingOrder)
      .map((s) => s.id);
    return prevSigners.every((pid) => completedSignerIds.includes(pid));
  };

  if (signers.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
        <h4 className="font-medium text-amber-400 text-sm mb-2">Sign as (order enforced)</h4>
        <select
          value={currentSignerId ?? ""}
          onChange={(e) => onCurrentSignerChange(e.target.value || null)}
          className="w-full border border-surface-border rounded-xl px-3 py-2 text-sm bg-surface-light text-accent hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
        >
          <option value="">Select signer…</option>
          {signers.map((s) => (
            <option
              key={s.id}
              value={s.id}
              disabled={!canSignAs(s.id)}
            >
              #{s.signingOrder} {s.name} {s.role && `(${s.role})`}
              {completedSignerIds.includes(s.id) ? " ✓" : ""}
              {!canSignAs(s.id) && !completedSignerIds.includes(s.id)
                ? " — waiting for previous signers"
                : ""}
            </option>
          ))}
        </select>
        {nextSigner && !completedSignerIds.includes(nextSigner.id) && (
          <p className="mt-2 text-xs text-amber-400">
            Next to sign: {nextSigner.name}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
