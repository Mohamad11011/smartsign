import { NextRequest, NextResponse } from "next/server";
import { getTemplates, createTemplate } from "@/lib/templates-store";

export async function GET() {
  try {
    const templates = await getTemplates();
    return NextResponse.json(templates);
  } catch (err) {
    console.error("Get templates error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, documentName, pdfBase64, fields, signerRoles } = body;

    if (!name || !documentName || !pdfBase64) {
      return NextResponse.json(
        { error: "Missing name, documentName, or pdfBase64" },
        { status: 400 }
      );
    }

    const template = await createTemplate({
      name,
      documentName,
      pdfBase64,
      fields: Array.isArray(fields) ? fields : [],
      signerRoles: Array.isArray(signerRoles) ? signerRoles : [],
    });
    return NextResponse.json(template);
  } catch (err) {
    console.error("Create template error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create" },
      { status: 500 }
    );
  }
}
