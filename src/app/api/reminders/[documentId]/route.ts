import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getDocumentById, updateDocument } from "@/lib/documents-store-server";
import { getSessionsByDocumentId } from "@/lib/signing-tokens";

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const emailFrom =
  process.env.EMAIL_FROM ?? "SmartSign <onboarding@resend.dev>";

const PENDING_STATUSES = ["sent", "viewed", "signed"];

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    );
  }

  const doc = await getDocumentById(documentId);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!PENDING_STATUSES.includes(doc.status)) {
    return NextResponse.json(
      { error: "Document is not pending signatures" },
      { status: 400 }
    );
  }

  const signedEmails = new Set(doc.signedBy ?? []);
  const sessions = await getSessionsByDocumentId(documentId);
  const pendingSessions = sessions.filter(
    (s) => !signedEmails.has(s.signerEmail)
  );

  const errors: string[] = [];
  let remindersSent = 0;

  for (const session of pendingSessions) {
    const signingUrl = `${baseUrl}/sign/${session.token}`;
    const { error } = await resend.emails.send({
      from: emailFrom,
      to: session.signerEmail,
      subject: `Reminder: Sign ${doc.name}`,
      html: `
        <p>This is a reminder that you have been asked to sign <strong>${doc.name}</strong>.</p>
        <p><a href="${signingUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">Open signing page</a></p>
        <p>Or copy this link: <a href="${signingUrl}">${signingUrl}</a></p>
      `,
    });
    if (error) {
      errors.push(`${session.signerEmail}: ${error.message}`);
    } else {
      remindersSent++;
    }
  }

  if (remindersSent > 0) {
    await updateDocument(documentId, {
      reminderCount: (doc.reminderCount ?? 0) + remindersSent,
      lastReminderAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    remindersSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
