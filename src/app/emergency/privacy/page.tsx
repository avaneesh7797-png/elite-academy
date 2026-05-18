import { BackBar } from "@/components/emergency/back-bar";

export const metadata = { title: "Privacy Policy — Emergency" };

export default function PrivacyPage() {
  return (
    <>
      <BackBar title="Privacy" />
      <article className="prose prose-invert max-w-none px-4 py-5 text-sm leading-relaxed text-zinc-200">
        <p className="text-xs text-zinc-500">Last updated: 2026-05-18</p>

        <h2 className="mt-4 text-base font-semibold">What this app is</h2>
        <p>
          Emergency is a personal-safety app that helps you reach help, store medical
          information, and (optionally) share your location with family. The core SOS,
          Medical ID, contacts, first-aid and settings features work entirely on your
          device with no account.
        </p>

        <h2 className="mt-4 text-base font-semibold">Data we store on your device</h2>
        <p>
          The following are kept only in your browser&apos;s local storage and never
          leave your device unless you turn on cloud sync (a Premium feature):
        </p>
        <ul className="list-disc pl-5">
          <li>Medical ID profile (name, DOB, blood type, allergies, conditions, medications, doctor, insurance, in-case-of-emergency contact, notes)</li>
          <li>Trusted contacts list</li>
          <li>Emergency settings (country preset, numbers to dial, location-share toggle)</li>
          <li>App preferences (PWA install prompt dismissal, TWA mode flag)</li>
        </ul>
        <p>
          You can delete this data by clearing site storage in your browser or by
          uninstalling the app.
        </p>

        <h2 className="mt-4 text-base font-semibold">Data we store on our servers</h2>
        <p>If you create an account, we store on our servers:</p>
        <ul className="list-disc pl-5">
          <li>Your name, email and a salted password hash (never the plain password)</li>
          <li>Premium subscription status and PayU Transaction IDs you submit</li>
        </ul>
        <p>If you turn on cloud sync (Premium), we also store:</p>
        <ul className="list-disc pl-5">
          <li>The same Medical ID, contacts and settings data listed above</li>
        </ul>
        <p>If you join a family circle (Premium), we also store:</p>
        <ul className="list-disc pl-5">
          <li>Your circle membership, role and invite code</li>
          <li>Your most recent latitude / longitude / accuracy (single row, overwritten on every update; not a history)</li>
          <li>Alerts you broadcast to the circle, including SOS alerts and their coordinates</li>
        </ul>

        <h2 className="mt-4 text-base font-semibold">Location data</h2>
        <p>
          The app uses location only when you actively trigger SOS or open the
          Family Circle / Nearby Help screens. We do not run background location
          tracking. Location data:
        </p>
        <ul className="list-disc pl-5">
          <li><strong>SOS:</strong> used locally to create a maps link you can text to your contact. Sent to our servers only if you&apos;ve turned on the family broadcast.</li>
          <li><strong>Family Circle:</strong> your latest position (only) is uploaded while the circle screen is open, so members of your circle can see where you are.</li>
          <li><strong>Nearby Help:</strong> your coordinates are sent to the OpenStreetMap Overpass API (a public, free dataset) to find nearby hospitals, clinics and defibrillators. We do not log these queries.</li>
        </ul>

        <h2 className="mt-4 text-base font-semibold">Payments</h2>
        <p>
          Payments are processed by PayU (payu.in). We do not see or store your card,
          UPI or banking details. We store only the Transaction ID you provide and
          your subscription status.
        </p>

        <h2 className="mt-4 text-base font-semibold">Third-party services</h2>
        <ul className="list-disc pl-5">
          <li><strong>PayU India</strong> &mdash; payment processing</li>
          <li><strong>OpenStreetMap Overpass API</strong> &mdash; nearby-place lookup (Premium only, when you open Nearby Help)</li>
          <li><strong>Google Maps</strong> &mdash; for &ldquo;Directions&rdquo; deep-links from results. We don&apos;t share data with Google; tapping the link is the same as opening a maps URL.</li>
          <li>Hosting (Vercel) and database (Postgres) for the account / cloud-sync features.</li>
        </ul>

        <h2 className="mt-4 text-base font-semibold">Children</h2>
        <p>
          The app is not directed at children under 13. If you are under 13, do not
          create an account; ask a parent to set up the app for you.
        </p>

        <h2 className="mt-4 text-base font-semibold">Your rights</h2>
        <p>
          You can delete your account by signing in, leaving any family circle, then
          contacting us. We will remove your account and all server-side data within
          30 days. Local-device data is removed when you uninstall the app.
        </p>

        <h2 className="mt-4 text-base font-semibold">Disclaimer</h2>
        <p>
          This app is not a substitute for professional medical advice or emergency
          services. In a real emergency, call your local emergency number first.
        </p>

        <h2 className="mt-4 text-base font-semibold">Contact</h2>
        <p>Email: <span className="text-zinc-400">replace-with-your@email.com</span></p>
      </article>
    </>
  );
}
