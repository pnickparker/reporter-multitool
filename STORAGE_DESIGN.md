# "Bring your own storage" — design notes for discussion

*Written 2026-10-14 while Nick was away. This is a discussion document, not a plan to build. Nothing here is implemented. Facts about our code were read from the repo; facts about Google, Dropbox and Microsoft come from their public documentation (links at the end) and are marked where I couldn't confirm them.*

## Nick's principle, as I understand it

> The reporter and/or news organization owns and controls the content they create, even when using this app.

I'm treating that as a product commitment we'd put in the terms and the marketing, not just a feature. Nick said he may lean "too far" in this direction and wants to discuss the gray areas. So this document (1) says what the principle can fully deliver, (2) says where it can't without changing what the product is, and (3) recommends where to draw the line.

## Short version (my recommendation)

1. **Make the recording files live in the customer's own cloud account (Google Drive first), never in storage we own.** The code is already partly built this way: each user has their own Drive connection, and we only touch a folder the app created.
2. **Be honest about the two things that are not in their storage:** (a) the *text we generate* (transcript, quotes, posts) lives in our database, and (b) *temporary copies* pass through our servers and two vendors (AssemblyAI, Anthropic) while processing.
3. **Turn the principle into guarantees you can keep:** full export (everything, in normal file formats), full delete (ours and the vendors'), no use of their content for anything else, no retention after they leave. These are cheaper to keep and easier to prove than "your data never touches us."
4. **Don't promise "your data never leaves your control."** That is only true if processing happens on the device, which this architecture can't do.
5. **Before building more storage options, build the thing every option depends on:** real accounts and organizations (today there is one shared account), and encrypted storage of the access tokens (today they're plain text). See "What has to change."

## What "owns and controls" can mean — four layers

| Layer | Where it lives today | Can the customer own it? |
|---|---|---|
| **1. The recording file** (video, audio, photo, PDF) | Nick's Google Drive, in a folder the app created | **Yes — fully**, with their own storage connected. This is what "bring your own storage" is. |
| **2. What we generate from it** (transcript, speaker names, flagged quotes, scores, post drafts) | Our database (Supabase) | **Partly.** It's *theirs* in the legal and promise sense, but it sits on our servers. We can guarantee export + delete. We could also *also write a copy next to the recording* in their storage (see "A cheap, strong move" below). |
| **3. Temporary copies at vendors** | AssemblyAI (audio, transcript), Anthropic (transcript text) | **Not ownable, but minimizable.** We already delete AssemblyAI's transcript right after saving ours (new on this branch). Audio/prompts are retained briefly by the vendors under their policies. |
| **4. Our records about the use** (usage log, alerts, account info) | Our database | **Ours, but should hold no content.** The usage log stores tokens/dollars, not text; alert emails exclude content by design. Keep it that way. |

### A cheap, strong move: write the generated text to their storage too

After processing, save a `transcript.md` / `quotes.md` next to the recording in their folder. Then the customer's own account holds a complete, readable copy of everything, even if they leave us or we vanish. It makes "you own it" visibly true, supports the "buyer/owner can walk away with it" story for a company like BLOX, and costs little. The database copy remains for the app's speed and search. I'd put this on the shortlist.

## Where we are today (from the code)

- Drive access is `drive.file` only (`src/lib/google/oauth.ts`). That scope reaches only files the app itself created. Google classifies it **non-sensitive**, which means **basic OAuth app verification only, not the expensive third-party security assessment** that broad Drive scopes need. (My earlier note in BUSINESS_NOTES.md assumed the heavier review might apply; for this scope it appears not to. Worth confirming when we actually apply.)
- Each user has a `GoogleDriveConnection` (tokens + the app folder id). So the data model is already "one connection per person."
- **But `getCurrentUser()` returns the first connected user for everyone** (`src/lib/auth/current-user.ts`). The two testers and Nick all share Nick's Drive. There are no separate accounts, no organizations, and no data separation yet. Everything below depends on fixing that.
- **Tokens are stored in plain text** in the database (also noted in BUSINESS_NOTES.md). Before any customer connects their own storage, these must be encrypted.
- The `StorageProvider` interface (`src/lib/storage/types.ts`) has one method, `uploadFile`, and is barely used. The real work happens through Drive-specific code in `google-drive.ts` and the `/api/uploads/chunk` relay (Drive resumable uploads), `/api/assets/[id]/stream` and `/file` (playback and download), `process.ts` (streaming from Drive to AssemblyAI), and `finalize`. A second provider means widening that interface to cover: start an upload, send a piece, finish, open a stream with ranges, read size/duration, delete, check the connection is still healthy.
- **Important: the file passes through our servers in every option.** Uploads are relayed through our server in 4 MB pieces (the cloud's own endpoint refuses direct browser uploads); processing streams the file from storage to AssemblyAI via our server; playback streams through our server. Bring-your-own-storage changes where the file *rests*, not whether it *transits*. We don't write it to disk or keep it, but we should say "passes through" plainly rather than "never touches."

## The options

| Option | What it is | Who pays for storage | Our build effort | Good | Bad |
|---|---|---|---|---|---|
| **A. Customer's Google Drive** (today's design, made per-customer) | Each customer connects their Drive; we use a folder the app created. | Customer (their Drive plan). | **Low–medium** — mostly accounts, token encryption, a "connection health" screen, Google verification. | Already built; non-sensitive scope; no storage bill or retention liability for us. | Drive plan limits (video is huge); Workspace admins can block third-party apps; token expiry/revocation breaks processing; only works for Google shops. |
| **B. Customer's OneDrive/SharePoint** | Same idea, Microsoft Graph with an app-folder permission. | Customer. | **Medium–high** — second provider; different upload API and token handling. | Many newsrooms live in Microsoft 365. Microsoft's app-folder permission (`Files.ReadWrite.AppFolder`) doesn't require admin consent by default. | It's labeled **preview** in Microsoft's reference; tenants can still block user consent; publisher verification/multi-tenant details unconfirmed by me. |
| **C. Customer's Dropbox** | Dropbox "App Folder" access (one folder just for the app). | Customer. | **Medium–high.** | Narrow access type exists by design. | New apps are limited until Dropbox approves production use; reported thresholds range from 50 to 500 linked users (conflicting sources — confirm in their console). App folders can't be shared with other users, which hurts team use. |
| **D. Customer's own cloud bucket** (S3 / Backblaze / Azure Blob, S3-compatible) | They give us credentials to a bucket they own. | Customer. | **Medium–high** + support. | Maximum control for an organization with IT; best story for a buyer with strict data rules. | Reporters can't set this up; it's an enterprise feature. Credential handling needs care. |
| **E. Storage we run** (bucket in our account) | We store files; the customer exports on request. | Us (priced in). | Medium (needs retention policy, deletion, backups, security). | Simplest for customers; consistent performance. | Contradicts the principle unless export/delete is very strong; makes **us** the custodian of other people's raw interviews (legal and breach exposure); real storage bill for video. |
| **F. Device only** (native app, files stay on the phone) | Recording never leaves the phone except to process. | Customer's phone. | Very high (native apps, different product). | The purest ownership story. | Loses cross-device access, sharing, backup; a lost phone is a lost interview (conflicts with "never lose a recording"). |
| **G. Hybrid: A or B as default + E as a paid/fallback "we'll hold it for you"** | | | | Meets customers where they are. | Two paths to support; complexity. |

**My lean:** A now (it's nearly there), B if a prospect asks for it, D only if a larger organization insists, E only as an explicit, labeled convenience option if customers demand it, F not now.

## What bring-your-own-storage does to the product (good and bad)

**Good**
- Storage cost and retention liability are the customer's, not ours. Video is the one big storage cost, and it moves off our books.
- A strong, simple promise: "Your recordings stay in your Google Drive."
- A cleaner story for a buyer or a newsroom's lawyer.
- If a customer leaves, nothing needs to be returned — it's already theirs.

**Bad / costs**
- **Their quota becomes our problem.** If their Drive is full, uploads fail, and they'll blame us. Small-business Drive plans can have small allowances (verify current plan sizes). We'd need a clear message and probably a pre-flight check.
- **Admin policies.** A newsroom's IT admin can block third-party apps in Google Workspace or Microsoft 365. That's a sales blocker we don't control.
- **Connection health becomes a feature.** Revoked access, password changes, tokens that expire, a folder that was moved or deleted: each breaks processing or playback. Needs detection, a plain-language banner ("Reconnect your Drive"), and an alert to us (the alert system built on this branch can carry it).
- **Google "Testing" mode expires tokens every 7 days.** If our Google app is still in "Testing" status, reporters' connections silently lapse weekly. Moving to "In production" needs basic verification. *I could not check our app's current status; Nick can see it in the Google Cloud console under OAuth consent screen. Our connection has been working for weeks, which suggests it's already production or the token has been renewed.*
- **Support surface grows**: each customer's Drive quirks become our support tickets.
- **Performance varies** with the customer's storage and region; large files stream from their account.

## The gray areas (for the discussion)

1. **Reporter vs. newsroom.** For a staff reporter, work product usually belongs to the employer; for a freelancer (Michael, Cody), it belongs to the freelancer, who may sell it to several outlets. So the *owner* of a connection shouldn't be hard-wired to "the person." It might need to be either a person or an organization, and a project may need to **move** from a freelancer's storage to a newsroom's (or be shared). That's real design work: does a freelancer's pitch to an outlet copy the project, or hand it over?
2. **Generated text.** We say the transcript and drafts are theirs, but they live in our database. Is "theirs" enough, or does the principle mean they must live in *their* storage? (The cheap, strong move above makes it true in both senses.)
3. **AI-written material.** Quotes and post drafts are created by an AI service from their words. We would say they own those outputs; the vendor terms behind that are worth checking before we write it into our terms. *(Not verified here.)*
4. **Vendor copies.** AssemblyAI and Anthropic hold copies for short periods. We can delete what we can (AssemblyAI's transcript is deleted after our copy is saved) and choose vendors with good policies, but can't promise a vendor's own retention. Ask a lawyer how to word this.
5. **Others' content in a recording.** A source's words are in the recording. The reporter's control over it is not absolute (sources, subpoenas, newsroom policy). Not our problem to solve, but our wording should not over-promise confidentiality. Consent law (Illinois all-party vs. Missouri one-party) stays on the reporter.
6. **Backups and logs.** Our database backups hold derived text for a while after a delete. A "delete means gone" promise needs a stated time window.
7. **Legal demands.** If someone subpoenas us for a customer's data, what do we hand over and what do we tell the customer? Another question for a lawyer; the less content we hold, the better the answer.
8. **How far to lean.** The strongest version ("your data never reaches our servers") is incompatible with cloud processing. The version I'd stand behind: "Your recordings live in your account. We process them in transit, keep only the text, and you can take or delete everything at any time." That is concrete, checkable and keepable.

## What has to change in the code (in dependency order)

**Phase 1 — accounts and safety (required for any customer, whatever storage)**
- Real accounts and an **Organization** (a newsroom) that owns projects and one or more storage connections; a user belongs to an organization. Replace the "first connected user" shortcut.
- **Encrypt tokens at rest**; keep the key in the host's secret store.
- Per-organization data separation: every query scoped by organization. This is the riskiest part of the work, since a mistake exposes one customer's interviews to another.
- Connection health: detect a failed token refresh or missing folder; show a reconnect banner; send an alert.

**Phase 2 — the ownership guarantees**
- **Export everything** (original files stay in their storage; one download for transcripts, quotes, posts in standard formats).
- **Delete everything** (project or account): removes our database rows, tells the vendors to delete what they can, and leaves their storage untouched unless they ask us to remove the files we created.
- Write generated text into their folder (the cheap, strong move).
- Stop-work behavior: if the connection is lost, say so; never fail silently, never delete anything.

**Phase 3 — widen the storage layer (only when a prospect needs it)**
- Rework `StorageProvider` into the real set of operations (start upload, send piece, finish, ranged stream, stat, delete, health check) and move Google-specific code behind it.
- Add the second provider customers actually ask for (my guess: OneDrive).

**Phase 4 — optional**
- Customer-owned bucket (option D) for a larger organization.
- A "we hold it for you" paid option (option E), clearly labeled, with a stated retention period.

I'd not start Phase 3 or 4 until a real prospect asks. Phase 1 is needed for anyone to pay, and Phase 2 is what makes the principle real.

## Cost and pricing effects

- Under A/B/C/D our storage bill is near zero, so the price is mostly processing (about $0.056 for the first real 2.1-minute clip; see BUSINESS_NOTES.md for the correction on per-hour estimates). Under E, storage for **video** becomes a real cost (roughly 1–4 GB per hour of video) plus a retention/deletion policy.
- Customers pay their own Drive/OneDrive plan. For a video-heavy newsroom that may mean an upgrade — a real objection to price against.

## Marketing statements: what we can and can't say

| Say | Don't say (yet) |
|---|---|
| "Your recordings stay in your own Google Drive." | "We never see your data." (It passes through our servers.) |
| "You can export or delete everything at any time." (once Phase 2 is built) | "Your data is private from AI." (It's sent to an AI vendor to work.) |
| "We don't use your content for anything else." (true by design; put it in the terms) | "Nothing is kept anywhere else." (Vendors keep short-term copies; backups linger.) |
| "We delete the transcription vendor's copy as soon as ours is saved." (true on this branch once deployed) | Any guarantee about vendors' own retention. |

## Questions to take to prospects and the friend meeting

For newsrooms:
- Where do you keep recordings now (Google Drive, OneDrive/SharePoint, Dropbox, a server, phones)? Who administers it?
- Can staff connect third-party apps to your Drive/Microsoft account, or does IT have to approve?
- Do your reporters (staff vs. freelancers) share one storage account or each have their own? Who owns a freelancer's recordings once you buy the story?
- How much video vs. audio do you record, and how big is your storage plan?
- Would you rather we keep nothing after processing (just a transcript in your folder), or keep text for search?
- What would make you comfortable letting an AI service see a transcript — a statement, a contract clause, an audit?
- How long should deleted material stay recoverable?

For the friend building AI products (and a lawyer):
- How do you word "you own your data" in terms of service without over-promising, given vendor retention and backups?
- What did buyers ask about data handling, and when?
- Is a data processing agreement expected from small customers? Who drafts it?
- What happens to customer data if we sell the company? (A buyer like BLOX will ask.)

## Decisions for Nick

1. Is the line "recordings in *your* storage; text with us but exportable and deletable; copy of the text written to your storage too" about right, or do you want to lean further (e.g., no text in our database at all)? The further option costs speed, search and re-run features.
2. Should the owner of a project be a **person or an organization** (or both), given freelancers?
3. Google first, and only add OneDrive when asked? Or ask the prospects which they use before deciding?
4. Is a paid "we hold it for you" option (E) acceptable, or does it contradict the principle?
5. Do you want the principle written into the terms now (a short customer-facing statement), before accounts exist? The pilot terms can contain it even if the product isn't finished.

## Sources

- Google, Drive API authorization guide (scope descriptions; `drive.file` listed as non-sensitive; `drive.appdata` non-sensitive): https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Google OAuth "Testing" status and 7-day refresh-token expiry (community and developer-forum summaries; confirm against Google's current OAuth documentation before relying): https://www.unipile.com/google-oauth-refresh-token/ and https://discuss.google.dev/t/oauth2-refresh-token-expiration-and-youtube-api-v3/160874
- Dropbox developer guide (App Folder vs Full Dropbox; development vs production status): https://www.dropbox.com/developers/reference/developer-guide
- Microsoft OneDrive permissions reference (`Files.ReadWrite.AppFolder`, marked Preview, no admin consent required by default): https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/permissions_reference

**Not verified:** our Google app's current publishing status; Microsoft publisher-verification and multi-tenant requirements; the current Dropbox linked-user threshold; current Drive/OneDrive plan storage allowances; vendor terms on ownership of AI output. Check each before quoting it to a customer.
