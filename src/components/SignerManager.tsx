"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Pencil, Trash2, UserPlus } from "lucide-react";
import type { Signer } from "@/types/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SignerManagerProps {
  signers: Signer[];
  onChange: (signers: Signer[]) => void;
  disabled?: boolean;
  embedded?: boolean;
}

export function SignerManager({ signers, onChange, disabled, embedded }: SignerManagerProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const startEdit = (s: Signer) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditEmail(s.email);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const next = signers.map((s) =>
      s.id === editingId
        ? { ...s, name: editName.trim(), email: editEmail.trim() }
        : s
    );
    onChange(next);
    setEditingId(null);
    setEditName("");
    setEditEmail("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
  };

  const addSigner = () => {
    if (!name.trim() || !email.trim()) return;
    const newSigner: Signer = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      role: role.trim() || "Signer",
      signingOrder: signers.length + 1,
    };
    onChange([...signers, newSigner]);
    setName("");
    setEmail("");
    setRole("");
  };

  const removeSigner = (id: string) => {
    const next = signers.filter((s) => s.id !== id);
    onChange(
      next.map((s, i) => ({ ...s, signingOrder: i + 1 }))
    );
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...signers];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next.map((s, i) => ({ ...s, signingOrder: i + 1 })));
  };

  const moveDown = (index: number) => {
    if (index >= signers.length - 1) return;
    const next = [...signers];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next.map((s, i) => ({ ...s, signingOrder: i + 1 })));
  };

  const wrapperClass = embedded
    ? "space-y-4"
    : "rounded-xl border border-surface-border bg-surface-card p-4 space-y-4";

  return (
    <div className={wrapperClass}>
      {!embedded && (
        <>
          <h3 className="font-medium text-accent">Recipients (signing order)</h3>
          <p className="text-xs text-accent-muted">
            Signer 1 must complete before Signer 2 can sign.
          </p>
        </>
      )}
      <ul className="space-y-2">
        {signers.map((s, i) => (
          <li key={s.id}>
            {editingId === s.id ? (
              <div className="space-y-2 p-3 rounded-lg border border-primary/50 bg-surface-light/50">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="col-span-2 sm:col-span-1"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="col-span-2 sm:col-span-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-surface-border bg-surface-light/30 hover:border-surface-border/80 transition-colors">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/20 text-xs font-semibold text-primary">
                  {s.signingOrder}
                </span>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-accent truncate">
                    {s.name || "No name"}
                  </p>
                  <p className="text-xs text-accent-muted truncate">
                    {s.email || "No email"}
                    {s.role && s.role !== "Signer" && ` · ${s.role}`}
                  </p>
                </div>
                {!disabled && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(s)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveDown(i)}
                      disabled={i === signers.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => removeSigner(s.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!disabled && (
        <div className="space-y-2 pt-2 border-t border-surface-border">
          <p className="text-xs font-medium text-accent-muted">Add recipient</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Role (e.g. Client)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addSigner} disabled={!name.trim() || !email.trim()} className="shrink-0">
              <UserPlus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
