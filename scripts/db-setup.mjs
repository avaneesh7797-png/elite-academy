// Build-time DB setup that TOLERATES a sleeping/unreachable database.
//
// The marketplace uses Postgres (Neon), whose free tier auto-suspends. If the
// DB is briefly unreachable during a build, `prisma db push` used to fail the
// ENTIRE deploy (P1001) — even though Studio/Emergency don't touch the DB. This
// retries a few times (giving the DB time to wake) and then continues the build
// regardless, so transient naps never break a deploy.

import { execSync } from "node:child_process";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (!process.env.POSTGRES_PRISMA_URL) {
  console.log("[db-setup] POSTGRES_PRISMA_URL not set — skipping db push/seed.");
  process.exit(0);
}

let ok = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    run("prisma db push --skip-generate --accept-data-loss");
    run("tsx prisma/seed.ts");
    ok = true;
    break;
  } catch {
    const last = attempt === 3;
    console.warn(`[db-setup] attempt ${attempt}/3 failed (database asleep or unreachable).${last ? "" : " retrying…"}`);
    if (!last) await sleep(5000 * attempt);
  }
}

if (!ok) {
  console.warn(
    "[db-setup] Database unreachable after retries — continuing the build anyway. " +
      "Studio & Emergency work without it; the marketplace connects to Postgres at runtime.",
  );
}

process.exit(0); // never fail the build on a transient DB nap
