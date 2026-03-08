import { NextRequest, NextResponse } from "next/server";
import { getEventsByToken } from "@/lib/audit-trail";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const events = await getEventsByToken(token);
  return NextResponse.json({ events });
}
