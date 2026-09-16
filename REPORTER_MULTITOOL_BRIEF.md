# The Ultimate Reporter's Multi-Tool
## Product Brief for Claude Code Discussion

---

## THE EVOLUTION

### Started As
- Sports reporter tool: moment flagging + interview linking + stats tracking
- Narrow use case: high school sports coverage workflow

### Became
- General reporter multi-tool: unified capture + organization + production + export
- Broad use case: any reporter/podcaster/creator who uses 8-12 fragmented tools and wishes they were integrated

### The Insight
**Market Problem:** Reporters currently use:
- Rode Capture (video)
- Otter.ai (audio + transcription)
- Adobe apps (editing)
- Notion/Google Drive (organization)
- Final Cut/CapCut (video edit)
- Social posting tools (Twitter/Meta schedulers)
- CMS (WordPress/publishing)
- + 3-5 more context-specific tools

**What exists:** Hundreds of point solutions, aggregation newsletters try to help, but no coherent ecosystem.

**What's missing:** One really good multi-tool that doesn't try to replace everything, but creates a *cohesive workflow* with good integrations OUT to pro tools when needed.

---

## CORE PHILOSOPHY

**Don't replace Adobe or Final Cut.** Do create the scaffolding that makes it easy to:
1. Capture anything (video, audio, photos, text, files)
2. Organize it by project
3. AI-enhance it (transcribe, extract quotes, suggest clips)
4. Package it for multiple outputs (social, article, podcast)
5. Hand it off to pro tools when you need depth
6. Keep everything in the same project ecosystem

---

## USER ARCHETYPE

**Primary:** You (Nick Parker)
- Podcaster + Reporter + Content Creator
- Records video (Rode Capture model)
- Records audio (interviews, voiceovers)
- Needs transcriptions fast
- Needs to extract quotes for social
- Needs to package content for multiple outputs (news article, social posts, podcast clips, YouTube)
- Works across Link 2 Lee's Summit News, Fredcasts, local coverage

**Secondary:** Your reporters
- City council meetings → article + social clips
- Sports games → recap + highlight clips + social posts
- School board → article + quote graphics
- Breaking news → rapid fire social updates + article

**Tertiary:** Podcasters, independent creators
- Record interviews
- Extract clips for social
- Package for multiple platforms
- Publish to Spotify/YouTube/Newsletter

---

## FEATURE LIST — MOBILE APP

### Capture Layer
- **Video Recording** (Rode Capture as model: beautiful, simple, run-and-gun)
  - Built-in camera with stabilization
  - Optional: live transcription (speech-to-text overlay)
- **Audio Recording** (Otter.ai + Voice Memos hybrid)
  - Clean, simple recording interface
  - Optional: real-time transcription
- **Photo Capture** (with project tagging)
- **Text Entry** (quick notes, observations, interview prep)
- **File Import** (add existing audio/video/docs to project)

### Organization Layer
- **Projects** (tag/file related assets together)
  - Small built-in storage (~500MB per project, rolled up)
  - **Cloud Integration:** Connect to user's choice of cloud (iCloud, Google Drive, Dropbox)
  - Auto-sync on save
  - Offline mode (sync when connection returns)
- **Asset Management**
  - Store in project: video, audio, photos, transcripts, text notes, web links, documents
  - Search across all assets in a project
  - Tagging: custom tags per asset or auto-tags from AI analysis

### AI Enhancement Layer
- **Transcription** (AssemblyAI as backend, or user's choice of Otter/Adobe)
  - Auto-transcribe on upload
  - Timestamps built-in
  - Searchable transcript
- **Quote & Clip Extraction** (AI analyzes transcript + video)
  - Suggests important quotes ("This is a good pull" flagging)
  - Suggests viral clips (emotional peaks, strong statements, sharp visuals)
  - Marks timecode + context
- **Social Post Generation** (similar to NewsLink end-of-project process)
  - AI writes 3-5 social post variants (Twitter, LinkedIn, Instagram, TikTok)
  - Attaches image/video clip
  - Includes hashtags, CTAs
- **Article Draft Generator** (optional, lower priority for v1)
  - Takes transcript + extracted quotes + user notes
  - Generates article outline or first draft

### Content Production (v2, but worth planning for v1 architecture)
- **Auto Clip Editor** (CapCut/Riverside model)
  - Takes flagged quotes + timestamps
  - Auto-generates short-form clips (15s, 30s, 60s variants)
  - Applies captions from transcript
  - Background music/effects templates
- **Captions & Graphics** (via API to Adobe Express or similar)
  - Auto-generate quote graphics for social
  - Pull user's branding (colors, fonts, logos)

### Export Layer
- **Prepare for Publishing**
  - Video (MP4, formats for YouTube/TikTok/Instagram)
  - Audio (MP3, formats for Spotify/Apple Podcasts)
  - Article (Markdown, HTML, ready for CMS paste)
  - Social package (image + copy for each platform)
  - Podcast format (cleaned audio + transcript + chapter markers)
- **Project Package** (export entire project)
  - All assets + metadata
  - Transcript + extracted quotes
  - All generated social posts
  - Article draft
  - Single ZIP or cloud folder

---

## FEATURE LIST — WEB DASHBOARD

### Project Hub
- Access all projects created on mobile
- View all assets (video, audio, photos, documents)
- Search across projects
- Filter by date, asset type, tags

### Newsroom Tools (integrate existing workflows)
- **Link 2 Lee's Summit News** (editorial/fact-checking layer)
  - Pull article draft from mobile → edit in web
  - Fact-check, rewrite, add sources
  - SEO summary generation (per your preference: <75 words, includes names/context)
  - CMS integration (direct publish to WordPress)
- **Link 2 Lee's Summit Meeting Coverage** (meeting-specific workflow)
  - Pull transcript from mobile → structure as meeting notes
  - Extract votes, decisions, quotes
  - Generate meeting recap
  - Publish to site
- **Fredcasts Podcast Production** (podcast-specific workflow)
  - Pull interview audio + transcript
  - Add intro/outro/music
  - Generate show notes + chapters
  - Publish to Spotify/Apple Podcasts/YouTube

### Pro Tool Integration
- **Open in Adobe** (photo, video, audio)
  - Click "Edit in Adobe" → opens Photoshop/Premiere/Audition
  - Project metadata travels with file
  - On save in Adobe, re-sync back to project
- **Open in CapCut** (video)
  - Similar workflow
- **Open in Final Cut Pro** (video, Mac only)
- **Keep project context** throughout
  - Even when editing in pro apps, project tagging/organization maintained

### Publishing
- **CMS Integration** (WordPress for Link 2 Lee's Summit)
  - Article drafts ready to publish
  - SEO summary auto-filled
  - Featured image selected
  - One-click publish
- **Social Scheduling** (optional v1, could defer)
  - Queue generated social posts
  - Schedule across platforms (Buffer/Hootsuite API)

---

## DATA MODEL (Rough)

```
Project
├── id, name, created_at, updated_at
├── description (optional)
├── tags (user-defined)
├── cloud_connection (iCloud | Google Drive | Dropbox)
├── storage_quota
└── Assets[]
    ├── Asset
    │   ├── id, type (video|audio|photo|document|text|link)
    │   ├── raw_file (stored locally or in cloud)
    │   ├── metadata (duration, size, codec, etc.)
    │   ├── transcription (text + timestamps)
    │   ├── extracted_quotes[] (timestamp, text, confidence)
    │   ├── flagged_clips[] (timestamp, start, end, suggested_length, reason)
    │   ├── user_notes (text)
    │   ├── custom_tags[]
    │   ├── created_at, updated_at
    │   └── external_references (links to Adobe docs, CapCut projects, etc.)
```

---

## INTEGRATION STRATEGY

### v1 (MVP)
- Capture (video, audio, photo, text)
- Project organization + cloud sync
- Transcription (AssemblyAI)
- Quote extraction + flagging (basic AI)
- Social post generation (basic templates)
- Export (assets + transcript + social drafts)

### v1.5
- Pro tool integrations (Adobe, CapCut)
- CMS publish (WordPress)
- Link 2 Lee's Summit News workflow template

### v2
- Auto clip generation (CapCut-style)
- Newsroom tools (meeting coverage, podcast production)
- Social scheduling

### v3+
- Article draft generation
- Advanced editing templates
- Collaboration features
- Team workspaces

---

## EXISTING REFERENCE WORKFLOWS

Nick's team has already built these at Link 2 Lee's Summit:

1. **NewsLink HQ** (weekly newsletter production)
   - Input: Article links, sponsored content, events
   - Process: Headline drafting, teaser copy, social variant generation
   - Output: HTML email + social posts
   - Model: Fixed structure, branded assets, templated approach

2. **Link 2 Lee's Summit News** (editorial workflow)
   - Input: Rough article draft
   - Process: Fact-checking, rewrite, SEO summary, featured image selection
   - Output: CMS-ready article + social clips

3. **Fredcasts Podcast Production** (transcript-to-content)
   - Input: Podcast transcript
   - Process: Extract quotes, timestamp key moments, generate show notes
   - Output: Show notes + chapter markers + social clips

**These workflows should live in the web dashboard as templates the user can apply to projects.**

---

## TECH STACK (Preliminary)

### Mobile (iOS first, Android later)
- **Frontend:** React Native or Flutter (cross-platform, can target iOS quickly)
- **Camera/Audio:** Native OS APIs (AVFoundation for iOS)
- **Local Storage:** SQLite + file system
- **Cloud Sync:** Cloud kit (iCloud), Google Drive SDK, Dropbox SDK
- **Transcription API:** AssemblyAI
- **AI Features:** Claude API (quote extraction, post generation)

### Web Dashboard
- **Frontend:** React, TypeScript
- **Backend:** Node.js + Express (or similar) OR serverless (Firebase, Supabase)
- **Database:** PostgreSQL or Firebase
- **File Storage:** S3 or user's cloud storage
- **CMS Integration:** WordPress REST API

### Hosting
- **Mobile:** App Store, Google Play
- **Web:** Vercel or similar (frontend), Cloud Run or Lambda (backend)
- **Database:** Managed (AWS RDS, Firebase)

---

## ARCHITECTURAL DECISIONS NEEDED

1. **Native or Cross-Platform?**
   - Native iOS only (faster to market, better UX)
   - React Native/Flutter (target both iOS + Android simultaneously)

2. **Cloud Sync Strategy**
   - Store primarily in user's cloud (we sync FROM there)
   - Store primarily in our backend (we sync TO their cloud)
   - Hybrid (originals in user cloud, copies in backend for search/processing)

3. **AI Provider Dependencies**
   - Use Claude for quote extraction + post generation
   - Use AssemblyAI for transcription
   - Use user's own API keys (more control, more friction)
   - Use Anthropic API key in backend (we manage it, user pays per use)

4. **Pro Tool Integration Scope**
   - Read-only link (export to Adobe, user opens separately)
   - Bi-directional sync (file edits in Adobe sync back to project)
   - Full integration (project metadata travels, versioning managed)

5. **Revenue Model**
   - Free tier (limited storage, limited transcription minutes)
   - Pro tier ($15-25/mo, unlimited transcription, AI features, cloud sync)
   - Team tier ($50-100/mo, team collaboration, priority support)
   - Or percentage cut from CMS publishing/social scheduling (if integrated)

---

## SUCCESS METRICS (for v1 beta)

- Reporter time saved per project (target: 30+ min)
- Percentage of flagged quotes used in published article
- Number of social posts generated vs. previously hand-written
- User retention (do reporters keep using after first week)
- Ease of export to CMS or pro editing tool

---

## NEXT STEPS FOR CLAUDE CODE SESSION

1. **Validate the data model** — is the Project/Asset structure flexible enough?
2. **Scope v1 MVP** — what's in, what's deferred to v1.5/v2
3. **Design the mobile UI** — sketch out the capture + organization screens
4. **Design the web dashboard** — how do projects + newsroom tools coexist
5. **API architecture** — transcription, AI extraction, cloud sync
6. **Integration points** — WordPress, Adobe, cloud providers
7. **Development timeline** — honest estimate for v1 alpha
8. **Freelancer/team approach** — scope of work to quote

---

## NOTES FOR CLAUDE CODE CONVERSATION

- This is not trying to replace Rode Capture, Adobe, or Final Cut. It's the glue between them.
- The power is in: unified project organization + AI extraction + rapid export to multiple formats.
- Existing workflows (NewsLink, Meeting Coverage, Fredcasts) are the proof-of-concept that this works. Now automate them at the tool level.
- Start with reporters as users; expand to podcasters/creators later.
- Cloud integration is critical — users will want their files in their own storage.
- Sports reporter tool is now a feature (v1.5), not the whole product.

---

**Created:** Sept 15, 2026
**User:** Nick Parker, Fredrick Reed LLC
**Context:** Conversation with sports reporter friends + reflection on tool fragmentation + inspiration from NewsLink/Fredcasts workflow automation
