import { Resend } from "resend";
import { getDocuments } from "./documents-store-server";
import { getSessionsByDocumentId } from "./signing-tokens";
import { updateDocument } from "./documents-store-server";

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const emailFrom =
  process.env.EMAIL_FROM ?? "SmartSign <onboarding@resend.dev>";

const PENDING_STATUSES = ["sent", "viewed", "signed"] as const;

export interface ReminderResult {
  documentId: string;
  documentName: string;
  remindersSent: number;
  errors: string[];
}

export async function runReminders(
  reminderHours = 24
): Promise<ReminderResult[]> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const results: ReminderResult[] = [];
  const docs = await getDocuments();
  const minIntervalMs = reminderHours * 60 * 60 * 1000;

  for (const doc of docs) {
    if (!PENDING_STATUSES.includes(doc.status as (typeof PENDING_STATUSES)[number])) {
      continue;
    }

    const lastReminderOrSent = doc.lastReminderAt ?? doc.updatedAt;
    const elapsed = Date.now() - new Date(lastReminderOrSent).getTime();
    if (elapsed < minIntervalMs) {
      continue;
    }

    const signedEmails = new Set(doc.signedBy ?? []);
    const sessions = await getSessionsByDocumentId(doc.id);
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
      await updateDocument(doc.id, {
        reminderCount: (doc.reminderCount ?? 0) + remindersSent,
        lastReminderAt: new Date().toISOString(),
      });
    }

    results.push({
      documentId: doc.id,
      documentName: doc.name,
      remindersSent,
      errors,
    });
  }

  return results;
}
