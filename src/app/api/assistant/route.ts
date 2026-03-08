import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are the SmartSign assistant — a friendly guide for a document signing app (mini DocuSign). Help users with:

**Getting started**
- Upload: Go to New document → Upload a PDF or choose a template
- Place fields: Click on the PDF where signers should sign
- Add recipients: Enter name, email, and signing order for each signer
- Send: Review & Send → click "Send and Save" to save the document and email signing links to all recipients

**Key features**
- Dashboard: View documents awaiting your signature, in progress, and completed
- Documents: Filter by awaiting, waiting for others, or completed
- Templates: Save a document layout and reuse it for new agreements
- AI Assistant: On the "Place fields" step, use Summary, Chat, or Detect to analyze the contract

**Common questions**
- "How do I upload?" → New document → drag & drop or click to upload a PDF
- "Where do I sign?" → Documents awaiting your signature appear in Dashboard and Documents
- "How do I add signers?" → In the wizard, go to "Add recipients" step and add name, email, role
- "Can I save for later?" → Yes, use "Save as template" (optional) before sending

Be concise, friendly, and actionable. If the user asks something outside SmartSign, politely steer them back to document signing.`;

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
    const { message, history = [] } = body;

    const userMessage = typeof message === "string" ? message.trim() : "";
    if (!userMessage) {
      return NextResponse.json(
        { error: "Missing 'message' in request body" },
        { status: 400 }
      );
    }

    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role,
        content: h.content,
      })),
      { role: "user", content: userMessage },
    ];

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
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
    console.error("Assistant error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to answer" },
      { status: 500 }
    );
  }
}
