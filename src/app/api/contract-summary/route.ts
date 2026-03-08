import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

interface ContractSummaryResponse {
  summary: string;
  keyClauses: string[];
  potentialRisks: string[];
}

const SYSTEM_PROMPT = `You are a contract analyst. Analyze the contract text and return a valid JSON object with exactly these keys (no markdown, no extra text):
- "summary": A 2-4 sentence plain-language summary of the contract
- "keyClauses": Array of 3-7 important clauses (e.g. payment terms, duration, termination)
- "potentialRisks": Array of 2-5 risks or concerns (e.g. auto-renewal, penalties, hidden clauses)

Return ONLY the JSON object, nothing else.`;

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

    if (!text) {
      return NextResponse.json(
        { error: "Missing 'text' in request body" },
        { status: 400 }
      );
    }

    const truncated = text.length > 12000 ? text.slice(0, 12000) + "..." : text;

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
          {
            role: "user",
            content: `Analyze this contract:\n\n${truncated}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
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
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    const parsed = parseJsonResponse<ContractSummaryResponse>(content);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      summary: parsed.summary ?? "",
      keyClauses: Array.isArray(parsed.keyClauses) ? parsed.keyClauses : [],
      potentialRisks: Array.isArray(parsed.potentialRisks) ? parsed.potentialRisks : [],
    });
  } catch (err) {
    console.error("Contract summary error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to analyze contract" },
      { status: 500 }
    );
  }
}

function parseJsonResponse<T>(content: string): T | null {
  const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
