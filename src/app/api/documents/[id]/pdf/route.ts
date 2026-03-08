import { NextRequest, NextResponse } from "next/server";
import { getDocumentById } from "@/lib/documents-store-server";
import { getAnySessionByDocumentId } from "@/lib/signing-tokens";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const doc = await getDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const session = await getAnySessionByDocumentId(id);
  if (!session?.pdfBase64) {
    return NextResponse.json(
      { error: "PDF not available. Send the document to recipients first to generate a preview." },
      { status: 404 }
    );
  }
  return NextResponse.json({ pdfBase64: session.pdfBase64 });
}
