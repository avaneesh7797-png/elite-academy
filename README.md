# EliteBids — Marketplace with live bidding

A full-stack eBay-style marketplace where users can list items for sale, run timed auctions, place bids, watch listings, and buy items outright.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** + **Postgres** (Vercel Postgres / Neon / Supabase / any Postgres)
- **NextAuth.js** (email + password credentials, bcrypt)
- **Tailwind CSS** + shadcn/ui-style components
- **Zod** for input validation
- **Lucide** icons

## Features

- Email/password signup & login with hashed passwords
- Create listings with image URL, category, condition, starting price, optional buy-it-now, configurable duration (1h–10d)
- Auction detail page with **live bid polling (every 4s)**, countdown timer, bid history
- Server-side bid validation: minimum-increment rule, no self-bids, no bids after expiry, atomic transaction
- **Buy-it-now** instant purchase
- **Watchlist** (save listings)
- **Notifications**: outbid, watched-listing-bid, won, sold, expired
- Search, category filter, price range filter, condition filter, four sort orders
- Account dashboard: active listings, things you're bidding on, items won, sold history
- Seller profiles
- Auction expiry: every read-path that surfaces listings calls `settleExpiredAuctions()` which closes ended listings, picks the winner, and creates win/sold/expired notifications

## Run on GitHub Codespaces (zero local setup, mobile-friendly)

Best for trying the app without installing anything.

1. Open the repo on GitHub.
2. Tap **Code → Codespaces tab → Create codespace on `claude/marketplace-bidding-app-lNzTt`**.
3. Wait ~3 minutes while the container builds, installs Postgres, seeds demo
   data, and starts the dev server.
4. When the port-forward toast appears (port 3000), tap **Open in Browser**.

The codespace runs everything in your browser — works on a phone.

## Deploy to Vercel (one-click)

This repo is preconfigured for Vercel + Vercel Postgres. From your phone or laptop:

1. Open **https://vercel.com/new** and sign in with GitHub.
2. Click **Import** on the `elite-academy` repo and pick the branch
   `claude/marketplace-bidding-app-lNzTt`.
3. On the project setup screen, click **Storage → Create → Postgres**. Vercel
   will create a database and auto-inject `POSTGRES_PRISMA_URL` and
   `POSTGRES_URL_NON_POOLING` env vars.
4. Add two more env vars:
   - `NEXTAUTH_SECRET` — any long random string (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — leave blank for the first deploy, then set it to the
     production URL Vercel gives you and redeploy
5. Click **Deploy**. The build runs `prisma db push` (creates the schema) and
   `prisma/seed.ts` (creates categories, demo users, and 8 sample listings).

Once it's live you'll get a URL like `https://elite-academy.vercel.app`.

### Demo accounts (seeded on first deploy)

| Email | Password |
|---|---|
| `demo@elitebids.test` | `password123` |
| `buyer@elitebids.test` | `password123` |

## Local development

```bash
npm install
# Set POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING in .env (see .env.example).
# Easiest local Postgres: https://neon.tech (free tier).
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000.

### Demo accounts

| Email | Password | Role |
|---|---|---|
| `demo@elitebids.test` | `password123` | seller (owns the seeded listings) |
| `buyer@elitebids.test` | `password123` | buyer |

Or sign up a fresh account at `/signup`.

## Project layout

```
prisma/
  schema.prisma      # User, Category, Listing, Bid, Watch, Notification
  seed.ts            # categories + 8 sample listings
src/
  app/
    api/             # /signup, /upload, /listings, /listings/[id]/{bid,buy,watch}, /watchlist, /notifications, /account
    login, signup    # auth pages
    sell             # create-listing form
    listing/[id]     # auction detail with polling + bid + buy-now
    watchlist, notifications, account, seller/[id]
  components/
    header.tsx       # nav with unread-notification badge
    browse.tsx       # filterable grid
    listing-card.tsx # card with live countdown
    ui/              # button, input, label, textarea, card, badge
  lib/
    prisma.ts        # singleton client
    auth.ts          # NextAuth options
    expiry.ts        # settleExpiredAuctions()
    utils.ts         # cn, formatCurrency, timeRemaining, minNextBid
```

## How bidding works

`POST /api/listings/:id/bid` runs inside a Prisma transaction:

1. Re-fetches the listing and its current top bid.
2. Rejects if the auction is closed, expired, or owned by the bidder.
3. Computes the minimum increment based on the current price (e.g. +$1 below $100, +$5 below $500, +$25 above $1000).
4. Inserts the bid, updates `currentPrice`, and creates an `OUTBID` notification for the previous top bidder plus `WATCH_BID` notifications for watchers.

Auction expiry is lazy: any read path that surfaces listings calls `settleExpiredAuctions()` which finalises auctions whose `endsAt` has passed. For production you'd swap this for a cron worker.

## Production hardening checklist

- [ ] Re-enable file uploads via S3 / Cloudinary (currently URL-paste only)
- [ ] Add Stripe Connect for real money flow with platform fee
- [ ] Add a cron worker for `settleExpiredAuctions()` instead of lazy settlement
- [ ] Replace polling with WebSockets / Server-Sent Events for instant bid updates
- [ ] Add rate limiting on `/api/signup` and `/api/listings/:id/bid`
- [ ] Add email delivery for notifications (Resend / Postmark)
- [ ] Add image processing (resize/strip EXIF) on upload
- [ ] Set a real `NEXTAUTH_SECRET` in `.env`
