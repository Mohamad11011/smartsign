import { NextRequest, NextResponse } from "next/server";
import {
  getSigningSession,
  getSigningSessionIgnoreExpiry,
} from "@/lib/signing-tokens";
import { updateDocumentStatus } from "@/lib/documents-store-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const session = await getSigningSession(token);
  if (!session) {
    const expiredSession = await getSigningSessionIgnoreExpiry(token);
    if (expiredSession?.documentId) {
      await updateDocumentStatus(expiredSession.documentId, "expired");
    }
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  return NextResponse.json({
    documentName: session.documentName,
    signerName: session.signerName,
    signerEmail: session.signerEmail,
    coordinates: session.coordinates,
    pdfBase64: session.pdfBase64,
  });
}
