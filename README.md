# EliteBids — Marketplace with live bidding

A full-stack eBay-style marketplace where users can list items for sale, run timed auctions, place bids, watch listings, and buy items outright.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** + **SQLite** (drop-in replaceable with Postgres)
- **NextAuth.js** (email + password credentials, bcrypt)
- **Tailwind CSS** + shadcn/ui-style components
- **Zod** for input validation
- **Lucide** icons

## Features

- Email/password signup & login with hashed passwords
- Create listings with image upload, category, condition, starting price, optional buy-it-now, configurable duration (1h–10d)
- Auction detail page with **live bid polling (every 4s)**, countdown timer, bid history
- Server-side bid validation: minimum-increment rule, no self-bids, no bids after expiry, atomic transaction
- **Buy-it-now** instant purchase
- **Watchlist** (save listings)
- **Notifications**: outbid, watched-listing-bid, won, sold, expired
- Search, category filter, price range filter, condition filter, four sort orders
- Account dashboard: active listings, things you're bidding on, items won, sold history
- Seller profiles
- Auction expiry: every read-path that surfaces listings calls `settleExpiredAuctions()` which closes ended listings, picks the winner, and creates win/sold/expired notifications

## Getting started

```bash
npm install
npx prisma db push        # creates dev.db
npx tsx prisma/seed.ts    # categories + demo listings + demo users
npm run dev
```

Then open http://localhost:3000.

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

- [ ] Replace SQLite with Postgres (just change `provider` and `DATABASE_URL`)
- [ ] Move uploads from `/public/uploads` to S3 / Cloudinary
- [ ] Add Stripe / payments for real money flow
- [ ] Add a cron worker for `settleExpiredAuctions()` instead of lazy settlement
- [ ] Replace polling with WebSockets / Server-Sent Events for instant bid updates
- [ ] Add rate limiting on `/api/signup` and `/api/listings/:id/bid`
- [ ] Add email delivery for notifications (Resend / Postmark)
- [ ] Add image processing (resize/strip EXIF) on upload
- [ ] Set a real `NEXTAUTH_SECRET` in `.env`
