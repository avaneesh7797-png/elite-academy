# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What lives here

This repo holds two unrelated apps in a single Next.js codebase:

1. **EliteBids marketplace** (`/`, `/listing`, `/sell`, `/watchlist`, `/account`, `/notifications`, `/seller`, `/api/*`) — auction marketplace. Requires Postgres (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) and NextAuth (`NEXTAUTH_SECRET`). See `README.md`.
2. **Emergency app** (`/emergency/*`) — installable PWA for emergencies. No backend, no auth — all data lives in `localStorage`. Works offline via service worker. Designed for mobile.

The two apps share the Next.js project, Tailwind theme, and `lib/utils.ts`, but the Emergency app does not depend on Prisma / NextAuth / the marketplace.

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma + Postgres (marketplace only)
- NextAuth.js (marketplace only)
- Tailwind CSS + shadcn-style components in `src/components/ui`
- Zod for input validation (marketplace)

## Commands

```bash
npm install
npm run dev       # Next.js dev server on http://localhost:3000
npm run lint
npm run build     # Marketplace build requires Postgres + runs `prisma db push` + seed
```

Type-check without building: `npx tsc --noEmit`.

The Emergency app at `/emergency` runs fine without any database — Postgres is only needed for the marketplace pages and `next build` (which prerenders marketplace API routes).

## Emergency app layout

```
src/app/emergency/
  layout.tsx              # Full-screen dark mobile layout, registers SW, sets PWA metadata
  page.tsx                # Dashboard with cards
  sos/page.tsx            # Hold-to-activate SOS (Medical/Fire/Police)
  medical-id/page.tsx     # Editable medical profile (localStorage)
  contacts/page.tsx       # Trusted contacts CRUD + reorder
  first-aid/page.tsx      # Index of guides
  first-aid/[topic]/page.tsx  # Individual guide (static)
  settings/page.tsx       # Country preset + per-type emergency numbers

src/lib/emergency/
  storage.ts              # localStorage types + load/save helpers
  first-aid.ts            # Guide content (offline, static)

src/components/emergency/
  back-bar.tsx
  sos-hold-button.tsx     # 3-second hold-to-activate with progress ring
  sw-register.tsx         # Registers /emergency-sw.js

public/
  emergency-manifest.webmanifest  # PWA manifest, scope = /emergency/
  emergency-sw.js                 # Cache-first service worker for the app shell
  emergency-icon.svg              # App icon
```

## Branch convention

Development for Claude Code sessions in this repo happens on the branch specified by the invoking task. Create it locally if it does not exist, commit there, and push to the same branch on `origin`. Do not push to `main` without explicit instruction.
