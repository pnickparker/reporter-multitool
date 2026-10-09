# Reporter Multi-Tool — v1 Scope

Decided in conversation on 2026-09-15, building on `REPORTER_MULTITOOL_BRIEF.md`.

**See also: "Reporter Multi-Tool: Product Plan"** — a fuller vision/workflow doc Nick built on claude.ai (not in this repo by design; saved as PDF to `~/Library/Mobile Documents/com~apple~CloudDocs/01_Multitool/`). It's the source of truth for the *why* behind v1 scope and the locked build order below; this file stays the technical build log.

## Status as of 2026-09-25 (read this first when resuming)

**The entire locked build order from the 2026-09-24 Product Plan is now done.** All four items (whole-project export, Notes/Documents, quick capture + pre-event fields, beat tagging) are built and verified. There is no pre-assigned "next thing" anymore — the next step needs a real decision from Nick, informed by either the open question below or actual field testing with real recordings.

**In progress as of 2026-09-25: deploying to Vercel so Nick's two testers can reach the app.** Decided: deploy to Vercel (Pro plan — Hobby's terms don't cover multi-person/business use), gated by one shared `SITE_PASSPHRASE` rather than building real per-person accounts (matches the app's flat-permissions design). The passphrase gate itself is built, tested locally, and pushed (`src/proxy.ts`, `src/lib/site-auth.ts`, `/login`, `/api/login`) — that part is done.

**Where the Vercel side got stuck:** the `reporter-multitool` Vercel project is created and connected to GitHub, and all 7 environment variables are now set correctly (including the real production `GOOGLE_REDIRECT_URI` — `https://reporter-multitool.vercel.app/api/auth/google/callback` — and Nick's real chosen `SITE_PASSPHRASE`, not the local test values). But **no deployment has ever actually run** — the project shows "No Production Deployment" / "Your Production Domain is not serving traffic," and a "Redeploy" button doesn't apply (nothing to redeploy from). The Deployments tab has filter chips (Author/Environment/Status: Error) that appear to be stuck/uncloseable and may be hiding what actually happened on the first attempt. Nick stopped here for the night, tired from platform friction, not because of a technical dead end.

**Next step when resuming:** figure out why zero deployments exist despite the project being connected to GitHub, and trigger the first real one. Options to try: (a) find an unfiltered view of the Deployments tab (the stuck filter chips may just need a page refresh, same fix that worked earlier for frozen form fields), (b) check the project's Git settings to confirm it's actually tracking the `main` branch, (c) as a fallback, push a trivial new commit to `main` to force Vercel's git-integration auto-deploy to fire. Once a deployment succeeds: visit the site, Nick connects his Google Drive first (before sharing the passphrase with testers, so `getCurrentUser()` resolves to him — see the `orderBy: createdAt: asc` hardening already in place), confirm the app works end-to-end on the real URL, then share the URL + passphrase with the two testers.

## Status as of 2026-10-08 — real usage, first value feedback, and a deploy gap caught

**First concrete product-value feedback: Michael (a tester) said he really likes the viral scoring and suggested quotes — having them already pulled makes his writing time more efficient.** That's the AI quote-flagging/engagement-scoring layer specifically, not transcription — the part of the product that's supposed to be the differentiator (see BUSINESS_NOTES.md, "don't compete on transcription").

**What the database shows about real usage (read-only check, 2026-10-08):** 24 assets across ~10 projects, 21 `READY`. Mostly audio, mostly sports coverage (soccer, football, coach interviews), plus a few video clips. The one `ERROR` is Nick's own old Spatial Video test (Sept 22). Two assets sit at `UPLOADING`: Nick's known early test asset (Sept 18), and an Oct 1 video upload in "SMA players on Hannaway" that never reached finalize (a retry 44 minutes later succeeded) — abandoned uploads leave an orphaned `UPLOADING` row that still counts toward the project's asset total; cosmetic, minor TODO. **No new silent failures among tester assets.** Usage tilts toward sports, which is worth weighing against sports being a "v1.5" item in the business notes.

**Caught: nine commits were never pushed to GitHub** — the `maxDuration` fix, the Share-button fix, the processing-time limit, and the docs commits all existed only locally, so production was still running the pre-fix code. The tell was that no asset since Oct 1 had `fileSizeBytes` populated, which the new `finalizeMediaUpload` writes for every upload. Practical consequences: the "~10 minute" guideline given to testers was not actually being enforced, and a Travis-style silent timeout on a large video could still have happened. It hasn't bitten because testers have uploaded mostly small audio files. GitHub also had one commit the laptop lacked — Nick's critical Next.js RCE security patch (`697b4b8`, made on the other machine) — now merged in locally, with typecheck and a production build verified against the patched version. **Waiting on Nick to run `git push`.**

**Lesson to carry forward:** "committed" is not "deployed." Before telling testers a limit or fix is live, confirm it actually reached production — a cheap check is whether the new fields (`fileSizeBytes`) are being populated on fresh uploads.

**Deploy confirmed, and a gap in the processing-limit check found and fixed (2026-10-09).** Michael's morning uploads (via the regular site) recorded `fileSizeBytes`, so the `maxDuration` fix and the limit check are live on production. The same data showed `duration` empty on a real phone video: Drive only works out a video's length some seconds *after* the upload finishes (confirmed — it reported 46s for that file minutes later, while our stored value was null) and never reports one for audio, but the check runs the instant the upload completes. So the transcription-time part of the estimate was being silently dropped. Fix: the browser now reads the length straight off the chosen file (`readMediaDuration` in `upload-asset-form.tsx`, a hidden audio/video element reading only the header, giving up after 4 seconds) and sends it with the finalize call; the server sanity-checks it (finite, positive, under 24 hours), and Drive's own value wins when it has one. This also finally fills in `Asset.duration` for audio. Verified end to end against the real endpoints: an honest 3.3s duration was accepted and stored, an inflated 4100s was rejected instantly with the standard message, and no duration still works as before; separately confirmed in a browser that a generated 12-second WAV reads as 12 and a corrupt file returns null in milliseconds. Not verified: reading duration from a real iPhone `.mov`/Android `.mp4` in the field.

### Storage and native-app thinking (2026-10-09) — decisions about *when*, nothing built

Prompted by Nick asking, while approving an in-app player, whether it's time to leave Google Drive and whether to build native iOS/Android apps (the app that inspired him, Rode Capture, is iOS-only).

**Drive: not yet.** The player streams files Drive → our server → the phone, which is fine for a handful of testers. The triggers that should reopen the question: (1) the first paying outside newsroom — real per-customer accounts force a choice between each customer's own Drive and storage we run (see BUSINESS_NOTES.md); (2) playback complaints (Drive is not a media server and the extra hop adds delay); (3) Drive API quota or terms problems at higher use. To keep a later move cheap, storage-specific code stays in `src/lib/storage/google-drive.ts` and the routes call into it. Consistent with the earlier open question in this file ("is Drive more infrastructure than v1 needs") and the BLOX exit thinking (an acquirer re-platforms storage anyway).

**Native apps: stay web-first.** Why Rode Capture is iOS-only: it's an accessory for Rode's hardware microphones and needs deep camera/audio control a web page can't get, one platform is far cheaper than two native codebases and two store reviews, and its audience skews iPhone. This app's job (upload, transcribe, review, share) doesn't need that, and testers are on both iOS and Android. Real limits of the web approach, worth watching for in tester feedback: a web app can't be a target in the iPhone share sheet ("send this video from Photos into the app"); an upload can stall if the phone locks or the browser is backgrounded mid-way; background recording and push notifications are limited on iOS. Cheap steps before any native work: make it an installable home-screen app (PWA). If the limits above become the real pain, wrap the same web app in a native shell (e.g. Capacitor) for both stores rather than rewriting. Decide on evidence from testers, not in advance.

### Look and feel: direction chosen (2026-10-08) — nothing applied to the app yet

Nick explored three mobile directions on a design canvas (https://claude.ai/artifact/9VaDptHvy2wFGDMcJ56ktW, private) and picked **B · Purple + Green** — "the clear winner, both in color scheme and layout." Reference he liked: YouTube Create's dark, big-tappable-action style. Name "Mobile News Bureau" is a stand-in (inside joke from his 1990s reporting days; he keeps a list of alternatives).

What B is: deep violet-black ground (`#15111f`), violet (`#7c3aed`) for the main actions, green (`#3ddc97`) for ready/high-score/capture, Bricolage Grotesque headlines with DM Sans text; a bold capture card at the top of Home (Record, plus Note and Document), a two-column project grid, a floating pill tab bar with a green "+" button, and on the project page a Moments / Transcript / Files switcher with the quote score drawn as a ring (green at 70+, matching the post-draft cutoff).

The mockups include things the app doesn't have yet — a mobile tab bar (the real app has only Home and project pages), "Quotes" and "You" tabs, and clip time ranges — so applying B splits into a **skin** (colors, type, buttons, cards; low risk, touches existing components) and **structure** (capture card, project grid, tab bar, project-page tabs; more work, partly depends on features not built). Testers are using the live app, so the plan is to do this on a branch and review a Vercel preview before it reaches `main`.

### Phase II thinking: clips from flagged quotes (2026-10-08, ideas only — nothing built)

Nick's question: instead of a full Riverside-style auto-editor, can the app use the clip scoring to *mark* the good moments so a reporter can trim quickly in the phone's native apps? His instinct is that fast, social-ready clips published alongside a story would be a big deal; he's taking the question to testers.

What exists today: each `FlaggedQuote` stores only a start `timestamp`, but `Transcript.segments` holds AssemblyAI's per-utterance start/end times, so in/out points (plus a little padding) are derivable with no new AI work. Honest limit: a web app can't inject markers into the iPhone Photos app or iMovie/CapCut — there's no hook for it. Realistic options, cheapest first:
1. **Time ranges on each quote** (e.g. 1:42–2:05, copyable, included in exports). The reporter finds the spot and trims manually. No new infrastructure; mostly validates demand.
2. **In-app preview with markers** — play the original with jump-to-moment, to confirm it's the right clip. Needs streaming from Drive (the current `/file` route loads the whole file into memory, fine for Share, not for playback).
3. **Generate the trimmed clip files** and deliver them through the Share sheet — the version that delivers the "huge" benefit, since no trimming is needed. Needs video-cutting compute outside a Vercel function (FFmpeg worker or a media API) — a separate cost line (see BUSINESS_NOTES.md). The Product Plan already called for a feasibility spike before committing to this.
Not solved by any of the above: social-ready also usually means vertical framing and burned-in captions, which is the genuinely heavy "auto-cut" territory.

Data point that shapes this: tester uploads so far are roughly three-quarters audio (sports audio), so clips-from-video would apply to a minority of current uploads; audio would need an audiogram-style treatment (waveform + captions) instead.

**First answers (2026-10-08, Cody Thorn, via Nick's text thread):**
- Always shoots video, never audio-only.
- His real workflow: shoot video and a photo, open Photos and trim the dead space, then go to Adobe, add the video plus an overlay (a watermark), export, and upload to X/Twitter.
- Asked whether he wants video tools inside the app or just a button to open Adobe: "Open it would be nice" — a hand-off, not in-app editing.
- Does not add burned-in captions; "I just throw watermark and move on." **"Caption is the twitter part"** — to him a caption is the text of the post, which is exactly what the app already drafts. When asking other testers, separate "captions burned into the video" from "the text of the post"; they mean different things and the word is ambiguous.
- Did not answer whether auto-trim to a marked quote would help; Nick will ask again.

What this suggests (one reporter's view, not a decision): the clip-making step stays in his own tools, so the highest-value bridge looks like option 1 (start–end times on each quote, so he knows where to trim in Photos) plus the post copy the app already drafts, not in-app video editing or server-side cutting. The existing Share button may already cover "open it in Adobe" — the iOS share sheet normally lists video apps like Adobe's — but that is unverified.

**Questions for testers:** (1) Do you shoot video at events, or mostly record audio? (2) For one story, how many clips would you post, on which platforms, how long? (3) Where do you cut video today (Photos, CapCut, InShot) and how long does a clip take? (4) Would start–end times save you real time, or only a finished clip ready to share? (5) Do captions and vertical framing matter to you? (6) Would you use an audio clip with waveform and captions if there's no video?

## Status as of 2026-10-01 — fixed: large videos silently stuck forever

**Found and fixed: Travis (one of the two freelance testers) uploaded a real video that never transcribed and triggered nothing — no error, nothing in the UI, just silently stuck.** Confirmed in the database: the asset was frozen at `TRANSCRIBING` with `errorMessage: null` — meaning our own try/catch error handling never ran at all. That's the signature of something killing the process from the outside, not a bug in our code throwing an exception we'd normally catch.

Confirmed with real data: the stuck video (`20260930_202038.mp4`) is **274.7MB and 2 minutes 56 seconds long** — via Drive's `videoMediaMetadata`. For comparison, the largest clip tested successfully before this was 52.4MB/53 seconds, and the *other* asset in the same project (a 2.8MB audio file) uploaded 34 minutes later and completed successfully. That gap — a huge video failing silently while a tiny audio file right next to it works fine — points squarely at **Vercel's function execution time limit**: nowhere in this codebase was `maxDuration` ever set on the routes that kick off transcription via `after()`, so they were running on Vercel's low default, nowhere near enough time to download a 274MB file from Drive, transcribe nearly 3 minutes of video, and run the AI pipeline.

**Fixed:** added `export const maxDuration = 300` (300 seconds — the maximum allowed on a Vercel Pro plan without Enterprise) to all three routes that can trigger transcription: `/api/assets/[id]/finalize/route.ts` (the active path for all current audio/video uploads), plus `/api/quick-capture/route.ts` and `/api/projects/[id]/assets/route.ts` defensively (their `createAssetFromFormData` → `handleMediaUpload` path isn't reachable from the current UI, which routes all audio/video through finalize instead, but it still exists in the code). **Known remaining limit:** 300s is the Pro-plan ceiling — an unusually long or huge file could still exceed it. Worth knowing, not yet worth solving until it's an actual complaint.

**Recovered Travis's actual video**, and this doubled as direct confirmation of the timeout theory: ran `downloadAndProcessTranscription` from local Node (not Vercel, so no time limit applies) against the real Drive file and database row — completed in **52.6 seconds** end to end (download + AssemblyAI transcription + the AI pipeline), producing a real, coherent 3,364-character interview transcript and 6 flagged quotes. The asset now shows `READY` in the shared production database, same as any other completed asset. 52.6s comfortably clears whatever Vercel's actual unset default was, which is exactly why it died there before and succeeds now with `maxDuration = 300` in place.

**Still worth deciding, not yet built:** a safety net so a future stuck asset doesn't just sit there silently forever even if some other, different cause trips the same failure mode — e.g., a Vercel Cron job that sweeps for assets stuck in `TRANSCRIBING`/`GENERATING` past some age and marks them `ERROR` with an explanatory message. Not built yet since the specific cause here is now fixed and this would be new infrastructure (Vercel Cron) — worth a deliberate decision with Nick rather than building reflexively.

**Also found, not yet fixed: the Mac Studio's local `.env` has a stale `GOOGLE_CLIENT_SECRET`.** Confirmed by a live call to Google returning `invalid_client`. This is unrelated to the Travis bug (production's copy is fine — the audio file that succeeded right after proves that), but local dev on that specific machine can't authenticate to Drive until its `.env` is updated with the current secret value. Not urgent; just don't trust Drive-dependent local testing on the Mac Studio until this is fixed.

**Decided with Nick: don't build the async/webhook rearchitecture that would remove the time limit entirely, at least not yet.** That's the only way to support arbitrarily long recordings (e.g., a full hour-long sit-down interview) — real work, not a tweak, since it means decoupling transcription from any single Vercel function's execution window via AssemblyAI's webhook callback instead of waiting inline. Matches the product's original framing (fast field captures, not long sit-downs) — revisit only if real tester feedback says otherwise.

**Found and fixed a real gap in the "don't trap testers" direction: the Share button was hidden until an asset reached `READY`,** even though the original file finishes uploading to Drive (and `sourceFile` gets set) *before* transcription even starts — so a reporter whose clip got stuck in `TRANSCRIBING` had no way to grab their own recording back out of the app to work around it, even though it was already sitting safely in Drive. Changed the gate from `asset.status === "READY" && asset.sourceFile` to just `asset.sourceFile` in `src/app/projects/[id]/page.tsx` — Share (and the existing "Drive file: open" link, which was never gated on status to begin with) now works regardless of processing state. Verified the logic against a throwaway test asset manually set to `TRANSCRIBING` (couldn't visually confirm the Share button itself renders, since this desktop browser doesn't support the Web Share API either way — same known limitation as every previous Share test this project).

Separately — not a code fix, just worth knowing: a reporter's recording is very likely *already* safe on their own phone regardless of what our app does with it, since tapping "Take Video" opens the phone's native camera app, which saves to the Camera Roll/Gallery as a side effect of that native capture flow, independent of our upload succeeding. This is standard iOS/Android behavior, not something built or verified in this codebase — worth having the testers confirm for themselves on their own devices rather than taking it purely on faith.

**Built: a real processing-time limit, checked proactively instead of discovered by timing out.** Prompted by Nick wanting to (a) account for not knowing a tester's camera resolution, (b) give reporters a clear path forward instead of a silent trap when a clip is too big, and (c) keep the limit easy to adjust later — including per-tier, if this becomes a paid product with e.g. a 10-minute free tier and a 30-minute paid one.

- Drive reports a file's real size (always) and video duration (when the file actually has a video stream) the moment it finishes uploading — we just weren't capturing it. `Asset` gained `fileSizeBytes` (new column) alongside the already-existing but previously-unused `duration` (seconds); both get populated at finalize time regardless of outcome, via new `getFileStats()` in `google-drive.ts`.
- New `src/lib/assets/processing-limits.ts` is the single place that answers "will this fit" — deliberately separate from Vercel's hard 300s ceiling (`maxDuration`, fixed, invisible to users, same for everyone) vs. this **softer, product-level number we choose to sell/allow** (`MAX_ESTIMATED_PROCESSING_SECONDS = 260`, picked so a 10-minute video clears with real margin while 15+ minutes gets rejected — see the worked table below). This is the one constant to change for a future paid tier; everything else in the pipeline is agnostic to what the limit actually is.
- `finalizeMediaUpload` now checks the estimate *before* committing to transcribe — if it's predicted to exceed the limit, the asset goes straight to `ERROR` with an immediate, specific, actionable message (*"too long/large to process automatically right now... tap Share to grab the original, or trim it and try again"*) instead of silently timing out 4+ minutes later with nothing to show for it. Because `sourceFile` is set either way, Share works immediately in this case too (see above).
- Calibration is honest about its limits: built from exactly two real data points (Travis's real video, and a synthetic long clip), padded modestly for safety margin, documented inline as due for recalibration once more real field data comes in — not presented as more precise than it is.

**Verified, not just typechecked:** ran the real chunked-upload pipeline locally three times — once normally (confirms `fileSizeBytes`/`duration` now populate and the happy path is unaffected), and once with the threshold temporarily forced absurdly low to confirm the rejection branch actually fires correctly (immediate `ERROR`, correct message, no wasted AssemblyAI/Claude calls, `sourceFile` still set) before restoring the real value. Also checked the calibrated numbers against a table of hypothetical clip lengths at Travis's video's real bitrate:

| Length | Est. size | Estimated time | Outcome |
|---|---|---|---|
| Travis's real clip (2:56) | 274.7MB | 78s | allowed (matches reality — it worked once given time) |
| 10 min | ~936MB | 218s | allowed, ~16% margin |
| 15 min | ~1.4GB | 317s | rejected |
| 20 min | ~1.9GB | 422s | rejected |
| 60 min | ~5.6GB | 1,207s | rejected |

**Nick passed the ~10-minute video guideline on to both testers (2026-10-01)** — Travis and the second (Android) tester are now field-testing with that real parameter in hand, backed by the enforced limit above rather than just a note.

## Status as of 2026-09-28 (end of day) — ready to hand off to the two testers

**Confirmed working on Nick's actual iPhone**, not just locally: a 12-second and the previously-failing 53-second/52.4MB video both uploaded successfully through the chunked-relay fix, transcribed, and exported correctly. This is the first real-device confirmation of the whole capture → transcribe → export chain since deployment, and it's the green light to bring in the two freelance testers.

**Before sending the link out**, the two open capture-UX questions from earlier today (see above: the Audio/Video merge, and whether radio-then-picker is one tap too many) are exactly what this testing round should surface — worth explicitly asking the testers about both rather than waiting to see if they mention it unprompted.

**Added: native share sheet for an asset's original file.** Viewing an asset only offered "Drive file: open," which drops into Google Drive's own web UI — real friction for something like texting a clip to an editor. New `ShareFileButton` (`src/components/share-file-button.tsx`) uses the Web Share API to open the phone's native share sheet (AirDrop/Messages/Mail/Save to Files/etc.) directly with the file, fed by a new `GET /api/assets/[id]/file` route that streams the original bytes back from Drive. Renders nothing on desktop (Web Share's file support is mobile-only), leaving "Drive file: open" as the fallback there — verified locally that the button correctly disappears on desktop.

Caught and fixed one real bug while testing this against Nick's actual recordings rather than a synthetic file: an iOS-default filename like `"9-17-26, 8-06 PM.wav"` uses a narrow no-break space character that isn't valid in a raw `Content-Disposition` header — was crashing the route with a 500 for basically every phone-recorded file. Fixed with proper RFC 5987 encoding (an ASCII-sanitized fallback filename plus the real UTF-8 name). Verified against that exact real file locally (200 OK, correct WAV content, correct filename both ways).

**Second real bug, caught on Nick's phone:** tapping Share threw "not allowed by the user agent... possibly because the user denied permission" — nobody denied anything; this is Safari's strict rule that `navigator.share()` only works when called synchronously within a user gesture, with zero `await` beforehand. Fetching the file is necessarily async, so the original one-tap design could never have worked on Safari specifically (Android Chrome is more lenient about this, which is presumably why it wasn't caught until the iPhone tester — well, until Nick's own iPhone). **Fixed 2026-09-28, confirmed working on Nick's phone:** two-tap flow — first tap fetches and prepares the file (button reads "Preparing…" then "Tap to share"), second tap calls `navigator.share()` as the first synchronous statement in that click's handler, preserving the gesture. The "Preparing…" step is naturally slower for large video files — expected, not a bug (same size-dependent wait as upload).

**Ready to hand off to the two testers, for real this time** — capture, transcription, export, and native sharing have all now been confirmed on a real device.

**Added: delete a project.** There was previously no way to remove a project at all — Nick wanted to clear out accumulated test/junk projects before testers saw the home page. New `DELETE /api/projects/[id]` (cascading delete of its assets/transcripts/flagged quotes/social posts, wrapped in a transaction) plus a "Delete" button (`src/components/delete-project-button.tsx`, with a native `confirm()` before it does anything) on both the home page project rows and the project detail page. Deliberately only removes app/database rows, not the underlying files in Drive — "clear the list," not "destroy the archive." Verified locally (empty project and a 3-asset project both deleted cleanly, no FK errors); used it to clear out this session's own test-run projects from the shared database, left Nick's own older test projects ("Nick Test 1," "Coach Miller - Test 09212026") for him to remove himself now that the button exists.

**Added: rename a project from the home page.** Prompted by "Coach Miller - Test 09212026" actually now holding a Bob Kendrick/Negro Leagues Museum interview — the recorded name had gone stale. The `PATCH /api/projects/[id]` route already accepted a `name` field (used internally for pre-event details), it just wasn't exposed anywhere for renaming after the fact. New `ProjectRowHeader` (`src/components/project-row-header.tsx`) replaces the plain name/asset-count row on the home page with an inline "Rename" control — click it, edit in place, Save/Cancel — while the name itself stays a link into the project. Verified locally end-to-end (renamed the real "Coach Miller" project to a test value, confirmed it saved and displayed correctly, then renamed it back so the actual correction is Nick's to make with his own wording). Same "Rename" control added to the project detail page's title too (`src/components/editable-project-title.tsx`), next to Export/Delete, since that's naturally where Nick tried it first. (One false alarm along the way: Nick briefly didn't see the home page version either — turned out to be a stale cached tab, not a real bug; a fresh tab showed it fine.)

## Status as of 2026-09-28 — deployed and live

**The Vercel deployment is done and working end-to-end.** Root cause of the earlier stuck/failed deploys turned out to be a bulk-paste of environment variables that silently saved several as empty: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ASSEMBLYAI_API_KEY`, and eventually `SITE_PASSPHRASE` too (found last, once login itself started rejecting the correct phrase). All were re-entered fresh from their sources and the deploy succeeded. Two other real fixes along the way, both now committed:
- `package.json` needed `"postinstall": "prisma generate"` — Vercel's fresh installs never generated the Prisma client otherwise, causing TypeScript build failures.
- Vercel's `DATABASE_URL` has to be Supabase's **Transaction pooler** connection string (`aws-0-<region>.pooler.supabase.com:6543`, username `postgres.<project-ref>`), not the direct connection (`db.<ref>.supabase.co:5432`) — the direct connection is IPv6-only and unreachable from Vercel's serverless functions (`P1001` / `DriverAdapterError: DatabaseNotReachable`). Local dev keeps using the direct connection unchanged; only Vercel's copy changed.
- Also added the missing production redirect URI (`https://reporter-multitool.vercel.app/api/auth/google/callback`) to the Google OAuth client's authorized redirect URIs — it only had the localhost one.

Since Vercel's `DATABASE_URL` points at the same Supabase database as local dev, Nick's existing Drive connection and test projects were already there on first login — no separate "connect Drive on production" step was actually needed.

**Quick-capture UI got a real-device pass on the live site**, surfacing two things worth testing with the two freelance testers rather than guessing at:
1. **The native file picker has no audio-recording option on iOS.** Selecting "Audio" and tapping the file field only offers Photo Library / Take Video / Choose File — there's no OS-level "record audio" hook exposed to web file inputs the way there is for camera capture. This means the "capture gap" resolution above (item 1, "ordinary upload flow already launches the phone's native camera/mic app") **only actually held for video, not audio.** **Built 2026-09-28:** Audio and Video radios collapsed into one "Audio/Video" option (`src/components/upload-asset-form.tsx`) — one picker, accepting both `video/*` and `audio/*` so a reporter can still pick an already-recorded voice memo from Files via "Choose File," while "Take Video" covers live recording (its audio track serves audio-only needs like interviews too). `AssetType` (AUDIO vs VIDEO) is now inferred from the picked file's actual MIME type at submit time rather than from a preselected radio — backend (`createAssetFromFormData`) was already type-agnostic between the two (`handleMediaUpload` treats them identically), so no backend change was needed. Typechecked and verified locally; not yet tested on a real device. Still explicitly a question for the testers: does the video-recorder-doubles-as-audio-recorder idea feel natural, or confusing?
2. **Whether radio-select-then-open-picker is one step too many.** Candidate simplification: one big button per type (Audio/Video, Document, Note) that immediately opens its picker/note field on first tap, instead of select-a-radio-then-tap-a-separate-field. Also not yet built — ask the testers whether the current two-tap flow actually bothers them in the field before changing it.

Also shipped: the file-picker field itself was restyled from the tiny default "Choose File / no file selected" browser text into a large, clearly-labeled dashed tap target reading "Create or Select New File" (shows the picked filename once chosen), with more visual separation from the "Upload" button — this was a real mis-tap complaint from live-device testing, not speculative.

**Found and fixed 2026-09-28: real video uploads failed on Vercel.** Nick's first real-device test — a 53-second, 52.4MB `.mov` from his Photo Library — failed with a generic "Upload failed." Root cause: Vercel's serverless functions hard-cap request bodies at roughly 4.5MB, a platform limit that applies on every plan and isn't specific to this app (most serverless hosts have something similar) — any real phone video was always going to exceed it, even though local dev (no such limit) and the earlier synthetic test clip (audio-only, tiny) never surfaced it.

**First fix attempt (direct-to-Drive) didn't survive contact with a real browser.** The plan was to have the browser `PUT` the file straight to a Drive resumable-upload session, bypassing our server for the bytes entirely. This worked flawlessly with `curl` locally (full round trip: init → PUT → finalize → transcription → `READY`) — but `curl` doesn't enforce CORS. Nick's real-device test on Vercel came back with Safari's "Load Failed," and reproducing the exact same cross-origin `PUT` from this session's own browser tool against the real Drive endpoint confirmed it: `TypeError: Failed to fetch`. **Google's Drive API does not allow a browser to `PUT` to `googleapis.com` cross-origin.** That assumption was flagged as unverified before Nick tested it, and it turned out to be wrong — worth remembering if a similar "the API probably supports CORS" assumption comes up again.

**Actual fix: chunked upload relayed through our own server.** Same init/finalize shape as before, but the file's bytes now go browser → our server → Drive in pieces, instead of browser → Drive directly:
- `POST /api/quick-capture/init` or `POST /api/projects/[id]/assets/init` — unchanged: small JSON request (filename + MIME type) creates the `Asset` row and a Drive resumable-upload session server-to-server (no CORS issue there — this call was never made by the browser). `AssetType` (AUDIO vs VIDEO) is inferred from the MIME type. `createResumableUploadSession()` lives in `src/lib/storage/google-drive.ts` (a raw REST call — the `googleapis` client library doesn't expose "just give me the session URL").
- New: `POST /api/uploads/chunk` — the browser sends the file in 4MB pieces (a multiple of the 256KB Google's resumable protocol requires for non-final chunks, safely under Vercel's ~4.5MB request-body cap) to this same-origin route, which relays each one to the Drive session URL with the right `Content-Range` header and passes Google's response (`308 Resume Incomplete` mid-upload, `200`/`201` with the file's Drive ID on the last chunk) straight back. Validates the upload URL actually targets `googleapis.com/upload/drive` before relaying, so this can't become an open proxy to arbitrary URLs.
- `POST /api/assets/[id]/finalize` — unchanged: records the resulting Drive file ID and kicks off transcription via `after()`.
- Transcription downloads the file back from Drive first (`downloadFile()` in `google-drive.ts`, feeding `downloadAndProcessTranscription()` in `src/lib/transcription/process.ts`) since the bytes never passed through our server as one piece on the way in — this download is server-to-Google, not client-to-Vercel, so it isn't subject to the request-body limit either.
- Notes and Documents are untouched — both are small enough that the original single-request upload is fine; only Audio/Video use the chunked path.

**Verified end-to-end locally, including the multi-chunk case** — a real browser `fetch()` loop (not `curl`) against the local server, using a 6MB test payload that forced two chunks: first chunk correctly got `308`, second got `200` with a real Drive file ID, finalize succeeded. Also re-confirmed the original single-chunk (small file) path still works. Not yet tested on a real device/Vercel — that's the next step.

**Working end-to-end, tested with real recordings:**
- Google OAuth + Drive connection (one connected account, app-created "Reporter Multi-Tool" folder)
- Project creation + browsing (home page)
- File upload → pushed to Drive → `Asset` row created
- AssemblyAI transcription, auto-triggered after upload, with speaker-labeled turns displayed
- Claude API pipeline: quote flagging (however many the transcript actually supports, not a forced 3-6) then social post generation (one draft per platform — Twitter/X, Instagram, Facebook — but only for quotes scoring ≥70/100 on predicted audience engagement, see `src/lib/ai/scoring.ts`), both following AP Style. Runs automatically right after transcription. New `GENERATING` asset status covers this step. Verified against a real transcript. Engagement scoring added 2026-09-21 after Nick found the original fixed-count version produced too many posts for short clips — every quote is still saved/shown regardless of score, only post generation is filtered.
- **VIDEO asset type confirmed working**, not just AUDIO — uploaded a real `.mp4` container through the full pipeline (Drive upload → AssemblyAI transcription → quotes → social posts), all correctly tagged `type: VIDEO`. Caveat: the test file had only an audio track (no picture) since no video-generation tool was available for testing — doesn't matter functionally since nothing in this app touches pixel data yet (no thumbnails/preview), but worth knowing this wasn't a real camera-recorded video file.
- **Per-asset export**, satisfying the confirmed requirement above (transcript + flagged quotes + social post drafts, not transcript-only) — downloads as one `.md` file via an "Export" link once an asset is `READY`. Verified against a real asset.
- **Whole-project export** — bundles every asset in a project into one `.md` file via an "Export whole project" link, shown whenever a project has at least one asset. Verified against Nick's real multi-asset "Nick Test 1" project.
- **Notes and Documents as new Asset types** — pure reference material, no transcription or AI processing (deliberate — see "Explicitly deferred" below re: document summarization). NOTE saves typed/dictated text to Drive as `.txt` plus a `Transcript` row for display/export reuse; DOCUMENT uploads photos/PDFs to Drive like audio/video but skips the pipeline. Both go straight to `READY`. Upload form now offers all four types. Export is type-aware (Notes show their text, Documents show a Drive link, no misleading "not yet" placeholders). Verified end-to-end.
- **Quick capture + optional pre-event project fields** — a "+" button (fixed in the root layout, always visible) links to `/capture`, which uploads via `POST /api/quick-capture`: no project needs to exist first, a default-named project ("Quick Capture — <date>") is created on the fly, and the reporter lands on it afterward to rename or add details. Separately, projects gained optional `notes`/`eventDate`/`venue` fields, editable anytime via an "Add details"/"Edit details" toggle on the project page. Upload logic was extracted into `src/lib/assets/create-asset.ts` so the per-project route and quick-capture share it. Verified end-to-end (quick note capture → auto-created project → redirect → added details afterward).

- **Beat tagging** — reuses the existing `tags` field on `Project` (no schema change). Editable via a "Beat / tags" field in `ProjectDetailsForm` (comma-separated); renders as clickable badges (`TagBadges` component) linking to `/?tag=X`, which filters the home page's project list. This is the plan's "retrieval across time" mechanism — tag every game for one team or every meeting for one city, click the tag later to see them all. Verified end-to-end with two differently-tagged test projects. Relevant to one of the Product Plan's open questions ("is beat a tag or a real container above projects?") — built as the simple tag version; revisit only if a flat tag + filter turns out to not be enough in practice.

**Resolved on 2026-09-24 (see Product Plan):**
1. **The capture gap** — resolved as a deliberate no, not an oversight. In-app camera/mic recording (browser `MediaRecorder`) will not be built: the ordinary upload flow already launches the phone's native camera/mic app through the OS file picker, which is faster and higher quality than a custom in-app recorder would be. Revisit only if testers report the upload-picker path is actually too slow/clunky in real field use (this is now an explicit open question in the Product Plan).

**Still open — not addressed by the Product Plan, needs a decision:**
2. **Social posts may be arriving too early.** The pipeline (transcribe → flag quotes → generate posts) still runs automatically and immediately with no human checkpoint. Nick's instinct from 2026-09-22 was that this might need to become a more deliberate, stepped process — review transcript/quotes first, then explicitly trigger post generation. The 2026-09-24 Product Plan's workflow diagram bundles "transcript · quotes · posts" as one uninterrupted "Post-event (v1)" stage, so this question wasn't resolved one way or the other — worth explicitly deciding rather than assuming it's settled.
3. **Is Google Drive as the canonical store more infrastructure than v1 actually needs?** Raised 2026-09-28 by Nick after noticing Rode Capture (a dedicated recording app, no processing on top) just saves straight to the phone's camera roll — no cloud round-trip at all. Worth remembering: a chunk of today's real work (the Vercel body-size limit, the CORS dead-end, the chunked-relay fix) only exists *because* the app treats Drive as the file's home and routes every upload through it. That said, this app isn't just a recorder — the AI pipeline needs server-side access to the bytes, and a shared archive across multiple reporters/testers needs to live somewhere other than any one person's phone, so cloud storage of some kind is probably still necessary; the real question is more "is Drive specifically the right backend, and does the upload have to be synchronous/blocking the way it is now" rather than "should there be cloud storage at all." Explicitly flagged by Nick as a post-V1-testing conversation, not a now decision — don't act on this without revisiting it with him first.

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
- **Document/note summarization** (AI-generated summary or bullet-point themes from an uploaded document, the way Nick already does this in a Claude chat) — raised by Nick while scoping Notes/Documents (2026-09-24), deliberately deferred: tester feedback validated documents as reference material, not AI-summarized material, and real-world documents will often be phone photos needing OCR, not clean text — a bigger lift than "add a file type." Revisit once documents-as-reference-material has been used for a while and there's a concrete want, not before. Notes and Documents ship this round as pure storage: no transcription, no AI processing, just saved and shown alongside the recording.
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
