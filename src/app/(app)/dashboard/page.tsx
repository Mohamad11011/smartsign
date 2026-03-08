"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BarChart3, FileCheck, FileClock, FilePlus, FileSignature, Clock, CircleCheck, FileText, Sparkles, ArrowRight, Zap } from "lucide-react";
import type { DocumentStatus } from "@/lib/documents-store-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StoredDocument {
  id: string;
  name: string;
  recipients: string;
  status: DocumentStatus;
  reminderCount?: number;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt?: string;
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

const AWAITING_MY_SIGNATURE: DocumentStatus[] = ["sent", "viewed"];
const WAITING_FOR_OTHERS: DocumentStatus[] = ["sent", "viewed", "signed"];

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

export default function DashboardPage() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAllReminders, setRunningAllReminders] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleRunAllReminders = async () => {
    setRunningAllReminders(true);
    try {
      const res = await fetch("/api/reminders/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderHours: 24 }),
      });
      if (res.ok) fetchDocuments();
    } catch {
      // ignore
    } finally {
      setRunningAllReminders(false);
    }
  };

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const awaitingCount = documents.filter((d) =>
    AWAITING_MY_SIGNATURE.includes(d.status)
  ).length;
  const waitingCount = documents.filter((d) =>
    WAITING_FOR_OTHERS.includes(d.status)
  ).length;
  const completedCount = documents.filter((d) => d.status === "completed").length;
  const draftCount = documents.filter((d) => d.status === "draft").length;
  const sentThisMonth = documents.filter((d) => {
    const created = new Date(d.createdAt);
    return (
      created.getMonth() === thisMonth &&
      created.getFullYear() === thisYear &&
      d.status === "completed"
    );
  }).length;
  const totalSentThisMonth = documents.filter((d) => {
    const created = new Date(d.createdAt);
    return created.getMonth() === thisMonth && created.getFullYear() === thisYear;
  }).length;
  const completionRate =
    totalSentThisMonth > 0
      ? Math.round((sentThisMonth / totalSentThisMonth) * 100)
      : 0;
  const pendingThisMonth = totalSentThisMonth - sentThisMonth;

  // Smart insights derived from document data
  const insights: { text: string; priority: "high" | "medium" | "low"; action?: string; href?: string; onAction?: () => void }[] = [];
  if (awaitingCount > 0) {
    insights.push({
      text: `${awaitingCount} document${awaitingCount > 1 ? "s" : ""} need your signature. Sign now to avoid delays.`,
      priority: "high",
      action: "Review",
      href: "/documents?filter=awaiting",
    });
  }
  if (pendingThisMonth > 0 && totalSentThisMonth > 0) {
    insights.push({
      text: `${pendingThisMonth} of ${totalSentThisMonth} sent this month are pending. Send reminders to speed up completion.`,
      priority: awaitingCount > 0 ? "medium" : "high",
      action: "Run reminders",
      onAction: handleRunAllReminders,
    });
  }
  if (draftCount > 0) {
    insights.push({
      text: `You have ${draftCount} draft${draftCount > 1 ? "s" : ""} ready to send. Complete and send to increase throughput.`,
      priority: "medium",
      action: "View drafts",
      href: "/documents?filter=draft",
    });
  }
  if (completionRate >= 80 && totalSentThisMonth >= 2) {
    insights.push({
      text: `Strong performance — ${completionRate}% completion rate this month. Keep up the momentum.`,
      priority: "low",
    });
  } else if (completionRate < 50 && totalSentThisMonth > 0) {
    insights.push({
      text: `Completion rate at ${completionRate}%. Follow up on pending documents to improve.`,
      priority: "medium",
    });
  }
  if (insights.length === 0 && documents.length === 0) {
    insights.push({
      text: "Create your first document to get started. SmartSign will help you track and complete it.",
      priority: "high",
      action: "New document",
      href: "/documents/new",
    });
  }
  if (insights.length === 0) {
    insights.push({
      text: "All caught up. You're on track with no pending actions.",
      priority: "low",
    });
  }

  const recentActivity = documents
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      date: d.updatedAt ?? d.createdAt,
    }))
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-surface-border bg-surface-light/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-10">
        <h1 className="text-xl font-bold text-accent tracking-tight">
          Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRunAllReminders}
            disabled={runningAllReminders}
          >
            {runningAllReminders ? "Running…" : "Run reminders (24h)"}
          </Button>
          <div className="relative group">
            <Button variant="secondary" size="sm" className="gap-2">
              Quick Actions
              <span className="text-xs">▼</span>
            </Button>
            <div className="absolute right-0 mt-1 py-1 w-48 bg-surface-card border border-surface-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <Link
                href="/documents/new"
                className="block px-4 py-2 text-sm text-accent hover:bg-surface-light hover:text-primary transition-colors"
              >
                New document
              </Link>
              <Link
                href="/documents"
                className="block px-4 py-2 text-sm text-accent hover:bg-surface-light hover:text-primary transition-colors"
              >
                View all documents
              </Link>
            </div>
          </div>
          <Button variant="outline" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Documents card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  href="/documents?filter=awaiting"
                  className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-light/20 p-3 transition-all hover:border-primary/40 hover:bg-primary/5 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                      <FileSignature className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-accent group-hover:text-primary transition-colors">
                        Awaiting my signature
                      </p>
                      <p className="text-xs text-accent-muted">Needs your action</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-amber-400 tabular-nums">
                    {awaitingCount}
                  </span>
                </Link>
                <Link
                  href="/documents?filter=waiting"
                  className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-light/20 p-3 transition-all hover:border-primary/40 hover:bg-primary/5 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-accent group-hover:text-primary transition-colors">
                        Waiting for others
                      </p>
                      <p className="text-xs text-accent-muted">Pending signatures</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {waitingCount}
                  </span>
                </Link>
                <Link
                  href="/documents?filter=completed"
                  className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-light/20 p-3 transition-all hover:border-primary/40 hover:bg-primary/5 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/15 text-green-400">
                      <CircleCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-accent group-hover:text-primary transition-colors">
                        Completed
                      </p>
                      <p className="text-xs text-accent-muted">All signed</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-400 tabular-nums">
                    {completedCount}
                  </span>
                </Link>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-surface-border bg-surface-light/30 p-3">
                    <div className="flex items-center gap-2 text-accent-muted mb-1">
                      <FileCheck className="h-4 w-4" />
                      <span className="text-xs font-medium">Completed</span>
                    </div>
                    <p className="text-xl font-bold text-green-400">{completedCount}</p>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-surface-light/30 p-3">
                    <div className="flex items-center gap-2 text-accent-muted mb-1">
                      <FileClock className="h-4 w-4" />
                      <span className="text-xs font-medium">In progress</span>
                    </div>
                    <p className="text-xl font-bold text-primary">{waitingCount}</p>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-surface-light/30 p-3">
                    <div className="flex items-center gap-2 text-accent-muted mb-1">
                      <FilePlus className="h-4 w-4" />
                      <span className="text-xs font-medium">Draft</span>
                    </div>
                    <p className="text-xl font-bold text-amber-400">{draftCount}</p>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-surface-light/30 p-3">
                    <div className="flex items-center gap-2 text-accent-muted mb-1">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-xs font-medium">Completion rate</span>
                    </div>
                    <p className="text-xl font-bold text-accent">{completionRate}%</p>
                    <p className="text-xs text-accent-muted mt-0.5">this month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smart Insights / AI Recommendations */}
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-surface-card via-surface-card to-primary/5">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span>Smart Insights</span>
                  <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                    AI
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.slice(0, 2).map((insight, i) => (
                  <div
                    key={i}
                    className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      insight.priority === "high"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : insight.priority === "medium"
                          ? "border-primary/20 bg-primary/5"
                          : "border-surface-border bg-surface-light/20"
                    }`}
                  >
                    <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-accent leading-snug">{insight.text}</p>
                      {(insight.action && (insight.href || insight.onAction)) && (
                        <div className="mt-2">
                          {insight.href ? (
                            <Link
                              href={insight.href}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
                            >
                              {insight.action}
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={insight.onAction}
                              disabled={runningAllReminders}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover disabled:opacity-50"
                            >
                              {runningAllReminders ? "Running…" : insight.action}
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent activity – full width row */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent activity</CardTitle>
              <Link
                href="/documents"
                className="text-sm text-primary hover:text-primary-hover transition-colors"
              >
                View Activity Log
              </Link>
            </CardHeader>
            <CardContent>
            {loading ? (
              <p className="text-sm text-accent-muted">Loading…</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-accent-muted">
                Nothing to display here –{" "}
                <Link
                  href="/documents/new"
                  className="text-primary hover:text-primary-hover"
                >
                  send your first document
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-surface-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-light/80">
                      <th className="text-left px-4 py-3 font-medium text-accent">
                        Document
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-accent">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-accent">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {recentActivity.map((a) => (
                      <tr
                        key={a.id}
                        className="bg-surface-card hover:bg-surface-light/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href="/documents"
                            className="text-accent hover:text-primary hover:underline truncate block max-w-md"
                          >
                            {a.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="px-4 py-3 text-accent-muted">
                          {formatDate(a.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
