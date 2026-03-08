import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createSigningSession } from "@/lib/signing-tokens";
import {
  getDocumentById,
  createDocument,
  updateDocumentStatus,
  updateDocument,
} from "@/lib/documents-store-server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const emailFrom =
    process.env.EMAIL_FROM ?? "SmartSign <onboarding@resend.dev>";

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY not configured. Add it to .env.local. Get a free key at https://resend.com",
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      pdfBase64,
      documentName,
      signerEmail,
      signerName,
      signerId,
      coordinates,
      documentId,
      recipientsDetail,
    } = body;

    if (!pdfBase64 || !documentName || !signerEmail) {
      return NextResponse.json(
        { error: "Missing pdfBase64, documentName, or signerEmail" },
        { status: 400 }
      );
    }

    let docId = documentId;
    if (!docId) {
      const recipients = Array.isArray(recipientsDetail) && recipientsDetail.length > 0
        ? recipientsDetail
            .map(
              (r: { name?: string; email?: string }) =>
                `${r.name ?? ""} <${r.email ?? ""}>`
            )
            .join(", ")
        : `${signerName ?? signerEmail} <${signerEmail}>`;
      const doc = await createDocument({
        name: documentName,
        recipients,
        recipientsDetail: Array.isArray(recipientsDetail) ? recipientsDetail : undefined,
        status: "sent",
      });
      docId = doc.id;
    } else {
      const existing = await getDocumentById(docId);
      if (existing) {
        if (existing.status === "draft") {
          await updateDocumentStatus(docId, "sent");
        }
        if (
          Array.isArray(recipientsDetail) &&
          recipientsDetail.length > 0 &&
          (!existing.recipientsDetail || existing.recipientsDetail.length < recipientsDetail.length)
        ) {
          await updateDocument(docId, { recipientsDetail });
        }
      }
    }

    const token = await createSigningSession({
      documentId: docId,
      documentName,
      signerEmail,
      signerName: signerName ?? signerEmail,
      signerId: signerId ?? "",
      pdfBase64,
      coordinates: Array.isArray(coordinates) ? coordinates : [],
    });

    const signingUrl = `${baseUrl}/sign/${token}`;

    const { error } = await resend.emails.send({
      from: emailFrom,
      to: signerEmail,
      subject: `Sign: ${documentName}`,
      html: `
        <p>You have been asked to sign <strong>${documentName}</strong>.</p>
        <p><a href="${signingUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">Open signing page</a></p>
        <p>Or copy this link: <a href="${signingUrl}">${signingUrl}</a></p>
        <p><small>This link is unique to you.</small></p>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, token, signingUrl, documentId: docId });
  } catch (err) {
    console.error("Send signing invite error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to send invitation",
      },
      { status: 500 }
    );
  }
}
