# SmartSign – Project Context for Claude

## Project Overview

SmartSign is a mini DocuSign-style document signing app built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui. Users upload PDFs, place signature fields, add recipients, and send documents for e-signing. AI features (Groq) include contract summary, chat with contract, and field detection.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React, Tailwind CSS, shadcn/ui, Lucide icons
- **Auth**: NextAuth (credentials)
- **Storage**: JSON files in `data/` (documents, templates, signing tokens)
- **Email**: Resend API
- **AI**: Groq (Llama 3.1)

## Common Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run test     # Run Jest tests
npm run lint     # ESLint
```

## Architecture

- **`src/app/`** – App Router pages
  - `(app)/` – Dashboard, documents, templates, new document wizard
  - `sign/[token]/` – Signing page (public)
  - `api/` – API routes
- **`src/components/`** – Reusable components
- **`src/lib/`** – Server-side stores (documents, templates, signing tokens, audit trail)
- **`data/`** – JSON storage (gitignored in production)

## Conventions

- **DRY, SRP, SOLID, OOP, Design Patterns, TDD, DI**
- **Theme**: Dark (#060714 surface, #1a93c8 primary, #bddbed accent)
- **Auth**: Default credentials `admin` / `admin123` for dev
- **Status flow**: draft → sent → viewed → signed → completed (or declined/expired)

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/documents-store-server.ts` | Document CRUD, status |
| `src/lib/signing-tokens.ts` | Signing session tokens |
| `src/lib/templates-store.ts` | Template CRUD |
| `src/lib/audit-trail.ts` | Audit events |
| `src/components/PdfViewerWithFields.tsx` | PDF + signature field placement |
| `src/components/SignerManager.tsx` | Recipients with signing order |

## Environment

- `GROQ_API_KEY` – AI (contract summary, chat, field detection)
- `RESEND_API_KEY` – Email sending
- `NEXTAUTH_SECRET` – Auth
- `NEXT_PUBLIC_APP_URL` – Base URL
