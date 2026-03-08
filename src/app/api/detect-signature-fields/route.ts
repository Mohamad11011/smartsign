import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";
const MAX_PAGE_LENGTH = 2000;

interface PageInput {
  page: number;
  text: string;
}

interface PageHint {
  page: number;
  reason: string;
}

const SYSTEM_PROMPT = `You are a contract analyst. Scan the contract text page by page and identify where signature fields should appear.

Look for patterns like:
- "Signed by"
- "Signature"
- "Authorized representative"
- "Witness"
- "Date:"
- "By:"
- "Name:"
- Any line that typically precedes a signature block

Return a valid JSON object with exactly one key: "pageHints"
- "pageHints" must be an array of objects, each with: "page" (number) and "reason" (short string explaining why)
- Only include pages that have likely signature positions
- Return ONLY the JSON object, no markdown, no extra text`;

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
    const pages: PageInput[] = body.pages;

    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'pages' array (e.g. [{ page: 1, text: '...' }])" },
        { status: 400 }
      );
    }

    const formatted = pages
      .map((p) => `--- PAGE ${p.page} ---\n${(p.text || "").slice(0, MAX_PAGE_LENGTH)}`)
      .join("\n\n");

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
            content: `Identify signature field positions in this contract:\n\n${formatted}`,
          },
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
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    const parsed = parseJsonResponse<{ pageHints: PageHint[] }>(content);
    if (!parsed || !Array.isArray(parsed.pageHints)) {
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 502 }
      );
    }

    const pageHints = parsed.pageHints
      .filter((h) => typeof h.page === "number" && h.reason)
      .map((h) => ({ page: h.page, reason: String(h.reason).slice(0, 200) }));

    return NextResponse.json({ pageHints });
  } catch (err) {
    console.error("Detect signature fields error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to detect fields" },
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
