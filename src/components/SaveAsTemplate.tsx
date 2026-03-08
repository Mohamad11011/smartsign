"use client";

import { useState } from "react";
import type { SignatureFieldCoord, Signer } from "@/types/document";

interface SaveAsTemplateProps {
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSave: (name: string) => Promise<void>;
  disabled?: boolean;
  fields: SignatureFieldCoord[];
  signers: Signer[];
}

export function SaveAsTemplate({
  templateName,
  onTemplateNameChange,
  onSave,
  disabled,
  fields,
  signers,
}: SaveAsTemplateProps) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    const name = templateName.trim();
    if (!name) return;
    setSaving(true);
    setSuccess(false);
    try {
      await onSave(name);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (fields.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <h3 className="font-medium text-accent mb-2 flex items-center gap-2">
        Save as template
        <span className="rounded bg-surface-light px-1.5 py-0.5 text-[10px] font-normal text-accent-muted">optional</span>
      </h3>
      <p className="text-xs text-accent-muted mb-3">
        Reuse this document layout and signer roles for new agreements.
      </p>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Template name"
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          className="flex-1 border border-surface-border rounded-xl px-3 py-2 text-sm bg-surface-light text-accent placeholder:text-accent-muted/60 hover:border-primary/70 focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || saving || !templateName.trim()}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : success ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}
