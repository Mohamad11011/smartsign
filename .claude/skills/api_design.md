# API Design – SmartSign

Guidelines for designing and implementing API routes in SmartSign.

## Route Structure

- **Location**: `src/app/api/**/route.ts`
- **Handlers**: Export `GET`, `POST`, `PATCH`, `DELETE` as async functions
- **Request**: `NextRequest` from `next/server`
- **Response**: `NextResponse.json()` with status codes

## Endpoints in SmartSign

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/documents` | GET, POST | List documents, create document |
| `/api/documents/[id]` | GET, PATCH, DELETE | Get, update status, delete document |
| `/api/templates` | GET, POST | List templates, create template |
| `/api/templates/[id]` | GET | Get template by ID |
| `/api/send-signing-invite` | POST | Send signing link email |
| `/api/sign-pdf` | POST | Embed signature into PDF |
| `/api/contract-summary` | POST | AI contract summary (Groq) |
| `/api/chat-contract` | POST | AI chat with contract |
| `/api/detect-signature-fields` | POST | AI field detection |
| `/api/reminders/run` | POST | Run reminder batch |
| `/api/reminders/[documentId]` | POST | Send reminder for one document |
| `/api/assistant` | POST | Floating chatbot (Groq) |

## Conventions

### Validation

- Validate required fields before calling store
- Return `400` with `{ error: "Missing X" }` for bad input
- Return `404` when resource not found

### Error Handling

```typescript
try {
  const body = await request.json();
  if (!requiredField) {
    return NextResponse.json({ error: "Missing requiredField" }, { status: 400 });
  }
  const result = await storeMethod(...);
  return NextResponse.json(result);
} catch (err) {
  console.error("Route error:", err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Failed" },
    { status: 500 }
  );
}
```

### Dynamic Params

```typescript
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  // ...
}
```

### Store Layer

- Documents: `src/lib/documents-store-server.ts` – `createDocument`, `getDocuments`, `getDocumentById`, `updateDocumentStatus`, `deleteDocument`
- Templates: `src/lib/templates-store.ts` – `createTemplate`, `getTemplates`, `getTemplateById`
- Signing: `src/lib/signing-tokens.ts` – `createSigningSession`, `getSigningSession`
- Audit: `src/lib/audit-trail.ts`
- Reminders: `src/lib/reminders.ts`

## Status Codes

- `200` – Success
- `400` – Bad request (validation)
- `404` – Not found
- `500` – Server error
