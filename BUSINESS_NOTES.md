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

**Open questions raised back to Nick, not yet answered (worth revisiting before this becomes the actual plan):**
1. What's the actual catalyst for an acquisition conversation — BLOX noticing a competitive gap on their own, Nick actively pitching it to them, or organic traction/press (LION Publishers, case studies) that draws attention? Each implies different near-term priorities.
2. Is BLOX the best strategic fit, or the most familiar one (since Nick is already their CMS customer)? Worth naming other plausible acquirers/partners (other newsroom CMS vendors, transcription players looking for a newsroom wedge, journalism foundations) before anchoring on one.
3. What does "sell it a little bit" concretely mean as a target before shopping it around — how many paying newsrooms, what revenue, what timeframe? Without a number, this risks staying an indefinite someday-plan.
4. Realistic outcomes for a niche, founder-built tool with modest revenue are usually modest too (small acquihire-style deals, not a windfall) — consistent with the "solid side business, not venture-scale" framing above. Worth being honest with himself about whether that ceiling is the actual goal.
5. Does Nick's time budget (he runs Link 2 Lee's Summit full-time) support the multi-year horizon this kind of outcome usually takes, or should this stay scoped as a tool for his own newsroom with upside optionality rather than an active sale effort right now?
