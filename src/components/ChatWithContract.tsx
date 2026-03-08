"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWithContractProps {
  onGetContractText: () => Promise<string>;
  disabled?: boolean;
  embedded?: boolean;
}

export function ChatWithContract({ onGetContractText, disabled, embedded }: ChatWithContractProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = input.trim();
      if (!q || loading || disabled) return;

      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: q }]);
      setLoading(true);
      setError(null);

      try {
        const text = await onGetContractText();
        if (!text.trim()) {
          setError("No text could be extracted from the PDF");
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        const res = await fetch("/api/chat-contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, question: q }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        const { answer } = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get answer");
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [input, loading, disabled, onGetContractText]
  );

  return (
    <div className={embedded ? "space-y-3" : "rounded-xl border border-surface-border bg-surface-card p-4 space-y-3"}>
      {!embedded && <h3 className="font-medium text-accent">Chat with contract</h3>}
      <p className="text-xs text-accent-muted">
        Ask questions about the uploaded contract (e.g. &quot;What happens if I cancel?&quot;)
      </p>
      <div className="max-h-48 overflow-y-auto space-y-2 mb-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg text-sm ${
              m.role === "user"
                ? "bg-primary/20 text-accent ml-4 border border-primary/30"
                : "bg-surface-light text-accent-muted mr-4 border border-surface-border"
            }`}
          >
            <span className="font-medium text-xs text-accent-muted">
              {m.role === "user" ? "You" : "AI"}
            </span>
            <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {loading && (
          <div className="p-3 rounded-lg text-sm bg-surface-light text-accent-muted">
            Thinking…
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the contract…"
          disabled={disabled || loading}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={disabled || loading || !input.trim()}
          size="sm"
        >
          Ask
        </Button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
