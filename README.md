# Reporter Multi-Tool

A web app that turns a raw interview/press-conference recording into a transcript, flagged quotes, and social post drafts — one upload, no juggling separate transcription/editing/social tools.

See [`REPORTER_MULTITOOL_BRIEF.md`](./REPORTER_MULTITOOL_BRIEF.md) for the original product brief and [`V1_SCOPE.md`](./V1_SCOPE.md) for what's actually being built in v1.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres via Neon
- Google Drive API for file storage
- AssemblyAI for transcription
- Claude API for quote flagging + social post generation

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
