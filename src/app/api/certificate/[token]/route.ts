import { NextRequest, NextResponse } from "next/server";
import { getEventsByToken } from "@/lib/audit-trail";
import { getSigningSession } from "@/lib/signing-tokens";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const [events, session] = await Promise.all([
    getEventsByToken(token),
    getSigningSession(token),
  ]);

  if (!session) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let currentPage = pdfDoc.addPage([595, 842]);
  let y = currentPage.getHeight() - 50;

  const drawText = (text: string, size: number, isBold = false) => {
    const f = isBold ? boldFont : font;
    currentPage.drawText(text, {
      x: 50,
      y,
      size,
      font: f,
      color: rgb(0, 0, 0),
    });
    y -= size + 4;
  };

  drawText("CERTIFICATE OF COMPLETION", 18, true);
  y -= 10;
  drawText(`Document: ${session.documentName}`, 12);
  drawText(`Signer: ${session.signerName} (${session.signerEmail})`, 12);
  drawText(`Generated: ${new Date().toISOString()}`, 10);
  y -= 20;

  drawText("AUDIT TRAIL", 14, true);
  y -= 8;

  for (const e of events) {
    const line = `${e.timestamp} | ${e.eventType} | ${e.signerEmail} | IP: ${e.ipAddress}`;
    if (y < 80) {
      currentPage = pdfDoc.addPage([595, 842]);
      y = currentPage.getHeight() - 50;
    }
    currentPage.drawText(line, {
      x: 50,
      y,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
  }

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${session.documentName.replace(/\.pdf$/i, "")}.pdf"`,
    },
  });
}
