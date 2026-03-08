import { NextRequest, NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reminderHours = Number(body.reminderHours) || 24;
    const results = await runReminders(reminderHours);
    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("Run reminders error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to run reminders",
      },
      { status: 500 }
    );
  }
}
