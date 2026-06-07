# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What lives here

This repo holds four unrelated apps in a single Next.js codebase:

1. **EliteBids marketplace** (`/`, `/listing`, `/sell`, `/watchlist`, `/account`, `/notifications`, `/seller`, `/api/*`) — auction marketplace. Requires Postgres (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) and NextAuth (`NEXTAUTH_SECRET`). See `README.md`.
2. **Emergency app** (`/emergency/*`) — installable PWA for emergencies. No backend, no auth — all data lives in `localStorage`. Works offline via service worker. Designed for mobile.
3. **FitSpot activities marketplace** (`/marketplace/*`, `/g/[slug]`, `/api/marketplace/*`) — gym / yoga / sports business directory. Owners pay ₹7,000 one-time via PayU, get a customisable public page at `/g/<slug>` with plans, FAQ, contact, custom chatbot, and a membership-application form. Uses the same Postgres + NextAuth as EliteBids.
4. **Studio** (`/studio`, `/api/studio/*`) — personal text-to-image / text-to-video / text-to-audio generator. No database, no auth — the gallery and API key live in `localStorage`. Images are free with no API key (Pollinations); video and audio need a Replicate token (paste it into the app via the "API key" button, or set `REPLICATE_API_TOKEN`). Standalone dark UI.

The four apps share the Next.js project, Tailwind theme, NextAuth user table, and `lib/utils.ts`. Emergency and Studio do not depend on Prisma/NextAuth; FitSpot and EliteBids both do.

## Studio app layout

```
src/app/studio/
  layout.tsx              # Standalone full-screen dark layout
  page.tsx                # Prompt box, image/video toggle, options, localStorage gallery

src/lib/studio/
  types.ts                # Modes, aspect ratios, image models, audio styles/durations, req/res types
  storage.ts              # localStorage gallery (Creation[]) + settings (Replicate token)

src/app/api/studio/generate/route.ts
  POST  # image -> Pollinations image URL; video/audio -> starts a Replicate prediction.
        # video with an `image` field (URL or data URI) -> image-to-video instead.
  GET   # ?id=<predictionId> -> polls a Replicate job (video or audio) to completion
```

Video mode supports both text-to-video and image-to-video: the UI lets you upload a
still (or hit "Animate" on a generated image) and describe how it should move.

The Replicate token is read from the `x-studio-key` request header (the token the user
pastes into the app, stored in `localStorage`) and falls back to the `REPLICATE_API_TOKEN`
env var. Env overrides (all optional — images work without any):
`STUDIO_VIDEO_MODEL` (text-to-video, default `wan-video/wan-2.1-1.3b`),
`STUDIO_I2V_MODEL` (image-to-video, default `minimax/video-01`) + `STUDIO_I2V_IMAGE_KEY`
(that model's image input field, default `first_frame_image`),
`STUDIO_AUDIO_MODEL` (default `meta/musicgen`).

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

## FitSpot app layout

```
src/app/marketplace/         # platform pages — browse, register, owner dashboard
  layout.tsx                 # FitSpot chrome (its own header/footer)
  page.tsx                   # public browse, hero, "how it works"
  register/page.tsx          # owner sign-up → creates Business in pending state
  dashboard/page.tsx         # owner's list of businesses
  dashboard/[id]/page.tsx    # editor (profile, plans, design+chatbot, leads)

src/app/g/[slug]/page.tsx    # public business page (no FitSpot chrome — looks like the business's own site)

src/app/api/marketplace/
  businesses/                # CRUD for owner's businesses
  businesses/[id]/confirm    # POST PayU txn ID → activates listing
  businesses/[id]/plans/     # plans CRUD
  businesses/[id]/faqs/      # FAQ CRUD (drives chatbot)
  businesses/[id]/applications/[appId]  # PATCH application status
  public/                    # public browse API
  public/[slug]/             # GET active business detail
  public/[slug]/apply        # POST membership application
  public/[slug]/chat         # POST chat message → custom chatbot reply
  slug-check                 # availability check during registration

src/lib/marketplace/
  payu-link.ts               # ₹7,000 PayU link + amount
  types.ts                   # categories, theme colours, slugify, parseJsonArray
  chatbot.ts                 # rule-based per-business assistant (FAQs + structured fields)

src/components/marketplace/  # marketplace-chrome, browse-filters, register-form,
                             # dashboard-editor (tabs), public-business-page (hero/plans/chat)
```

Site chrome routing: `src/components/site-chrome.tsx` skips the EliteBids header/footer for `/emergency/*`, `/marketplace/*`, `/g/*`, and `/studio*` so each app feels standalone.

PayU link: `NEXT_PUBLIC_MARKETPLACE_PAYU_LINK` (default `https://u.payu.in/QIflja9WMldm`). Activation flow is owner-submitted: they open PayU in a new tab, paste the Transaction ID back, and the listing flips to `active` immediately.

## Branch convention

Development for Claude Code sessions in this repo happens on the branch specified by the invoking task. Create it locally if it does not exist, commit there, and push to the same branch on `origin`. Do not push to `main` without explicit instruction.
