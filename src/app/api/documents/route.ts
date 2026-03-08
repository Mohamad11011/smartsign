import { NextRequest, NextResponse } from "next/server";
import {
  getDocuments,
  createDocument,
} from "@/lib/documents-store-server";

export async function GET() {
  try {
    const documents = await getDocuments();
    return NextResponse.json(documents);
  } catch (err) {
    console.error("Get documents error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, recipients, recipientsDetail, status } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing name" },
        { status: 400 }
      );
    }

    const doc = await createDocument({
      name,
      recipients: recipients ?? "No recipients",
      recipientsDetail: Array.isArray(recipientsDetail) ? recipientsDetail : undefined,
      status: status ?? "draft",
    });
    return NextResponse.json(doc);
  } catch (err) {
    console.error("Create document error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create" },
      { status: 500 }
    );
  }
}
