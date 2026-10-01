# Business Notes: Selling Reporter Multi-Tool

Notes from a Sept. 30, 2026 conversation about turning this into a paid product. None of this blocks the current tester build. Use it as the checklist for when it's time to sell.

These notes aren't legal advice. Confirm the Anthropic, Google, AssemblyAI and Vercel terms when the time comes, because they change.

## Business setup

- Nick plans a **separate LLC** for the software business (for liability, and to keep its books apart from Fredrick Reed LLC). Customer contracts, the Vercel/Anthropic/AssemblyAI/Google accounts, and billing should all belong to that LLC.
- Needed: terms of service, a privacy policy and customer contract templates. Pay a lawyer once for templates you can reuse.
- Sales tax on software/SaaS varies by state. Check before taking payment.

## Ownership and AI terms

- Anthropic's consumer and commercial terms both assign any rights in outputs to the user. Anthropic claims no ownership of code Claude Code writes.
- US copyright generally needs human authorship, so code that is purely AI-written may not be copyrightable. Real protection comes from the running product, customers, brand and contracts. Keep git history as a record of human direction.
- The app calls Claude at runtime, so it needs an **API account under the commercial terms**, not a Pro/Max subscription. The API account should belong to the new LLC.
- Don't use "Claude" or "Anthropic" in the product name or branding.
- Check that dependency licenses stay permissive (MIT/Apache). Watch for GPL/AGPL.

## Before a paying customer can use it

- [ ] **Real accounts.** `getCurrentUser()` is still a placeholder. Each customer's data must be strictly separated from every other customer's.
- [ ] **Encrypt the Drive OAuth tokens.** They're stored as plain text in `GoogleDriveConnection`.
- [ ] **Google OAuth verification.** Letting the public connect their Drive needs Google's review. Broad Drive permissions can require a paid third-party security assessment (weeks of lead time). The `drive.file` permission (only files the app creates) keeps this much lighter. Decide the permission early.
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

**New consideration this raises, worth flagging rather than ignoring:** Nick is simultaneously (a) a paid BLOX vendor doing production work for them and (b) building a product on the side that BLOX could end up buying. Worth keeping those two things cleanly separated — don't build or develop this tool using time, resources, or contracts tied to the BLOX production work, so there's never a question later about what BLOX might already have a claim to. Cheap to get right now by just being deliberate about it; could be expensive to untangle later. Also worth a specific, deliberate decision (not an accident) about *when* to loop the COO friend in — early, for feedback and maybe an easier pilot path, versus later with more real proof and more leverage. Given how close that relationship is, this will likely come up in conversation regardless of plan, so better to have a stance on it ahead of time than improvise in the moment.

**Still genuinely open:**
1. ~~What's the actual catalyst for an acquisition conversation~~ — answered: an existing warm relationship, not a cold one.
2. ~~Is BLOX the best strategic fit, or the most familiar one~~ — answered: both; the relationship is real and substantive, not just CMS-customer familiarity.
3. What does "sell it a little bit" mean as a concrete target — how many newsrooms, what revenue, what timeframe — before either pitching BLOX directly or waiting for them to notice? Still no number attached.
4. Realistic outcomes for a deal like this are still probably modest (consistent with "solid side business, not venture-scale" above) — worth staying honest about that even with a strong relationship in place, since a close friendship doesn't change what the product itself is actually worth.
5. ~~Does Nick's time budget support this~~ — partially answered: he's already decided against the full SaaS-business path for exactly this capacity reason, which is itself the right-sized decision given everything above.
