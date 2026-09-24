# Reporter Multi-Tool — v1 Scope

Decided in conversation on 2026-09-15, building on `REPORTER_MULTITOOL_BRIEF.md`.

**See also: "Reporter Multi-Tool: Product Plan"** — a fuller vision/workflow doc Nick built on claude.ai (not in this repo by design; saved as PDF to `~/Library/Mobile Documents/com~apple~CloudDocs/01_Multitool/`). It's the source of truth for the *why* behind v1 scope and the locked build order below; this file stays the technical build log.

## Status as of 2026-09-21 (read this first when resuming)

**Working end-to-end, tested with real recordings:**
- Google OAuth + Drive connection (one connected account, app-created "Reporter Multi-Tool" folder)
- Project creation + browsing (home page)
- File upload → pushed to Drive → `Asset` row created
- AssemblyAI transcription, auto-triggered after upload, with speaker-labeled turns displayed
- Claude API pipeline: quote flagging (however many the transcript actually supports, not a forced 3-6) then social post generation (one draft per platform — Twitter/X, Instagram, Facebook — but only for quotes scoring ≥70/100 on predicted audience engagement, see `src/lib/ai/scoring.ts`), both following AP Style. Runs automatically right after transcription. New `GENERATING` asset status covers this step. Verified against a real transcript. Engagement scoring added 2026-09-21 after Nick found the original fixed-count version produced too many posts for short clips — every quote is still saved/shown regardless of score, only post generation is filtered.
- **VIDEO asset type confirmed working**, not just AUDIO — uploaded a real `.mp4` container through the full pipeline (Drive upload → AssemblyAI transcription → quotes → social posts), all correctly tagged `type: VIDEO`. Caveat: the test file had only an audio track (no picture) since no video-generation tool was available for testing — doesn't matter functionally since nothing in this app touches pixel data yet (no thumbnails/preview), but worth knowing this wasn't a real camera-recorded video file.
- **Per-asset export**, satisfying the confirmed requirement above (transcript + flagged quotes + social post drafts, not transcript-only) — downloads as one `.md` file via an "Export" link once an asset is `READY`. Verified against a real asset.

**Not started yet — locked build order from the 2026-09-24 planning pass (see Product Plan):**
1. **Whole-project export** — bundle every asset in a project into one combined file. Already fully scoped, no new decisions needed.
2. **Notes and Documents as new Asset types** — tester-requested (both testers already voice-dictate notes leaving a venue, and photograph rosters/agendas with nowhere to live). Extends the existing `Asset` model rather than needing new infrastructure. Needs to land before #3, since quick capture's "+" menu needs all four capture types to exist.
3. **Quick capture + optional pre-event project fields** — a "+" button offering Record/Upload Audio, Record/Upload Video, Add Document, Add Note with no project required first (auto-creates a default-named project if none exists); separately, projects gain optional title/notes/date/venue fields fillable anytime. Built on top of #2.
4. **Beat tagging** — reuses the existing `tags` field, no new schema. Cheapest of the four, slots in whenever.

**Resolved on 2026-09-24 (see Product Plan):**
1. **The capture gap** — resolved as a deliberate no, not an oversight. In-app camera/mic recording (browser `MediaRecorder`) will not be built: the ordinary upload flow already launches the phone's native camera/mic app through the OS file picker, which is faster and higher quality than a custom in-app recorder would be. Revisit only if testers report the upload-picker path is actually too slow/clunky in real field use (this is now an explicit open question in the Product Plan).

**Still open — not addressed by the Product Plan, needs a decision:**
2. **Social posts may be arriving too early.** The pipeline (transcribe → flag quotes → generate posts) still runs automatically and immediately with no human checkpoint. Nick's instinct from 2026-09-22 was that this might need to become a more deliberate, stepped process — review transcript/quotes first, then explicitly trigger post generation. The 2026-09-24 Product Plan's workflow diagram bundles "transcript · quotes · posts" as one uninterrupted "Post-event (v1)" stage, so this question wasn't resolved one way or the other — worth explicitly deciding rather than assuming it's settled.

**Decisions made along the way that update this doc:**
- **Database is Supabase, not Neon.** A separate session on the Mac Studio set this up independently before this was reconciled; decided to keep it rather than switch, since it was already working. Used purely as a Postgres host (no Supabase auth/storage features). The "Stack" section below is stale on this point.
- No login/session system exists. `src/lib/auth/current-user.ts`'s `getCurrentUser()` is a placeholder that just picks the sole Drive-connected user. Needed before the 2 freelance testers can actually use this themselves.
- **Style: AP Style only for now, no local-market style settings.** Nick's call — building local style rules into the prompt now would mean throwing that code away once a proper settings UI exists; pure AP Style keeps the future settings feature additive instead of a rewrite. See `src/lib/ai/style.ts`.

**Known TODOs, not urgent but don't forget:**
- Drive OAuth tokens are stored in plaintext in the `GoogleDriveConnection` table. Fine for solo testing; encrypt before testers connect real accounts.
- An early manual test asset may exist with status stuck at `UPLOADING` forever (created before transcription existed) — harmless, just delete it or ignore it if seen.

**Resuming on a different machine (e.g. the Mac Studio):**
1. `git pull` (or `git clone git@github.com:pnickparker/reporter-multitool.git` if not cloned there yet).
2. Make sure Node.js is installed (via nvm or Homebrew).
3. `npm install`.
4. Recreate `.env` on that machine — it's gitignored on purpose (real secrets), so it doesn't come from git. Copy the values from the Passwords app entries: Supabase `DATABASE_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI`, `ASSEMBLYAI_API_KEY`, `ANTHROPIC_API_KEY`. See `.env.example` for the exact variable names.
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
- Meeting-minutes-style generation from a transcript, and newsletter packaging — both held back until there's real usage data showing they're needed (added to this list 2026-09-24, per Product Plan).
- Video clip auto-cutting (à la Riverside/Opus Clip) and CMS publish packaging — moved to v2 scope in the Product Plan, not abandoned. Both flagged as needing more groundwork first (a feasibility spike for clip-cutting; knowing which CMS Link 2 Lee's Summit actually runs, for packaging) before they can be scoped as real work.

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

All of the original 7 steps here are done (scaffold, OAuth/Drive, upload, transcription, AI pipeline, browsing UI, real-clip test) — see the Status section at the top for what's actually built and verified. Current build order is the locked list in that section: whole-project export → Notes/Documents asset types → quick capture + pre-event project fields → beat tagging.
