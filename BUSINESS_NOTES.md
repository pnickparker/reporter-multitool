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
