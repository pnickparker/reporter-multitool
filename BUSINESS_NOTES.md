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

**New consideration this raises, worth flagging rather than ignoring:** Nick is simultaneously (a) a paid BLOX vendor doing production work for them and (b) building a product on the side that BLOX could end up buying. Worth keeping those two things cleanly separated — don't build or develop this tool using time, resources, or contracts tied to the BLOX production work, so there's never a question later about what BLOX might already have a claim to. Cheap to get right now by just being deliberate about it; could be expensive to untangle later. Git history already serves as a timestamped, independent record of when this started, which helps here too.

**Decided (2026-10-01): staying quiet to BLOX — the friend COO and his direct working contact there — for now, deliberately.** Nick has told neither of them about this project or the sports/coach-input tool, specifically to avoid the IP/conflict-of-interest blur above. He's explicit this is a tightrope, not a risk-free choice. The real risk flagged back to him: the window to be the one who raises it himself shrinks as this gets more real — once there's revenue from multiple newsrooms, the odds BLOX hears about it secondhand (small local-news-tech world, LION Publishers, word of mouth) go up, and that lands worse than hearing it from Nick directly. Worth having a rough personal trigger for when silence should end, even though today isn't that day.

**Go-to-market sequence (2026-10-01):**
1. A short list of warm prospects first: small news publishers like Link 2 Lee's Summit, and industry friends — aiming for a few paying users. No exact number set yet; worth picking even a rough one (3-5?) so the threshold is recognizable rather than indefinite.
2. Then, if/when it's going well: Missouri Press Association, the Local Media Association (LMA), and a few news-media consultants Nick has ties to. This step is a real visibility jump, not just "more of the same" — trade associations mean word travels fast among exactly the target market.
3. **Talking to the associations is the trigger to finally tell the BLOX friend/COO**, before he could plausibly hear about it secondhand. Deliberately sequenced so BLOX hears it from Nick first.

Because step 2 is effectively Nick's public demo moment (not a quiet pilot anymore), the product needs to be solid *before* that step, not just "good enough for two friendly testers" — reliability bugs (like the Travis stuck-video issue from today) are fine to hit quietly now and would land much worse in front of an industry audience.

**Still genuinely open:** the exact number/revenue/timeframe for "enough" at step 1 before moving to step 2 — and the realistic outcome size even with a strong relationship (a close friendship changes the conversation, not what the product itself is actually worth — worth staying honest about that).

## Timeline and decision checkpoints (added 2026-10-01)

Nick is new to running a software business and correctly flagged that the open numbers above ("how many clients is enough," "what revenue before approaching associations") aren't things to guess at — they need actual research. This section is the timeline for *when* to go find those answers, not the answers themselves. Revisit and fill in as research happens; don't treat the placeholder numbers below as decided.

| Phase | What's happening | Checkpoint question | How to actually answer it (not a guess) |
|---|---|---|---|
| **Now — field testing** | Travis + one Android tester, v1 build, real field use | Is the core workflow reliable enough to charge anyone money for it? | Direct tester feedback, not a timer. Don't move on until bug reports taper off to normal-use-level, not "surprising failure" level (the Travis stuck-video bug was the surprising kind — fixed; watch for more of that kind). |
| **Warm prospects** | Small publishers Nick knows personally, industry friends | How many paying clients, at what price, is "enough" to feel ready for association-level visibility? | This is a real unknown — research it rather than pick a number out of the air. Concrete ways to find out: ask the news-media consultants Nick already has ties to how they'd evaluate readiness; ask Mo Press/LMA contacts informally (before pitching) what proof points they'd actually want to see from a tool before recommending it to members; look at how comparable tools (Trint, Descript, Otter, or smaller newsroom-specific tools) built early credibility before wider launches. |
| **Associations** | Mo Press Assoc., LMA, consultants | Is the product/support actually ready for an audience that can amplify fast, not just a few friendly users? | Stress-test against the real usage patterns that come up during the warm-prospect phase (longer interviews than expected, different phone models, spottier field connectivity) rather than assuming the current tester feedback already covers it. |
| **BLOX conversation** | Triggered by reaching the associations step | Is this a pitch, a pilot offer, or just "wanted you to hear it from me first"? | Not a research question — a personal/relationship judgment call Nick is better positioned to make in the moment than to pre-script now. |

**How to use this table:** when a checkpoint question comes up for real (e.g., once there are a couple of paying warm-prospect clients and the association step starts feeling close), that's the trigger to go do the research in the third column — not to guess, and not to keep deferring indefinitely either.
