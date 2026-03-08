import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/audit-trail";
import { updateDocumentStatusByToken } from "@/lib/documents-store-server";
import { getSigningSession } from "@/lib/signing-tokens";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, documentName, eventType, signerEmail, signerName, metadata } = body;

    if (!token || !documentName || !eventType || !signerEmail) {
      return NextResponse.json(
        { error: "Missing token, documentName, eventType, or signerEmail" },
        { status: 400 }
      );
    }

    if (!["document_viewed", "signature_added", "document_declined"].includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid eventType" },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);

    const event = await recordEvent({
      token,
      documentName,
      eventType,
      ipAddress: ip,
      signerEmail,
      signerName,
      metadata,
    });

    const session = await getSigningSession(token);
    if (session?.documentId) {
      if (eventType === "document_viewed") {
        await updateDocumentStatusByToken(token, "viewed");
      } else if (eventType === "signature_added") {
        const doc = await updateDocumentStatusByToken(token, "signed", {
          signedBy: signerEmail,
        });
        if (doc) {
          const totalSigners = doc.recipientsDetail?.length ?? 1;
          const signedCount = (doc.signedBy ?? []).length;
          if (signedCount >= totalSigners) {
            await updateDocumentStatusByToken(token, "completed");
          }
        }
      } else if (eventType === "document_declined") {
        await updateDocumentStatusByToken(token, "declined");
      }
    }

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("Audit record error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record" },
      { status: 500 }
    );
  }
}
