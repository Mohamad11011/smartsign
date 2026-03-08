# SmartSign – Mini DocuSign with AI

<p align="center">
  <strong>Upload • Sign • Send</strong> — Document e-signing made simple
</p>

<p align="center">
  <img src="public/favi.svg" alt="SmartSign" width="64" height="64" />
</p>

SmartSign is a modern document signing application built with Next.js 14. Upload PDFs, place signature fields, add recipients, and send documents for e-signing—powered by AI to summarize contracts, answer questions, and detect signature positions.

---

## ✨ Features

### 📄 Document Management

| Feature | Description |
|--------|-------------|
| **PDF Upload & Viewer** | Drag-and-drop PDF upload with interactive viewer |
| **Signature Field Placement** | Click on the PDF to place signature fields with coordinates |
| **Signature Drawing** | Draw signatures with mouse, save as PNG, embed into PDF |
| **Templates** | Save document layouts and reuse for new agreements |
| **Document Status Engine** | Track status: draft → sent → viewed → signed → completed (or declined/expired) |

### 👥 Recipients & Workflow

| Feature | Description |
|--------|-------------|
| **Multiple Recipients** | Add signers with name, email, and role |
| **Signing Order** | Enforce sequential signing (Signer 2 waits for Signer 1) |
| **Email Invitations** | Send unique signing links via Resend API |
| **Reminder System** | Automated reminders for pending documents |

### 📊 Dashboard & Analytics

| Feature | Description |
|--------|-------------|
| **Dashboard** | Documents awaiting signature, in progress, completed |
| **Analytics Panel** | Completion rate, pending count, draft count |
| **Smart Insights** | AI-powered recommendations based on document activity |
| **Recent Activity** | Activity log with document status and dates |

### 📋 Audit & Compliance

| Feature | Description |
|--------|-------------|
| **Audit Trail** | Track document viewed, signature added, timestamp, IP, signer email |
| **Certificate of Completion** | Download certificate with full audit trail |

---

## 🤖 AI Integration

SmartSign uses **Groq** (Llama 3.1) for AI-powered features:

| AI Feature | Description |
|------------|-------------|
| **Contract Summary** | Extract text from PDF → AI returns summary, key clauses, potential risks |
| **Chat with Contract** | Ask questions about the document; AI answers using contract content |
| **AI Field Detection** | Scan contract text to suggest signature positions ("Signed by", "Signature", etc.) |
| **Smart Insights** | Contextual recommendations (e.g., "3 documents need your signature", "Send reminders") |
| **Floating Assistant** | Corner chatbot that guides users (upload, place fields, add recipients, send) |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **UI** | React 18, Tailwind CSS, shadcn/ui, Lucide icons |
| **Auth** | NextAuth (credentials) |
| **Storage** | JSON files (`data/`) |
| **Email** | Resend API |
| **AI** | Groq (Llama 3.1) |
| **PDF** | react-pdf, pdf-lib, react-signature-canvas |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd smartsign

# Install dependencies
npm install

# Configure environment (see .env or create .env.local)
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for AI features |
| `RESEND_API_KEY` | Resend API key for email |
| `NEXTAUTH_SECRET` | NextAuth secret |
| `NEXT_PUBLIC_APP_URL` | Base URL (e.g. `http://localhost:3000`) |

### Run

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Tests
npm test
```

### Default Login

SmartSign uses simple username/password authentication for **demo purposes only** (NextAuth credentials provider).

- **Username:** `admin`
- **Password:** `admin123`

---

## ☁️ Deploy to Vercel

### What You Need

1. **Environment variables** – Set in Vercel Project Settings → Environment Variables:
   - `GROQ_API_KEY`
   - `RESEND_API_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL` – Your Vercel URL (e.g. `https://smartsign.vercel.app`)

2. **Storage** – **Important:** SmartSign stores data in JSON files (`data/`). Vercel’s serverless functions use a **read-only filesystem**, so this storage will not persist in production. Documents, templates, and signing sessions will be lost on each deploy or cold start.

   For a production deployment, you need to replace file storage with a database, for example:
   - [Vercel Postgres](https://vercel.com/storage/postgres)
   - [Vercel KV](https://vercel.com/storage/kv)
   - [Supabase](https://supabase.com)
   - [PlanetScale](https://planetscale.com)

3. **Deploy** – Connect your repo to Vercel; the Next.js app will build and deploy automatically. For a demo or testing, you can deploy as-is, but data will not persist.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (app)/           # Dashboard, documents, templates
│   ├── api/             # API routes
│   ├── sign/[token]/    # Signing page
│   └── login/           # Login page
├── components/          # React components
├── lib/                 # Server-side stores & utilities
└── types/               # TypeScript types
```

---

## 📜 Build Flow & Prompts

This project was built following a structured prompt-driven flow. The full list of prompts, implementation notes, and status is documented in:

**[prompts.txt](./prompts.txt)**

It includes:

- 17 prompts: 1 Explore, 1 Plan, 15 Build (project creation, PDF handling, signatures, AI features, dashboard, recipients, email, audit trail, status engine, templates, reminders, certificate)
- Implementation references for each feature
- Summary table with completion status

---

## 📄 License

MIT
