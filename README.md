# Imisi

**Your personal AI meeting assistant.**
Joins your meetings, transcribes everything, and delivers summaries with action items — automatically.

Supports: Microsoft Teams, Google Meet, Zoom, Zoho Meeting (and any platform via Recall.ai).

---

## What Imisi does

1. **Joins as a participant** — Imisi attends the meeting as a named bot
2. **Transcribes in real-time** — Speaker-diarised transcript with timestamps
3. **Analyses with Claude** — TL;DR summary, key decisions, action items with owners and due dates
4. **Delivers post-call** — Summary email sent to all attendees; dashboard updated instantly
5. **Answers questions** — Ask Imisi anything about a past meeting (post-call Q&A)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Next.js API routes + Inngest job queue |
| Bot layer | Recall.ai (Phase 1) |
| Transcription | AssemblyAI via Recall.ai |
| AI analysis | Claude Sonnet (Anthropic API) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Email | Resend |
| Auth | Supabase Auth (Google OAuth + Microsoft OAuth) |
| Hosting | Vercel (web) |

---

## Project structure

```
imisi/
├── apps/
│   └── web/                        # Next.js 14 dashboard app
│       ├── app/
│       │   ├── auth/               # Login + OAuth callback
│       │   ├── dashboard/          # All protected pages
│       │   │   ├── page.tsx        # Dashboard home
│       │   │   ├── meetings/       # Meeting list + detail
│       │   │   ├── actions/        # Action items board
│       │   │   ├── summaries/      # Summaries list
│       │   │   └── settings/       # Integrations + profile
│       │   └── api/
│       │       ├── webhooks/recall/ # Recall.ai bot events
│       │       ├── meetings/       # Schedule + ask endpoints
│       │       └── inngest/        # Job queue handler
│       ├── components/
│       │   ├── ui/                 # Sidebar, StatCard
│       │   ├── meetings/           # MeetingCard, SummaryPanel, AskImisi, ScheduleModal
│       │   ├── transcript/         # TranscriptViewer
│       │   ├── actions/            # ActionRow, ActionBoard
│       │   └── settings/          # IntegrationsPanel
│       ├── lib/supabase/           # Browser + server Supabase clients
│       ├── types/database.ts       # Full TypeScript DB types
│       └── middleware.ts           # Auth route protection
├── packages/
│   ├── ai/analyse.ts               # Claude analysis + Ask Imisi
│   └── bots/recall/client.ts       # Recall.ai API wrapper
└── supabase/
    └── migrations/001_initial_schema.sql
```

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/yourname/imisi.git
cd imisi
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration:
   ```bash
   cd supabase
   supabase link --project-ref your-project-ref
   supabase db push
   ```
3. In Supabase dashboard, enable Google and Microsoft OAuth providers under Authentication > Providers

### 3. Set up Recall.ai

1. Sign up at [recall.ai](https://recall.ai)
2. Get your API key from the dashboard
3. Set your webhook URL to: `https://your-domain.com/api/webhooks/recall`
4. Set the webhook secret to match `WEBHOOK_SECRET` in your env

### 4. Set up environment variables

```bash
cp .env.example apps/web/.env.local
# Fill in all values — see .env.example for instructions
```

### 5. Run locally

```bash
npm run dev
# Web app: http://localhost:3000
# Inngest dev server (separate terminal):
npx inngest-cli@latest dev
```

---

## Deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy web app
cd apps/web
vercel --prod
```

Set all environment variables in the Vercel project dashboard under Settings > Environment Variables.

### Supabase (production)

```bash
supabase db push --linked
```

---

## Key API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/meetings/schedule` | Schedule Imisi to join a meeting |
| POST | `/api/meetings/[id]/ask` | Ask Imisi a question about a meeting |
| POST | `/api/webhooks/recall` | Recall.ai bot event webhook (internal) |
| GET/POST | `/api/inngest` | Inngest job queue handler (internal) |

---

## Processing pipeline

```
Meeting ends
    ↓
Recall.ai webhook → /api/webhooks/recall
    ↓
Inngest: imisi/meeting.ended event fired
    ↓
Step 1: fetch transcript from Recall.ai
Step 2: store diarised segments in Supabase
Step 3: run Claude analysis (summary + actions + decisions)
Step 4: store summary + action_items in Supabase
Step 5: send email to all attendees via Resend
Step 6: mark meeting complete (triggers Supabase Realtime update)
```

---

## Build phases

### Phase 1 — MVP (current codebase)
- [x] Next.js app scaffold
- [x] Supabase schema + RLS
- [x] Recall.ai bot integration (all 4 platforms)
- [x] Claude AI analysis pipeline
- [x] Dashboard UI (all pages)
- [x] Post-call email delivery
- [x] Ask Imisi (post-call Q&A)

### Phase 2 — Growth
- [ ] Google Calendar + Outlook auto-detection (join without manual scheduling)
- [ ] Notion / Asana / Jira action item push
- [ ] Stripe billing (Free / Pro / Team)
- [ ] Mobile-responsive polish

### Phase 3 — Intelligence
- [ ] Live meeting assistant (real-time suggestions)
- [ ] Meeting analytics and trends
- [ ] Speaker identity profiles across meetings
- [ ] Multi-language support (Yoruba, French, Portuguese)

---

## Environment variables reference

See `.env.example` for full list with setup instructions for each service.

**Required for MVP:**
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `RECALLAI_API_KEY`
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- `WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

**Required for OAuth login:**
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- `AZURE_CLIENT_ID` + `AZURE_CLIENT_SECRET` + `AZURE_TENANT_ID`

---

## Contributing

Built for Joseph Aro. Imisi means "inspiration" in Yoruba.

---

*Imisi v0.1 — April 2026*
