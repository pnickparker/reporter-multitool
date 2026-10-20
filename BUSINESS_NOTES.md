# Business Notes: Selling Reporter Multi-Tool

Notes from a Sept. 30, 2026 conversation about turning this into a paid product. None of this blocks the current tester build. Use it as the checklist for when it's time to sell.

These notes aren't legal advice. Confirm the Anthropic, Google, AssemblyAI and Vercel terms when the time comes, because they change.

## Business setup

- Nick plans a **separate LLC** for the software business (for liability, and to keep its books apart from Fredrick Reed LLC). Customer contracts, the Vercel/Anthropic/AssemblyAI/Google accounts, and billing should all belong to that LLC.
- Needed: terms of service, a privacy policy and customer contract templates. Pay a lawyer once for templates you can reuse.
- Sales tax on software/SaaS varies by state. Check before taking payment.

## Entity decision: separate LLC vs. a DBA under Fredrick Reed LLC (added 2026-10-20)

Not legal or tax advice. Confirm with a Missouri attorney and a CPA before filing.

**Leaning: a separate LLC, with DBAs as the brand layer on top.** A DBA is only a trade name: the product would still be Fredrick Reed LLC, with the same assets and liabilities.

Why separate:
- **Liability wall.** A misquote complaint, recording-consent dispute or data breach reaches only the new LLC. Under a DBA it could reach everything in Fredrick Reed LLC, including the BLOX production work.
- **BLOX separation.** Separate contracts, bank accounts and vendor accounts make the "keep vendor work and product apart" point (see "Exit thinking") provable.
- **Cleaner sale.** An acquirer buys the LLC or its assets with one clear IP story, not a carve-out from an entity that also does other work.
- **Room for others.** A partner, advisor equity or investor can be added without touching Fredrick Reed LLC.

Costs and cautions:
- Needs an operating agreement, EIN, bank account and registered agent. Commingling money or skipping paperwork can let a court ignore the liability wall.
- Code and brand created so far must be moved into the new LLC with a written assignment.
- An LLC doesn't cover personal guarantees or your own negligence, and it doesn't replace insurance.
- Missouri filing: web search results (not verified on the Secretary of State's site) put Articles of Organization at about $50 online / $105 on paper, with no annual report for LLCs. A registered agent is still required.

**Brand layer:** the LLC gets a neutral name. Mobile News Bureau and future tools operate as DBAs under it, so a product can be renamed without re-papering contracts. One LLC for the whole family of tools (this app, election tracker, sports tool) is a reasonable middle ground versus one LLC per product.

**Questions for the attorney and CPA:**
- Should the new LLC be owned by Nick directly (sister company) or by Fredrick Reed LLC (subsidiary)? Sister separates liability and a sale better. The CPA should weigh in on tax, including how it fits Fredrick Reed LLC's tax status.
- How do we assign the existing code and brand into the new LLC?
- One LLC for all the tools, or does the election tracker's service work warrant its own?
- Does Missouri allow anything like a series LLC, and would it help here?

**Timing:** flexible while testers use it free. LLC, insurance and customer paperwork should all be in place before the first dollar and before the association step makes this public.

## Insurance research leads (added 2026-10-20)

Initial web search only. Most sources are brokers selling policies, so treat prices and claims as marketing until a quote says otherwise. Compare actual policy wording, exclusions and sublimits.

**Coverage to ask about**
- **Tech E&O:** customer lawsuits alleging a mistake in the software cost them money. Likely the closest fit for a bad transcript or a wrong quote score.
- **Cyber liability:** the company's own costs after a breach (notification, legal, data recovery). Matters because the app holds recordings, transcripts and Drive tokens.
- **Media liability:** defamation, libel and copyright claims. Relevant because the app produces quotes and social posts from interviews. Standard general liability typically excludes defamation from published content, per CJR.
- **General liability:** common baseline, but not a substitute for the above.
- Software clients often ask for a certificate of insurance before work begins.
- Ask whether the policy treats a software bug as one claim under both E&O and cyber, and how limits are sized for that.

**Places to start**
- [Embroker](https://www.embroker.com/) — startup-focused broker; packages that can include tech E&O and cyber.
- [Tech Insurance (Tech Insurance Services)](https://www.techinsurance.com/) — tech-specific broker; has a [tech E&O vs. cyber comparison](https://www.techinsurance.com/small-business-insurance/compare/tech-errors-omissions-vs-cyber-liability).
- [Zensurance](https://www.zensurance.com/media-liability-insurance) — small-business broker with media liability coverage.
- [Beazley media liability for SME publishers](https://www.businessinsurance.com/beazley-launches-media-policy-for-small-medium-firms/) — a carrier policy launched June 2020 with optional tech E&O and information security add-ons. Check current terms and availability.
- [LION Publishers on media liability insurance](https://lionpublishers.com/media-liability-insurance-for-lion-publishers-members/) — members get a discount through broker Acrisure. Check whether Link 2 Lee's Summit or Nick qualifies as a member. If so, ask whether it can be extended to the software LLC.
- [CJR on journalist liability insurance](https://cjr.org/business_of_news/journalist-liability-insurance-freelance.php) — background; names Axis Pro and Hiscox as carriers that write some independent journalist policies. Warns general brokers often can't place media risk.
- [NerdWallet startup insurance guide](https://www.nerdwallet.com/business/insurance/learn/business-insurance-for-startups) — overview and provider comparison. A broker-sourced guide it draws on names The Hartford, ERGO NEXT and biBerk as providers to compare.

**What to bring to a quote call:** the LLC (or its planned name), what the software does (records interviews, transcribes, scores quotes, drafts social posts, stores files in the customer's Drive), who the customers are (reporters, small newsrooms), expected customer count and revenue, and how the human-review safeguard against misquotes works (an underwriter may ask).

## Ownership and AI terms

- Anthropic's consumer and commercial terms both assign any rights in outputs to the user. Anthropic claims no ownership of code Claude Code writes.
- US copyright generally needs human authorship, so code that is purely AI-written may not be copyrightable. Real protection comes from the running product, customers, brand and contracts. Keep git history as a record of human direction.
- The app calls Claude at runtime, so it needs an **API account under the commercial terms**, not a Pro/Max subscription. The API account should belong to the new LLC.
- Don't use "Claude" or "Anthropic" in the product name or branding.
- Check that dependency licenses stay permissive (MIT/Apache). Watch for GPL/AGPL.

## Before a paying customer can use it

- [ ] **Real accounts.** `getCurrentUser()` is still a placeholder. Each customer's data must be strictly separated from every other customer's.
- [ ] **Encrypt the Drive OAuth tokens.** They're stored as plain text in `GoogleDriveConnection`.
- [ ] **Google OAuth verification.** Letting the public connect their Drive needs Google's review. *(Update 2026-10-14: we only use the `drive.file` scope, which Google lists as non-sensitive — basic verification, not the paid security assessment the next sentence describes. See STORAGE_DESIGN.md.)* Broad Drive permissions can require a paid third-party security assessment (weeks of lead time). The `drive.file` permission (only files the app creates) keeps this much lighter. Decide the permission early.
- [ ] **Cost per user.** Each upload costs AssemblyAI minutes plus Claude calls. Work out the cost of a typical 30-minute interview before setting prices (the brief suggested $15–25/mo), and put limits on each tier.
- [ ] **Privacy policy lists processors.** AssemblyAI, Anthropic, Google, Vercel and Supabase. Reporters will ask whether recordings of sources are used for training. Neither vendor trains on API data by default, but confirm before promising it.
- [ ] **Recording consent.** Terms should make consent the user's responsibility. Missouri only needs one party's consent, but some states need everyone's.
- [ ] **Misquote protection.** Flagged quotes and generated social posts must match the transcript word for word. Keep a human approving before anything is published.
- [ ] Vercel Pro (already chosen) covers business use. Hobby does not.

## Market position

- Crowded space: Otter, Descript, Trint, Riverside. Don't compete on transcription.
- The edge is ready-made newsroom workflows (NewsLink, meeting coverage, Fredcasts) and being built by a working local newsroom. Pitch: "built by a local newsroom, for local newsrooms."
- Target customers: independent local newsrooms. LION Publishers (Local Independent Online News) is the obvious channel, and "Link 2 Lee's Summit uses this" is the proof.
- Realistic scale: a solid side business, not venture-scale, unless it breaks out beyond newsrooms.
- Sports coverage is planned as a v1.5 feature here, but a separate sports + coach-input tool is also in progress (on the Mac Studio as of Sept. 30, 2026). Decide whether it's a module of this app or its own product.

## Suggested order across products

1. Election tracker, sold as a service, first (clear value, April 2027 deadline).
2. This app, once accounts and security are done.
3. Sports tool.

## Exit thinking: build-to-sell-a-little, then acquired (added 2026-10-01)

Nick's actual mental model, said out loud for the first time in this conversation: build this, get it into real use at a handful of newsrooms, and the realistic endgame is a larger newsroom-tech vendor acquiring it to fold into their own product line — not scaling it into a standalone SaaS business with hundreds of self-serve customers. BLOX Digital (TownNews) is the specific company he's had in the back of his mind, likely because Link 2 Lee's Summit is already a BLOX customer.

**How this reshuffles the "before a paying customer" checklist above, not replaces it:**
- An acquirer re-platforms onto their own infrastructure regardless of what this runs on today — so there's little reason to prematurely over-build storage/hosting for "enterprise scale" before there's real traction. The Google Drive choice stays fine under this plan; it's not a liability to clean up before a sale conversation.
- What due diligence *does* scrutinize: real per-customer data isolation (not everyone sharing one Drive account — already item 1 above), clean IP/ownership story (already covered above), recording consent, and the misquote-protection human-review safeguard. Those items don't get less important under this plan — if anything, they're the credibility signals that matter more than infrastructure polish.
- The full self-serve SaaS buildout (public Google OAuth verification, billing/tiers, a signup page) may not be necessary at all if customers are onboarded by hand in small numbers rather than through self-service — worth deciding deliberately rather than defaulting to building it.

**Follow-up (2026-10-01, same day): the BLOX relationship is real, not speculative.** Nick has been a paid BLOX vendor for years (produced and hosted their News Nirvana podcast, produced/edited a mini-documentary for them), is in active talks with them now about more work (expanding the "BLOX Embedded" documentary series), is a BLOX CMS customer, and — the big one — one of his closest friends is BLOX's COO. This substantially answers questions 1 and 2 below: the catalyst isn't "hope they notice," it's an existing warm relationship and distribution channel most founders don't have, and BLOX isn't just the familiar choice, it's a genuinely well-positioned one.

Nick also clarified "sell it a little bit": not an attempt at a real self-serve SaaS business (he's explicit that he doesn't have the capacity or sales skillset for that), but proving the concept with real revenue from real reporters/newsrooms specifically as the thing that either draws attention or gives him something concrete to pitch with. This answers question 5 below in the direction of "don't build toward broad self-serve SaaS" — the full checklist item above (public Google OAuth verification, billing/tiers, signup flow) likely isn't needed at all if the real path is a small number of hand-onboarded newsrooms building toward a direct pitch, not an open-signup product.

**New consideration this raises, worth flagging rather than ignoring:** Nick is simultaneously (a) a paid BLOX vendor doing production work for them and (b) building a product on the side that BLOX could end up buying. Worth keeping those two things cleanly separated — don't build or develop this tool using time, resources, or contracts tied to the BLOX production work, so there's never a question later about what BLOX might already have a claim to. Cheap to get right now by just being deliberate about it; could be expensive to untangle later. Git history already serves as a timestamped, independent record of when this started, which helps here too.

**Decided (2026-10-01): staying quiet to BLOX — the friend COO and his direct working contact there — for now, deliberately.** Nick has told neither of them about this project or the sports/coach-input tool, specifically to avoid the IP/conflict-of-interest blur above. He's explicit this is a tightrope, not a risk-free choice. The real risk flagged back to him: the window to be the one who raises it himself shrinks as this gets more real — once there's revenue from multiple newsrooms, the odds BLOX hears about it secondhand (small local-news-tech world, LION Publishers, word of mouth) go up, and that lands worse than hearing it from Nick directly. Worth having a rough personal trigger for when silence should end, even though today isn't that day.

**Go-to-market sequence (2026-10-01):**
1. A short list of warm prospects first: small news publishers like Link 2 Lee's Summit, and industry friends — aiming for a few paying users. No exact number set yet; worth picking even a rough one (3-5?) so the threshold is recognizable rather than indefinite.
2. Then, if/when it's going well: Missouri Press Association, the Local Media Association (LMA), and a few news-media consultants Nick has ties to. This step is a real visibility jump, not just "more of the same" — trade associations mean word travels fast among exactly the target market.
3. **Talking to the associations is the trigger to finally tell the BLOX friend/COO**, before he could plausibly hear about it secondhand. Deliberately sequenced so BLOX hears it from Nick first.

Because step 2 is effectively Nick's public demo moment (not a quiet pilot anymore), the product needs to be solid *before* that step, not just "good enough for two friendly testers" — reliability bugs (like the first-week stuck-video issue from today) are fine to hit quietly now and would land much worse in front of an industry audience.

**Still genuinely open:** the exact number/revenue/timeframe for "enough" at step 1 before moving to step 2 — and the realistic outcome size even with a strong relationship (a close friendship changes the conversation, not what the product itself is actually worth — worth staying honest about that).

## Timeline and decision checkpoints (added 2026-10-01)

Nick is new to running a software business and correctly flagged that the open numbers above ("how many clients is enough," "what revenue before approaching associations") aren't things to guess at — they need actual research. This section is the timeline for *when* to go find those answers, not the answers themselves. Revisit and fill in as research happens; don't treat the placeholder numbers below as decided.

| Phase | What's happening | Checkpoint question | How to actually answer it (not a guess) |
|---|---|---|---|
| **Now — field testing** | Two freelance testers (one on Android), v1 build, real field use | Is the core workflow reliable enough to charge anyone money for it? | Direct tester feedback, not a timer. Don't move on until bug reports taper off to normal-use-level, not "surprising failure" level (the first-week stuck-video bug was the surprising kind — fixed; watch for more of that kind). |
| **Warm prospects** | Small publishers Nick knows personally, industry friends | How many paying clients, at what price, is "enough" to feel ready for association-level visibility? | This is a real unknown — research it rather than pick a number out of the air. Concrete ways to find out: ask the news-media consultants Nick already has ties to how they'd evaluate readiness; ask Mo Press/LMA contacts informally (before pitching) what proof points they'd actually want to see from a tool before recommending it to members; look at how comparable tools (Trint, Descript, Otter, or smaller newsroom-specific tools) built early credibility before wider launches. |
| **Associations** | Mo Press Assoc., LMA, consultants | Is the product/support actually ready for an audience that can amplify fast, not just a few friendly users? | Stress-test against the real usage patterns that come up during the warm-prospect phase (longer interviews than expected, different phone models, spottier field connectivity) rather than assuming the current tester feedback already covers it. |
| **BLOX conversation** | Triggered by reaching the associations step | Is this a pitch, a pilot offer, or just "wanted you to hear it from me first"? | Not a research question — a personal/relationship judgment call Nick is better positioned to make in the moment than to pre-script now. |

**Progress log:**
- **2026-10-08 — first value signal from the field-testing phase.** Michael, one of the two testers, said he really likes the viral scoring and suggested quotes and that having them pre-pulled makes his writing time more efficient. Worth noticing *which* feature earned the praise: quote surfacing and scoring, the newsroom-workflow layer, not raw transcription — consistent with the market-position note above that the edge isn't transcription. Usage so far is real (24 assets, ~10 projects, mostly sports audio). Value looks promising; reliability is not yet proven at the standard the "associations" checkpoint needs, since the timeout fixes were still unpushed as of this date (see V1_SCOPE.md).

- **2026-10-10 — a trust-critical gap found in the capture flow, and fixed.** A phone video upload failed mid-way and the app offered no way to retry; Nick also confirmed on his iPhone that photos taken through the in-app camera are *not* saved to the camera roll. His reaction is the product principle to keep: *"When your job is to report the news, you really can't lose the recording."* A reporter who loses one interview once will not trust the app again, so data-loss paths are treated as launch blockers, not polish. Built the same day: failed uploads resume instead of restarting, every recording is copied into the phone's own storage until it has fully uploaded (survives a closed tab or reload), a one-tap "Save to phone", and the screen stays awake during uploads. Details in V1_SCOPE.md ("Upload resilience"). **Worth testing with real reporters:** poor-signal and phone-lock behavior on both iPhone and Android, since that is where this kind of problem actually shows up.

- **2026-10-11 — more positive tester signal, plus a usability trap found.** Cody: "I love the social media stuff and the quotes" (and likes the big capture button). Michael: "It's been helpful for me. I've been using it consistently," with written recommendations still to come. Same pattern as before — the quote surfacing and social-post drafts are what testers praise, which supports the market-position note that the workflow layer is the product, not transcription. The usability trap: a confusing Export/Share pair plus a download link that trapped a phone user in a file preview (details and fix in V1_SCOPE.md, "Tester feedback, 2026-10-10/11"). Lesson for pricing/onboarding: reporters in the field will not read; every button must say exactly what it hands over and none may strand them.

- **2026-10-12 — Michael's written feedback.** Strongest independent endorsement so far: "I love the ranking system of the quotes and giving scores. I agree with most of the scores." He uses it only for audio-to-quotes, and doesn't yet use the social posts. His requests (reliable speaker labels, real names instead of "Speaker A/B", a blank line between speakers) are all about the *transcript* being newsroom-ready; the stats/scorecard wish is a different product and is parked — though it matches Nick's original idea for a sports-reporter tool, and his answer is that the Notes feature already covers it: jot plays, stats and moments as notes in the same project as the post-game interviews. Real usage lesson: the dependable core for a working reporter is "upload audio, get ranked quotes," and its weak point is telling the voices apart on short clips (checked against the data in V1_SCOPE.md).

- **2026-10-14 — first real-world use of the new live version.** Within a day of release the testers created two projects and uploaded nine short MP3 interview clips (about 1–2.5 minutes, 1–2 MB each; one project a soccer game with two clips, the other a wrestling event with seven). **All nine processed to Ready with nothing stuck or failed**, each split into two speakers, each with 3–7 ranked quotes (post drafts on the three clips that had a strong enough quote). Usage shape worth noting: many quick clips per event, not one long interview. Both testers said they plan to use it for real coverage on Thursday evening — a real field test of the new version. Metadata only was checked; no recording content was read.

**How to use this table:** when a checkpoint question comes up for real (e.g., once there are a couple of paying warm-prospect clients and the association step starts feeling close), that's the trigger to go do the research in the third column — not to guess, and not to keep deferring indefinitely either.

## Naming (added 2026-10-09)

"Mobile News Bureau" is the working name (it comes from an inside joke with industry friends from Nick's 1990s reporting days). Nick keeps a handwritten brainstorm list: Deadline, On Deadline, Reporter Go, Beat Reporter, Butter Pen (a reference to Randy Quaid's "it writes like butter... actual butter coming out of my pen" line in *The Paper*), Journo, NewsContent, News Go, Mobile News Bureau, Mobile News Unit, Now Reporting, News Kit, News Producer. Favorites: Mobile News Bureau, Beat Reporter, Butter Pen, and News Kit (appealing because the monogram "NK" reads as "Nick").

Quick conflict check (a web search, not a trademark clearance — a lawyer or the USPTO database is the real check, and it belongs with the other legal setup above):
- **News Kit / NewsKit has real conflicts in the same industry:** News UK's open-source "NewsKit" design system (an npm package, https://www.npmjs.com/package/newskit) and a "NewsKit" Joomla template for news sites (https://www.joomshaper.com/joomla-templates/newskit). Same space, so search confusion now and a due-diligence flag for any acquirer later.
- **Mobile News Bureau:** no company or app by that name turned up. Descriptive names are weaker to protect, but fine at this stage.
- **Beat Reporter:** no app by that name turned up, but it's a common job title — hard to own and hard to search for. Better as a tagline ("for the beat reporter") than a name.
- **Butter Pen:** a fun nugget for old reporters and fans of the movie, but a name that needs explaining mostly lands with insiders, and Nick agrees it isn't right as the name. Better as an easter egg inside the app (idea: a "writes like butter" tag on very high-scoring quotes). (An earlier search missed the reference because it named the wrong actor.)
- **Deadline** collides with a very well-known news site, so it's a poor fit on its own.

Considerations: Nick has other tools (election tracker, sports tool), so a name that can become a family ("... Bureau") may be worth more than a one-off. Say each name aloud in a sentence a reporter would use, and check domain, social handles, and app stores before committing. An acquirer would likely rename anyway, so the name doesn't need to be perfect — it needs to be clear of conflicts and usable. **Decision timing:** keep Mobile News Bureau as the working name through testing; settle and clear the name before the association-level step (public visibility) in the timeline above, and certainly before charging anyone.

## Web app vs. wrapped app — clarified 2026-10-10

Nick had mixed the two up as the project moved along (he'd understood it as "test as a web app, then ship as a downloadable app," and wasn't sure that was still the plan). It is — with one correction: the downloadable app isn't a separate product, it's the *same* web app inside a thin native shell.

**The three options, plainly:**
1. **Web app (what testers use now).** A website opened in the phone's browser. Can be added to the home screen so it looks like an app. Updates reach everyone instantly. No store, no fees.
2. **Wrapped app (the planned "later" version).** The same code, packaged (e.g. with Capacitor) and sold through the App Store and Google Play. Same backend (Vercel, database, Drive) — nothing is rebuilt. Gains what a web page can't reliably do: save recordings to the camera roll automatically, keep uploading in the background, push notifications ("transcript is ready"), and (with extra native work) appear in the phone's share sheet so a video can be sent into the app from Photos. Costs: Apple developer account $99/year, Google Play $25 once, store review, and some days to a couple of weeks of work. Risk: Apple can reject apps that are just a website in a shell; having real native features (camera-roll saving, etc.) helps an app pass.
3. **Fully native rewrite (not planned).** Two codebases (iPhone and Android). Only worth it for something a wrapper can't do.

**Decision (unchanged, restated): stay web-first, wrap later, decide on evidence from testers** — not in advance and not at "launch time" by default. The camera-roll finding above is a reason to wrap *eventually*, not to switch now: for an irreplaceable interview the safe habit meanwhile is to record with the phone's own Camera app and then use Upload.

**Signals that should trigger building a wrapped TestFlight/beta app** (so far: a tester question on 2026-10-14 about recording with both cameras at once, as Rode Capture does — only a native app can do that; background audio recording and camera-roll saving are the others): testers lose or stall uploads in the field despite the safeguards; testers ask to send videos into the app from Photos; a customer or association asks for "an app in the store"; push notifications become wanted. Not a trigger: the wrapper being "more professional."

**Not fixed by wrapping:** per-customer accounts and data separation, pricing, and the storage question — those are the real gates to paying users either way (see "Before a paying customer can use it").

**Home-screen install for testers:** installing the *production* address on the home screen is fine and recommended. Do **not** have testers install a Vercel *preview* address: it can change or go stale, may require a Vercel login, and anything the app keeps on the phone (like a waiting recording) is stored per web address, so switching addresses later would strand it. Merge the new design into the main branch first, then have testers install the normal address. The app doesn't yet have an icon/manifest for a proper home-screen install (it would show a generic icon and open as a browser tab) — a small task to do before asking testers to install it.

## Long-form recordings — a stated goal (added 2026-10-11)

Nick wants the app to handle podcast-length interviews (40+ minutes and up). He's a podcast host and producer who records long-form conversations and says he'd find it very useful — which also makes him a real second kind of user beyond the quick-turn field reporter. Worth keeping in mind for positioning: short field clips and long-form interviews are different jobs with different costs (cost scales with recording length) and different willingness to pay.

**Why it matters commercially:** it's the obvious paid-tier boundary — short clips included in a base plan, long-form on a higher plan or credits — which fits the credits/tiers thinking in the pricing discussion. It also strengthens the case for researching cost per interview before setting any price.

**The rule that frames it (Nick):** capture can never be refused or lost; processing can wait. Reporters routinely plan a five-minute interview and end up with an hour, and "leave the interview and realize you used the wrong app" is the failure that ends trust. A saved-but-not-yet-transcribed recording is acceptable (not ideal); a recording the app wouldn't take, or lost, is not.

**Early-version approach (Nick, 2026-10-12):** a clear length limit like Adobe Podcast's (about 30 minutes, longer files must be split) is acceptable for now, because nobody knows yet how many other users want long-form. Evidence so far: no tester recording is anywhere near that — the largest tester files are 7–33 MB and a minute or two long; every large file in the system is one of Nick's own tests. So: don't build long-form engineering until real demand shows up; set the limit from measurement (see V1_SCOPE.md).

**Update 2026-10-12 night: it works further than expected.** A 35-minute, 3.6 GB interview processed in under three minutes, because transcription is very fast (~50x real time) and the time goes to moving the file. With the limit rebuilt from those measurements, the app now automatically handles roughly 40 minutes of 1080p video, ~25 minutes of 4K phone video, and ~1.5 hours of audio; longer or larger is saved with a clear note and can be tried with a button. That's a stronger answer than a flat 30-minute cap and costs nothing extra to offer — but it rests on one large measurement, so don't promise numbers to anyone until a long audio file has been tested too.

**Honest status (2026-10-13):** works within limits. About 40 minutes of 1080p video, ~25 minutes of 4K phone video and ~1.5 hours of audio process automatically (a 101-minute podcast took under 3 minutes); larger recordings are saved with a clear note and can be tried with **Transcribe now**. Beyond that — recordings that never fit in five minutes, or multi-gigabyte files — still needs the background-transcription and faster-storage work described in V1_SCOPE.md ("Goal: long-form recordings"). Don't promise numbers to anyone beyond what has been measured.

## Product focus — what we are and aren't building (Nick, 2026-10-14; draft wording, edit freely)

**The mission:** not a Swiss Army knife. A tool that does a few things right for one specific user — the working reporter — and works well *with* the other tools they already use. Nick's own first reaction to a feature idea was "yeah, let's add more fun tech toys!"; the reset came from asking what the tool is for. It also sharpens the pitch: *bring us whatever you recorded, with whatever you recorded it on, and we turn it into a transcript, ranked quotes and ready-to-use posts — safely.*

**What the core does (and must do right):** take in a recording from any source → transcribe it → find and score the quotable moments → draft posts → let the reporter check, name speakers, and take it out again — and **never lose a recording** along the way (see "Long-form recordings" for that rule).

**The test for a new idea (suggested):** (1) Does it make the transcript → quotes → share path better for a working reporter? (2) Could another tool already do it well, with us accepting its output? (3) Did real users ask — more than one tester, not just a "wouldn't that be cool"? (4) Does it risk the never-lose-a-recording rule? If it fails (1) or (2), the answer is usually "use the other tool, then upload it here."

**Polish counts (Nick, 2026-10-14):** the product is judged on how it *feels*, not only on what it does — a player that starts early and lurches back, or a button that does something slightly different from what it implies, makes the whole app feel cheap. Every interaction a reporter touches (tap a quote, share, retry) should do exactly what it says, with honest feedback while it works. Test on a real phone, with a real recording, before calling something done.

**How that has already played out (good material for the pitch):**
| Idea | Decision | Use instead |
|---|---|---|
| Record with both cameras at once (Rode Capture) | Not built — needs a native app, adds video polish not transcript value | Record in Rode Capture, then Upload |
| In-app audio recorder | Not built — phones' own recorders are more reliable | Voice Memos / the phone's recorder, then Upload |
| Record on the desktop | Parked, nobody asked | Upload a file |
| Word documents | Not built, guessed rare | PDFs, photos, notes |
| Sports scorecards and stats | Not built — a different product | Notes in the same project as the interviews |
| Editing transcript text | Not built — would drift from the audio and the quotes | Correct in the reporter's own writing tool; re-run speakers instead |
| Very long recordings | Handled up to a measured limit; the rest saved safely | Trim, or Transcribe now |
| **Speaker naming, re-run with a speaker count, honest progress, safe resumable uploads** | **Built** — they make the core path trustworthy | — |
| Accepting long audio/video from other sources | **Built** — the "works with your other tools" promise | Podcast tools, Rode, voice recorders, other cameras |

## Pricing and go-to-market prep (started 2026-10-14)

Nick: "I'm really at a loss to figure out how to price this" — partly because storage and AI-usage costs were unknown. Below is what is now *measured*, then the two question lists. Prices are as published in October 2026 and change; re-check before quoting anyone. Costs are small samples — treat as ranges.

### What it actually costs to process a recording (measured 2026-10-14)

**Transcription (AssemblyAI):** about **$0.15–0.21 per audio hour** depending on model, plus **$0.02/hr** for speaker labels (https://www.assemblyai.com/pricing.md) — roughly **$0.17–0.23/hr, or about 0.3–0.4 cents a minute**. Transcription speed is not a cost issue (a 35-minute interview took 42 seconds).

**AI steps (Claude):** two calls per recording — find and score the quotes, then write post drafts for the strong ones (the full transcript is sent both times). **The app currently uses `claude-opus-5` ($5 in / $25 out per million tokens) with no limit on thinking effort, and thinking tokens bill as output** — output tokens are most of the cost. Measured on real transcripts (token counts from the API's own usage report):
| Recording | Opus 5 (current) | Sonnet 5.5 ($2 / $10) | Haiku 5.5 ($0.10 / $0.50) |
|---|---|---|---|
| ~1-minute clip, 269 words (one AI call; no quote scored 70+) | ~$0.022 | ~$0.007 | ~$0.0005 |
| ~14-minute interview, 2,108 words (both calls) | ~$0.13–0.15 | ~$0.044–0.050 | ~$0.001–0.003 |
Run-to-run variation is real (the same transcript gave 8 or 9 quotes and 4 or 5 strong ones on Opus). Cheaper models also *behaved differently* — Haiku flagged fewer quotes and scored fewer as strong — so **a cheaper model needs a quality check on real transcripts (an eval against what Michael and Cody think is good) before switching.** Michael independently agreed with the current scores, so the current behaviour is a baseline to match.

**Model comparison on 30 real transcripts (2026-10-14; script `scripts/compare-models.mts`; total cost $2.88; results kept outside the repository because they hold transcript text).** Five setups on the same transcripts, including the current setup run twice to measure how much it disagrees with itself:
| Setup | AI cost per transcript (avg ~550 words) | Quotes found | Exact as spoken | Same words, some skipped | Words never said | Strong (70+) | Time |
|---|---|---|---|---|---|---|---|
| Opus 5, default (current) | $0.027 | 159 | 92% | 8% | **0%** | 40 | 9 s |
| Opus 5, again | $0.027 | 159 | 91% | 9% | 0% | 36 | 8 s |
| Opus 5.5, medium effort | **$0.019** (−31%) | 143 | **100%** | 0% | 0% | 37 | 6 s |
| Sonnet 5.5, medium effort | $0.008 (−72%) | 116 | 96% | 4% | 0% | **11** | 4 s |
| Haiku 5.5, medium effort | $0.0007 (−97%) | 110 | 98% | 2% | 0% | 20 | 5 s |
**Agreement on which quotes to pick:** the current setup agrees with *itself* on ~92–94% (the noise floor); Opus 5.5 finds 77% of its picks (87% of Opus 5.5's picks are in the current set); Sonnet 64% / 89%; Haiku 62% / 92%.
**What it says:** (1) **No setup ever put words in anyone's mouth** — every quote used only words that appear in the transcript. (2) **The current setup sometimes skips words inside a long quote** (8–9% of quotes: joining nearby sentences or dropping an interruption), which a reporter should be told about; **Opus 5.5 did it 0% of the time** and is both cheaper and faster, with a similar number of strong quotes (37 vs 36–40). It is the closest cheaper match and the obvious candidate. (3) **Sonnet and Haiku are far cheaper but behave differently:** they flag about 27–31% fewer quotes and Sonnet scores far fewer as strong (11 vs ~40), which means fewer post drafts at the current 70-point cut — they are more selective and harsher, not necessarily worse; the score cut-offs would need retuning per model. (4) **Whether the quotes they miss are ones a reporter would use is a human judgement** — a blind side-by-side review of 8 recordings (and a post-drafts side-by-side) was produced for Nick to do. (5) **Limits:** 30 transcripts, mostly short, mostly tester content; the automatic checks measure fidelity and agreement, not "good"; Opus 5.5/Sonnet/Haiku were run at medium effort, the current setup at its default (high thinking). **How to judge a model — Nick's criteria (2026-10-14):** **accuracy first** (it has to get it right), then **speed**, then **cost**. *Not* the number of quotes or how many score as strong: a thin interview isn't the model's fault. (His example: a star quarterback after a game gives careful, boring answers; you still have to interview him. The tool's job is a quick, accurate pull of what *is* usable.) Judged that way, **Opus 5.5 at medium effort wins on all three** (zero skipped words, faster, ~30% cheaper) and was adopted — see V1_SCOPE.md, "Misquote safeguard and the model switch". Sonnet 5.5 and Haiku 5.5 remain options for cost later; they were accurate (no invented words) but are more selective, so any switch would want the blind review and re-tuned score cut-offs.
**Independent of model:** add an app-level check that each flagged quote is an exact stretch of the transcript, and mark it "words skipped" (or repair it) when not — misquote protection that doesn't depend on which model is running.

**Correction (2026-10-14, after the cost log was built): treat the per-hour figures below as too low until the log has real data.** They were built mostly from the quote-finding step; the model comparison did not include the post-drafting step for most transcripts. The first real run through the app on Opus 5.5 (a 2.1-minute clip, 8 quotes, 3 posts) cost **$0.056**: $0.006 transcription, $0.023 quotes, $0.028 posts — about **$1.57 per audio hour** if you extrapolate, though one short clip says little (each AI call carries a fixed cost for its instructions and the full transcript, and post drafting scales with the number of strong quotes, not the minutes). Next step: let the testers' real recordings accumulate in the log (page: `/usage`) and price from that, not from these estimates.

**Cost to serve, per hour of recording (transcription + AI) — earlier estimate, see correction above:** about **$0.80 on Opus 5**, **$0.40 on Sonnet 5.5**, **$0.20 on Haiku 5.5** (under cheap models, transcription is the main cost). Worked scenarios:
- A reporter with **15 hours of recordings a month** (e.g., 30 half-hour interviews): about **$12 on Opus, $6 on Sonnet, $3 on Haiku**.
- **Tester-style use** (seven 1–2 minute clips from an event): well under a quarter in total.
- A **100-minute podcast** (18,000 words): roughly **$0.80** on Opus, about half that on Sonnet.
The brief's early idea of **$15–25 per reporter per month** works with Sonnet or Haiku at normal use (70–90%+ gross margin), and is thin on Opus at heavy use. **The cheapest big lever isn't the price — it's the model and the thinking setting.** Other levers (not yet measured): setting a lower thinking effort; sending the transcript once instead of twice (or caching it); skipping post drafts unless asked.

**Storage and hosting (approximate; verify):**
- **Today every recording sits in Nick's own Google Drive** (a paid 2 TB plan, about $10/month) — fine for testing, but **it cannot work for multiple customers**: each customer needs either **their own Drive connected** (no storage cost to us, but needs Google's app verification — see "Before a paying customer") or **storage we run** (object storage runs very roughly 1.5–2.5 cents per GB-month, so audio is pennies and **video is the real cost**: about 1–4 GB per hour of video). Offering hosted storage means choosing a **retention promise** (e.g., 90 days) and a deletion policy.
- Recordings also pass **through the server** (uploads in pieces, playback streamed), which uses hosting bandwidth; negligible at today's scale, worth re-checking with heavy video.
- **Fixed costs** are modest: Vercel Pro (about $20/month), the database (free tier now; roughly $25/month on a paid plan), domain, and — only if the app is wrapped for the stores — Apple ($99/year) and Google ($25 once).
- **Not measured yet:** real customer storage growth, bandwidth at scale, support time.

### Pricing shapes to choose between (not decided)
1. **Flat per newsroom per month** with a generous included amount (simplest to sell and to hand-onboard; fits "a few newsrooms"); overage by the hour.
2. **Per reporter per month** (the familiar tool model; the brief's $15–25 idea).
3. **Credits / usage-based** (pay for hours processed — fairest, but unpredictable bills scare small newsrooms).
4. **Tiers by recording length and size** (the existing per-tier limit constant was built for this: short-clip tier, long-form tier).
Whatever the shape, an **anchor** is what prospects pay today for Otter, Trint, Descript and similar — look those prices up, and ask prospects what they pay and for what.

### Questions to ASK people (prospects, and the trade-association and consultant contacts)
*About their work:* How many interviews a week, how long, recorded on what? What happens to a recording today, step by step — who transcribes, how long does it take, where does it go? Which tools do you pay for now, and how much? What do you hate about them? Do you record video, audio, or both? Do you post quotes on social — who writes those, how long does it take?
*About the decision:* Who decides and who pays — the newsroom budget or the reporter personally? Is a subscription approved by the owner, an editor, or the reporter? Monthly or annual? What would you need to see in a 30-day trial to keep it? What would make you cancel?
*About price:* At what price would this be so cheap you'd doubt it? A bargain? Getting expensive? Too expensive? (ask all four.) Would you rather pay per reporter, per newsroom, or per hour? What do you pay for transcription now per month?
*About trust:* What are your rules about recording consent and protecting sources? Where is it acceptable for recordings to be stored, and for how long? Would you need it to *not* train on your recordings? Do you need your own account and your own storage? Would a human always have to approve a quote before it's used?
*About the relationship:* Would you try it free for a month in return for honest feedback and, if it works, a testimonial? Who else should I talk to? Would you introduce me?

### Questions Nick has to ANSWER (his, and the product's)
*Business shape:* Who is the first customer — freelancers, a small independent newsroom, a chain? Is the goal **recurring revenue**, or **a few paying newsrooms as proof for a pitch** (the exit thinking above)? How many paying users, at what total, would count as "enough" to move to the associations step? How many hours a week can go to support and onboarding?
*Pricing and terms:* What minimum margin is acceptable? A free pilot — how long, for whom, in exchange for what? Discount for early references? Refunds? What happens when someone goes over their limit?
*Data and trust (these block the first paying customer):* Whose storage — theirs or ours? How long do you keep recordings and transcripts, and what happens when someone cancels? What do you promise about training on their data (check the vendors' current terms first)? Who is responsible for recording consent? Do you need terms of service, a privacy policy and contract templates (see "Business setup") and an LLC and insurance before the first dollar?
*Product:* Reporters or newsrooms — accounts per person or per organization? Real data separation is still the gate. Which AI model do we run, and is the quality good enough to switch down? Which limits are in the product (length and size, minutes per month)?
*Operations:* Who answers when it breaks on a Thursday night? What response time do you promise?
*Positioning:* In one sentence, what is it? (Draft: *bring us whatever you recorded, on whatever you recorded it, and we turn it into a transcript, ranked quotes and ready-to-use posts — safely.*) What's the proof (real usage, how safe uploads are, speed)? What are the honest limits (speaker labels are a first draft; size limits; no editing the transcript)? What won't you build (see "Product focus")? Is the name settled and cleared before the association step?
*The BLOX question:* What is the trigger for telling the friend and the direct contact, and what will you say? (See the go-to-market sequence above.)

### Nick's answers to "Questions Nick has to ANSWER" (2026-10-14) — and what was found

**Business shape — decided:** recurring revenue. If it reaches a level where pitching a buyer (such as BLOX) makes sense, do that, but to be worth it to Nick *and* attractive to a buyer it must be shown to be **a working, profitable product**. The number that counts as "enough" is not set yet.
**Terms (pilot length, margin, overage) — open:** Nick doesn't yet have a feel for costs and set-up and wants help; he is meeting a friend who has built AI products and taken them to market (see the question list for that conversation below).
**Data and trust — Nick's principle:** *users should own and control the data they put into the app* (safer for him, keeps them in control). His questions, answered below: how reliant is the tool on cloud storage of the recordings? What changes if content lives on users' own devices? Does it have to sit on a cloud server? And does "consent" mean consent from the people being interviewed? (Yes.) **Training and support:** good written documents, one or two explainer videos, and email support.
**Operations:** does a simple app need more than email support? (Contrast: the election tracker needs Nick on call on election night.)
**Positioning / BLOX — changed stance:** Nick isn't ready for a one-sentence pitch. He expects his friend at BLOX to know about this early; he'd like some people signed up and using it first, but the circles are too tight to keep it quiet for long and he doesn't want to. *(This replaces the earlier plan, in "Exit thinking," to stay quiet until the associations step.)*

**Where the data actually lives (this is the key to the storage question).** Three separate places hold a customer's material: (1) **the recording file** — today in Nick's Google Drive; (2) **the text we produce** (transcript, quotes, post drafts, speaker names) — in our own database at Supabase; (3) **temporary copies at vendors during processing** — AssemblyAI (transcription) and Anthropic (the AI steps). The recording is only *needed* by our server for: playing it back, sharing it, re-running the transcript, and "Transcribe now" — and once, to send to AssemblyAI. So: **we can avoid storing recordings ourselves, but not avoid cloud involvement entirely** — audio goes to a transcription vendor at least briefly (unless transcription runs on the device, which only a native app could do, with trade-offs), and the transcript text lives in our database in every option except a fully local-first design.
**Options:** (A) **Bring your own Drive** (what's built, one customer's Drive per account): the customer's files stay in their Drive and under their control, no storage cost to us, matches Nick's principle; needs Google's app review, encrypted token storage, and doesn't suit newsrooms on Microsoft/Dropbox (those connectors could be added); Drive is not a fast media server. (B) **Our own storage** (cloud object storage): simplest for users, costs money, and makes us the holder of sensitive recordings with a retention and deletion promise to keep. (C) **Device-only (a native app)**: strongest privacy story and fast local playback, but nothing can be re-run, shared with an editor, or opened on another device or the desktop; lost phone = lost recording; and we'd still need a temporary upload for transcription. (D) **Hybrid (recommended direction):** (A) plus minimising what *we* and the vendors keep: we keep only text, offer export and permanent deletion, and delete vendor copies once processed.
**Vendor findings (from the vendors' own published pages; confirm before promising customers anything):** AssemblyAI says it does **not currently** train on customer data, but its terms **permit** it, and a customer can **opt out** by emailing from the account address (not possible on the free tier; applies to future training only) (https://assemblyai.com/docs/data-retention-and-model-training). Its default retention is **30 days for transcripts** (shortenable in the dashboard to 1/3/7/30 days) and **2 days for files sent to the upload endpoint, which is what this app uses**; transcripts can be **deleted immediately through the API**, which is how "zero retention" is achieved for pre-recorded audio (https://assemblyai.com/docs/delete-transcripts). Data is encrypted at rest and in transit, and it reports SOC 2 Type 1 and 2. For Anthropic, its documentation points to the commercial terms for standard retention (the exact default period was **not confirmed** in the docs — verify against the contract); **zero data retention is available only by approval**; and retained data is not used for training without express permission (https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention). **Cheap, concrete steps this suggests:** email AssemblyAI to opt out of training; have the app **delete the AssemblyAI transcript right after saving our own copy**; confirm Anthropic's retention in writing.
**Consent means consent from the people being recorded.** Laws vary: **Missouri** is generally one-party (a reporter who is part of the conversation may record), though sources conflict on in-person conversations; **Illinois** requires all parties' consent for a *private conversation recorded surreptitiously* (the 2014 rewrite narrowed it, so open, on-the-record recording of an interview generally avoids it); for **calls across state lines, follow the stricter state's rule** (https://www.dmlp.org/legal-guide/missouri-recording-law, https://www.isba.org/node/3939, https://www.rcfp.org/introduction-to-reporters-recording-guide/). **Not legal advice — a media lawyer should confirm.** Practical consequences: the terms should make the *user* responsible for consent; a one-line reminder in the app is cheap; and a Chicago-area newsroom will care about this.
**Support:** for a transcription-and-quotes tool, email support with a stated response time is reasonable, *because the product is built so nothing is lost* (resumable uploads with a phone-side backup, "Saved, not transcribed" with Transcribe now, Share original always available). What would change that is a time-critical promise (the election-night kind). Cheap ways to need less support: clear in-app failure messages (done), a short written guide and FAQ, and **alerts that tell Nick about processing errors before a customer does** (not built).

### Questions for the friend who has built AI products
How did you work out cost per customer, and how often did it change when vendors changed prices? How did you set usage limits and overage without annoying customers? What did a good free pilot look like — length, limits, what you asked for in return? Per-seat, per-organization or usage-based — what worked for small customers? What did support actually cost you in hours? What did buyers or larger customers ask about security and data handling, and when did they ask? How did you handle deletion and export requests? What gross margin did you aim for? What would you do differently on pricing? Who should I talk to next?

