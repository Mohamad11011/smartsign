import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";
const MAX_CONTEXT_LENGTH = 10000;

const SYSTEM_PROMPT = `You are a contract assistant. Answer the user's question based ONLY on the contract text provided. Use retrieval-style answering: cite relevant parts of the contract when possible. If the contract does not contain the answer, say so clearly. Be concise and accurate.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const text = body.text?.trim();
    const question = body.question?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Missing 'text' (contract content) in request body" },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: "Missing 'question' in request body" },
        { status: 400 }
      );
    }

    const truncated =
      text.length > MAX_CONTEXT_LENGTH
        ? text.slice(0, MAX_CONTEXT_LENGTH) + "..."
        : text;

    const userContent = `Contract text:\n\n${truncated}\n\n---\n\nQuestion: ${question}`;

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Groq API error:", err);
      return NextResponse.json(
        { error: `Groq API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Chat contract error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to answer" },
      { status: 500 }
    );
  }
}
