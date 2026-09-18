# Reporter Multi-Tool — v1 Scope

Decided in conversation on 2026-09-15, building on `REPORTER_MULTITOOL_BRIEF.md`.

## Status as of 2026-09-18 (read this first when resuming)

**Working end-to-end, tested with real recordings:**
- Google OAuth + Drive connection (one connected account, app-created "Reporter Multi-Tool" folder)
- Project creation + browsing (home page)
- File upload → pushed to Drive → `Asset` row created
- AssemblyAI transcription, auto-triggered after upload, with speaker-labeled turns displayed

**Not started yet:**
- Claude API pipeline (quote flagging, then social post generation) — the next piece to build.
- **Export — confirmed requirement, not just an idea.** All generated content per asset (transcript, flagged quotes, social post drafts) must be saved to the project (already true by design — see data model) *and* accessible for export as one combined file/package, not transcript-only. No download path exists yet. Raised by one of Nick's testers on 2026-09-18, confirmed by Nick as a real requirement the same day. Build this right after the Claude pipeline (quotes + social posts) exists, since exporting only the transcript now would mean redoing it.

**Decisions made along the way that update this doc:**
- **Database is Supabase, not Neon.** A separate session on the Mac Studio set this up independently before this was reconciled; decided to keep it rather than switch, since it was already working. Used purely as a Postgres host (no Supabase auth/storage features). The "Stack" section below is stale on this point.
- No login/session system exists. `src/lib/auth/current-user.ts`'s `getCurrentUser()` is a placeholder that just picks the sole Drive-connected user. Needed before the 2 freelance testers can actually use this themselves.

**Known TODOs, not urgent but don't forget:**
- Drive OAuth tokens are stored in plaintext in the `GoogleDriveConnection` table. Fine for solo testing; encrypt before testers connect real accounts.
- An early manual test asset may exist with status stuck at `UPLOADING` forever (created before transcription existed) — harmless, just delete it or ignore it if seen.

**Resuming on a different machine (e.g. the Mac Studio):**
1. `git pull` (or `git clone git@github.com:pnickparker/reporter-multitool.git` if not cloned there yet).
2. Make sure Node.js is installed (via nvm or Homebrew).
3. `npm install`.
4. Recreate `.env` on that machine — it's gitignored on purpose (real secrets), so it doesn't come from git. Copy the values from the Passwords app entries: Supabase `DATABASE_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI`, `ASSEMBLYAI_API_KEY`. See `.env.example` for the exact variable names.
5. `npm run dev` and confirm `localhost:3000` loads and shows you signed in.
6. Tell the new Claude Code session to read this file (`V1_SCOPE.md`) for context, then say what you want to work on next.

## What v1 is

A **web app** that proves one end-to-end loop:

**Upload/record a clip → transcribe it → surface quotable moments → generate social post drafts → export.**

Not the mobile app. Not the full brief. One thin, working slice, built to be extended rather than thrown away.

## Users

- Nick, plus 2 freelance reporter testers. Flat permissions — everyone's a peer, no roles/admin tiers yet.
- Basic accounts/login from day one (retrofitting auth later is painful even for 3 users).

## Capture

- **Upload only** for v1 — no in-browser recording yet. Reporters record with their phone's native camera/voice memo app, then upload the file.
- Both **audio and video** files supported from day one (near-equal cost to build; the AI pipeline treats them the same — audio track out, everything downstream is identical).
- Expected content shape for testing: **short clips, 3-10 minutes** (player/coach interviews, not hour-long podcast episodes). This shapes several decisions below — revisit if usage shifts toward long-form (e.g. Fredcasts) later.
- Growth path (not v1): in-browser mic/camera recording via the browser's MediaRecorder API, which may get us close to "never leave the app" without needing a native mobile app at all. Native app stays a later option if browser recording proves insufficient for run-and-gun field use.

## Storage

- **Google Drive**, via the Drive API — not a dedicated object-storage service (S3/R2).
- Why: Nick already pays for Google storage (no incremental cost), and sharing a Drive folder with freelance testers is a workflow they already know.
- Pattern: Nick's Google account connects to the app once (OAuth). The app writes into a folder in his Drive. Testers get edit access to that folder the normal way (Drive sharing) — they don't need their own OAuth grant to the app for storage purposes.
- Known limitation, accepted for now: Drive doesn't support efficient range-request video seeking the way dedicated storage + a CDN does. This matters for hour-long content; it's a non-issue at 3-10 minute clip lengths, where a browser can just progressively download the whole file.
- **Storage is written as an abstraction in code**, not Drive-specific calls scattered everywhere — so swapping to Cloudflare R2 later (if content length grows, e.g. full Fredcasts episodes) is a contained backend change, invisible to how reporters use the app.

## AI pipeline (built by us, calling two backend APIs)

This is not "connecting reporters to Otter/CapCut/etc." — it's one app with two invisible infrastructure dependencies, same as any app depending on AWS or Stripe:

1. **Transcription** — AssemblyAI (~$0.20-0.25/hour of footage including speaker diarization). Auto-runs on upload; produces a timestamped, searchable transcript.
2. **Quote & clip flagging** — Claude API. Our own prompt/pipeline (not a third-party product) that reads the transcript and flags quotable moments with timestamps + reasoning.
3. **Social post generation** — Claude API. Takes flagged quotes + transcript context, generates 3-5 platform-variant drafts (copy only for v1; no auto-attached graphics yet).

Estimated AI cost: **under $0.50 per hour of raw footage processed** — at realistic testing volume (a handful of short clips/week across 3 people), total AI spend should be a few dollars a month, not a budgeting concern for v1.

## Explicitly deferred (not v1)

- Newsroom-specific templates (NewsLink HQ, Meeting Coverage, Fredcasts production) — revisit once the generic pipeline is proven. Only worth adding once in-app article writing exists.
- Native mobile app / native camera capture.
- Pro-tool round-tripping (Adobe, CapCut, Final Cut open/sync-back).
- CMS auto-publish (WordPress).
- Auto clip editor / auto-generated captions & graphics.
- Social scheduling.
- Multi-cloud support (Dropbox/iCloud as alternatives to Drive).
- Revenue model / tiers — irrelevant until there's a working product to attach pricing to.

## Data model (working draft)

```
Project
├── id, name, created_at, owner (Nick or a tester), tags
└── Assets[]
    ├── id, type (video | audio)
    ├── source_file (Drive file reference)
    ├── duration, uploaded_at
    ├── transcript (text + timestamps)
    ├── flagged_quotes[] (timestamp, text, reason)
    ├── generated_social_posts[] (platform, copy, based_on_quote_id)
    └── status (uploading | transcribing | ready | error)
```

## Stack (proposed, open to revisit once we start building)

- **Frontend/backend:** Next.js (React + API routes in one framework — simplest for a solo/small-team web app)
- **Database:** Postgres (via a managed host — e.g. Supabase or Neon — avoids running our own DB server)
- **Auth:** Simple email/password or Google sign-in (matches the Drive OAuth we need anyway)
- **File storage:** Google Drive API, behind an internal storage abstraction
- **Transcription:** AssemblyAI
- **AI extraction/generation:** Claude API (Sonnet 5)
- **Hosting:** Vercel (frontend/backend) — free tier likely sufficient for this testing phase

## Next steps

1. Scaffold the Next.js project + Postgres schema for Project/Asset.
2. Google OAuth + Drive API connection (upload a file, confirm it lands in Nick's Drive folder).
3. Upload flow (UI + storage abstraction) for audio/video files.
4. AssemblyAI integration — auto-transcribe on upload.
5. Claude API pipeline — quote flagging, then social post generation.
6. Basic project/asset browsing UI to tie it together.
7. Test end-to-end with a real short interview clip.
