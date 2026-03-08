# Frontend Development – SmartSign

Guidelines for building UI in SmartSign.

## Stack

- **Next.js 14** (App Router)
- **React 18** – Functional components, hooks
- **Tailwind CSS** – Utility-first
- **shadcn/ui** – Button, Card, Input, Badge, Tabs, etc.
- **Lucide React** – Icons

## Theme (Dark)

| Token | Value | Tailwind |
|-------|-------|----------|
| Surface | `#060714` | `bg-surface` |
| Surface light | `#0a0c1a` | `bg-surface-light` |
| Surface card | `#0d0f22` | `bg-surface-card` |
| Surface border | `#12152a` | `border-surface-border` |
| Primary | `#1a93c8` | `text-primary`, `bg-primary` |
| Accent | `#bddbed` | `text-accent` |
| Accent muted | `#8bb8d4` | `text-accent-muted` |

## Layout Structure

- **App layout**: Sidebar + Header + Main content
- **Sidebar**: `AppSidebar` – nav links, logo
- **Header**: `AppHeader` – logo, UserHeader
- **Pages**: Each page has its own header (e.g. "Dashboard", "Documents") and main content

## Key Components

| Component | Purpose |
|-----------|---------|
| `PdfViewerWithFields` | PDF display + signature field placement |
| `SignerManager` | Add/edit/remove recipients, signing order |
| `DocumentUploader` | PDF upload |
| `SaveAsTemplate` | Save document as template |
| `SendSigningInvite` | (Replaced by Send and Save in wizard) |
| `Stepper` | Wizard steps |
| `FloatingAssistant` | Corner chatbot |
| `StatusBadge` | Document status (draft, sent, completed, etc.) |

## Conventions

### Client Components

- Use `"use client"` for interactive components (state, events)
- Keep server components when possible (no `"use client"`)

### Styling

- Prefer Tailwind classes; use theme tokens
- Cards: `rounded-xl border border-surface-border bg-surface-card`
- Buttons: `Button` from shadcn with `variant="outline"` or default
- Icons: Lucide (`FileText`, `Send`, `Clock`, `CircleCheck`, etc.)

### Forms & State

- Controlled inputs with `useState`
- Callbacks like `onChange`, `onSave` for parent updates
- `useCallback` for handlers passed to children

### Links

- `Link` from `next/link` for navigation
- `href="/documents"`, `href="/dashboard"`, etc.

### Responsive

- `hidden sm:inline` for optional labels
- `max-w-6xl mx-auto` for content width
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for grids

## Page Patterns

- **Dashboard**: Cards grid, recent activity table
- **Documents**: Filter tabs, table with actions
- **New document**: Wizard (Upload → Place fields → Recipients → Review & Send)
- **Document detail**: PDF preview, status, actions (remind, mark completed, etc.)
