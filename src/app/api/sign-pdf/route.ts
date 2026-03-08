import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

const SIGNATURE_WIDTH = 120;
const SIGNATURE_HEIGHT = 50;

interface SignRequest {
  pdfBase64: string;
  signatureBase64: string;
  coordinates: Array<{ page: number; x: number; y: number }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignRequest = await request.json();
    const { pdfBase64, signatureBase64, coordinates } = body;

    if (!pdfBase64 || !signatureBase64 || !coordinates?.length) {
      return NextResponse.json(
        { error: "Missing pdfBase64, signatureBase64, or coordinates" },
        { status: 400 }
      );
    }

    const pdfBytes = Buffer.from(pdfBase64, "base64");
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    const pngBytes = Buffer.from(
      signatureBase64.replace(/^data:image\/png;base64,/, ""),
      "base64"
    );
    const signatureImage = await pdfDoc.embedPng(pngBytes);

    const scaleFactor = Math.min(
      SIGNATURE_WIDTH / signatureImage.width,
      SIGNATURE_HEIGHT / signatureImage.height
    );
    const { width: imgWidth, height: imgHeight } = signatureImage.scale(scaleFactor);

    for (const coord of coordinates) {
      const pageIndex = coord.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const pageHeight = page.getHeight();

      const x = coord.x;
      const y = pageHeight - coord.y - imgHeight;
      page.drawImage(signatureImage, {
        x,
        y,
        width: imgWidth,
        height: imgHeight,
      });
    }

    const signedPdfBytes = await pdfDoc.save();
    const signedBase64 = Buffer.from(signedPdfBytes).toString("base64");

    return NextResponse.json({ signedPdfBase64: signedBase64 });
  } catch (err) {
    console.error("Sign PDF error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sign PDF" },
      { status: 500 }
    );
  }
}
