"use client";

import { useCallback, useEffect, useState } from "react";
import type { SignatureFieldCoord, Signer } from "@/types/document";

interface Template {
  id: string;
  name: string;
  documentName: string;
  pdfBase64: string;
  fields: Array<{ id: string; page: number; x: number; y: number; label?: string }>;
  signerRoles: Array<{ role: string; signingOrder: number }>;
}

interface TemplateSelectorProps {
  onSelect: (data: {
    file: File;
    fields: SignatureFieldCoord[];
    signers: Signer[];
  }) => void;
}

function generateId() {
  return crypto.randomUUID();
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleUseTemplate = useCallback(
    async (template: Template) => {
      const bytes = Uint8Array.from(atob(template.pdfBase64), (c) =>
        c.charCodeAt(0)
      );
      const blob = new Blob([bytes], { type: "application/pdf" });
      const file = new File([blob], template.documentName, {
        type: "application/pdf",
      });

      const fields: SignatureFieldCoord[] = template.fields.map((f) => ({
        id: generateId(),
        page: f.page,
        x: f.x,
        y: f.y,
        label: f.label ?? "Sign here",
      }));

      const signers: Signer[] = template.signerRoles.map((sr) => ({
        id: generateId(),
        name: "",
        email: "",
        role: sr.role || "Signer",
        signingOrder: sr.signingOrder,
      }));

      onSelect({ file, fields, signers });
    },
    [onSelect]
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-6 text-center text-accent-muted">
        Loading templates…
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <h3 className="font-medium text-accent mb-2">Use template</h3>
      <p className="text-xs text-accent-muted mb-3">
        Start from a saved template with field placements and signer roles.
      </p>
      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-accent truncate">
              {t.name} ({t.fields.length} fields, {t.signerRoles.length} signers)
            </span>
            <button
              type="button"
              onClick={() => handleUseTemplate(t)}
              className="shrink-0 px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary-hover active:bg-primary-active transition-colors"
            >
              Use
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
