"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  documentName: string;
  createdAt: string;
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

export default function TemplatesPage() {
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

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-surface-border bg-surface-light/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-10">
        <h1 className="text-xl font-bold text-accent tracking-tight">
          Templates
        </h1>
        <Link
          href="/documents/new"
          className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover active:bg-primary-active transition-colors"
        >
          New document
        </Link>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-accent-muted">
              Loading…
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center text-accent-muted">
              <p>No templates yet.</p>
              <p className="mt-2 text-sm">
                Create a document, add signature fields, and save it as a
                template from the New document page.
              </p>
              <Link
                href="/documents/new"
                className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover active:bg-primary-active transition-colors"
              >
                New document
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <Link
                  key={t.id}
                  href={`/documents/new?template=${t.id}`}
                  className="rounded-xl border border-surface-border bg-surface-card p-5 hover:bg-surface-light hover:border-primary/50 transition-colors block"
                >
                  <h3 className="font-medium text-accent">{t.name}</h3>
                  <p className="text-sm text-accent-muted mt-1 truncate">
                    {t.documentName}
                  </p>
                  <p className="text-xs text-accent-muted/80 mt-2">
                    {formatDate(t.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
