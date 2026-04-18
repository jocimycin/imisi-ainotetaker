# Imisi Phase 4 — Granola-Inspired Features

**Authored:** 2026-04-17  
**Updated:** 2026-04-17  
**Status:** 4A ✅ 4B ✅ 4C ✅ 4D ⏳ (blocked: Apple Developer account) 4E partial ✅ (Markdown + clipboard; PDF/Notion pending)  
**Builds on:** Phase 3 (in-browser recording, QStash pipeline, calendar sync)

---

## Overview

Phase 4 closes the gap between Imisi (bot-based, post-call) and Granola (ambient, live, invisible). The four pillars:

| Pillar | Granola has it | Imisi today | Phase 4 target |
|--------|---------------|-------------|----------------|
| Invisible capture | Yes — system audio, no bot | No — Recall.ai bot joins visibly | Desktop companion app, system audio |
| Live transcription | Yes — real-time during call | No — async post-call only | Streaming transcript in UI |
| In-meeting notes | Yes — user types, AI fills in | No | Rich-text notes panel, timestamped |
| Smart document | Yes — merged notes + transcript | Basic summary (tldr, bullets) | Full meeting document, exportable |

---

## Milestones

### 4A — Live Streaming Transcript
### 4B — In-Meeting Notes Panel  
### 4C — Smart Document Generation  
### 4D — Desktop Companion App (Ambient Capture)  
### 4E — Platform Independence & Export

Each milestone is independently shippable. 4A–4C run on the existing web app. 4D introduces the desktop app. 4E is polish + reach.

---

## Milestone 4A — Live Streaming Transcript

**Goal:** Show a live, auto-updating transcript in the meeting detail page while a meeting is in progress.

### How it works

```
Recall.ai bot (existing)
  └─ live transcript webhook → POST /api/webhooks/recall
       └─ upsert transcript segment into `transcripts` table
            └─ Supabase Realtime broadcast channel: `meeting:{id}:transcript`
                 └─ LiveTranscriptPanel.tsx subscribes → renders as segments arrive
```

Recall.ai already emits partial transcript webhooks during a live meeting. The existing webhook handler (`/api/webhooks/recall`) handles `bot.status_change` — extend it to also handle `transcript.partial` and `transcript.final` events.

### DB changes — `005_live_transcription.sql`

```sql
-- Add streaming support columns to transcripts
ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS is_streaming   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_segment_at timestamptz;

-- New table: individual segments streamed in real-time
CREATE TABLE IF NOT EXISTS transcript_segments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    uuid REFERENCES meetings(id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  speaker       text,
  text          text NOT NULL,
  start_ms      integer,
  end_ms        integer,
  is_final      boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_transcript_segments_meeting ON transcript_segments(meeting_id, segment_index);
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner access" ON transcript_segments
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));
```

### New files

| Path | Purpose |
|------|---------|
| `apps/web/components/transcript/LiveTranscriptPanel.tsx` | Supabase Realtime subscriber, auto-scroll, speaker color coding |
| `apps/web/lib/supabase/realtime.ts` | Typed wrapper for broadcast channel subscription |

### Webhook extension

Extend `apps/web/app/api/webhooks/recall/route.ts` to handle:
```typescript
case 'transcript.partial':
case 'transcript.final':
  await upsertTranscriptSegment(payload)
  // Supabase Realtime is automatic — inserts to transcript_segments
  // trigger the channel automatically via Postgres changes
  break
```

### UI change

Meeting detail page (`dashboard/meetings/[id]/page.tsx`):
- When `meeting.status === 'live'`, render `<LiveTranscriptPanel meetingId={id} />` instead of static `<TranscriptViewer />`
- Live indicator badge: pulsing red dot + "Live"

---

## Milestone 4B — In-Meeting Notes Panel

**Goal:** During a live meeting, the user can type notes alongside the live transcript. Notes are timestamped relative to meeting start, auto-saved, and preserved for document generation.

### Layout

```
┌─────────────────────────────────────────┐
│  Meeting: Design Sync  ● Live  45:23    │
├─────────────────────┬───────────────────┤
│                     │                   │
│  LIVE TRANSCRIPT    │   YOUR NOTES      │
│  (auto-scroll)      │   (Tiptap editor) │
│                     │                   │
│  [John] We should   │  > 12:04          │
│  revisit pricing… │  Agreed to ship   │
│                     │  v2 before Stripe │
│  [Sarah] Agreed,    │                   │
│  Q3 is the target   │  > 23:41          │
│                     │  Sarah owns Q3    │
│                     │  launch plan      │
│                     │                   │
└─────────────────────┴───────────────────┘
```

### DB changes — `006_meeting_notes.sql`

```sql
CREATE TABLE IF NOT EXISTS meeting_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      uuid REFERENCES meetings(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  content         text NOT NULL DEFAULT '',          -- raw markdown/JSON from Tiptap
  content_json    jsonb,                             -- Tiptap doc JSON (structured)
  word_count      integer GENERATED ALWAYS AS (
                    array_length(regexp_split_to_array(trim(content), '\s+'), 1)
                  ) STORED,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Timestamped note entries (each paragraph gets a meeting timestamp)
CREATE TABLE IF NOT EXISTS note_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    uuid REFERENCES meetings(id) ON DELETE CASCADE,
  note_id       uuid REFERENCES meeting_notes(id) ON DELETE CASCADE,
  text          text NOT NULL,
  meeting_ms    integer,    -- ms from meeting start when this entry was written
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner access" ON meeting_notes USING (user_id = auth.uid());
CREATE POLICY "owner access" ON note_entries
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));
```

### New files

| Path | Purpose |
|------|---------|
| `apps/web/components/notes/MeetingNotesEditor.tsx` | Tiptap editor, debounced save, timestamp injection |
| `apps/web/components/notes/NoteTimestamp.tsx` | Meeting-relative timestamp badge (e.g. "34:12") |
| `apps/web/app/api/meetings/[id]/notes/route.ts` | GET (load notes), PATCH (save), POST (create) |

### Key behaviors

- **Auto-timestamp:** When user starts a new paragraph, stamp it with `now() - meeting.started_at` in ms
- **Debounced save:** 800ms debounce on every keystroke → PATCH `/api/meetings/[id]/notes`
- **Offline-safe:** Tiptap state held in React — save failure shows retry indicator, never loses content
- **Keyboard shortcut:** `Cmd+Enter` → inserts a new timestamped block

---

## Milestone 4C — Smart Document Generation

**Goal:** After a meeting ends, generate a single structured "Meeting Document" that merges the user's notes, the full transcript, and Claude's analysis — replacing the current simple summary.

### Document structure

```
# [Meeting Title]
📅 [Date]  •  ⏱ [Duration]  •  👥 [Speakers detected]

---

## Your Notes
> 00:12 — Agreed to ship v2 before activating Stripe
> 23:41 — Sarah owns Q3 launch plan

---

## AI Highlights
**What happened:**  [tldr]

**Key Decisions:**
- [decision 1]
- [decision 2]

**Open Questions:**
- [question 1]

---

## Action Items
- [ ] Sarah: Draft Q3 launch plan  (due: 2026-04-24)
- [ ] John: Re-benchmark pricing page (unassigned)

---

## Full Transcript
[00:00] John: We should revisit pricing…
[00:34] Sarah: Agreed, Q3 is the target…
```

### Claude prompt changes (in `packages/ai/src/analyse.ts`)

Extend `analyseMeeting()` to accept an optional `userNotes` parameter. When present, add a notes section to the system prompt:

```
The user took the following personal notes during this meeting (with meeting timestamps).
Incorporate these as the "Your Notes" section of the document exactly as written — do not
paraphrase. Then use them to inform your highlights and action item extraction.
```

Claude is instructed to produce a `document_json` block in addition to the existing `summary_json`.

### DB changes

```sql
-- In migration 005 or new 006_documents.sql
ALTER TABLE summaries
  ADD COLUMN IF NOT EXISTS document_json  jsonb,
  ADD COLUMN IF NOT EXISTS has_user_notes boolean DEFAULT false;
```

### Inngest job change (`worker/jobs/pipeline.ts`)

In `onMeetingEnded`:
1. Fetch user notes from `meeting_notes` (new step)
2. Pass `userNotes` to `analyseMeeting()`
3. Store `document_json` on the summary row

### New UI

| Path | Purpose |
|------|---------|
| `apps/web/components/meetings/MeetingDocument.tsx` | Full document renderer — notes, highlights, actions, transcript |
| `apps/web/app/dashboard/meetings/[id]/document/page.tsx` | Document page route |

Meeting detail tabs become: **Document** | Transcript | Actions | Ask Imisi

---

## Milestone 4D — Desktop Companion App (Ambient Capture)

**Goal:** A lightweight desktop app that captures system audio (mic + speaker), streams to Imisi, and creates a meeting record without a bot joining the call. Users on the call see nothing — Imisi is invisible.

**Target platform: Windows first.** macOS is a stretch goal (requires Apple Developer account + notarization).

### Why desktop (not browser)

Browsers can access the microphone but not system output audio (what others say). Capturing both sides of the call requires OS-level audio access. On Windows this is **WASAPI loopback** — a standard, well-supported Windows Core Audio API that captures everything playing through the speakers with no special permissions or signing requirements.

### Technology: Tauri 2 (Rust + WebView)

- ~15MB binary vs Electron's ~150MB
- Native Windows audio via `windows-rs` WASAPI bindings in Rust
- WebView renders the same React components — reuse Imisi UI
- No Windows code-signing certificate required for internal/beta use (SmartScreen warning only)
- macOS support added later: swap `capture_win.rs` for `capture_mac.rs` using ScreenCaptureKit

### Windows audio capture — WASAPI loopback

WASAPI loopback taps the system render endpoint (speakers/headphones output) — it captures exactly what the user hears: remote voices, system sounds, everything. Combined with a standard mic capture for the user's own voice, both sides of the call are captured.

```rust
// capture_win.rs — high-level flow
use windows::Win32::Media::Audio::*;

pub fn open_loopback_client() -> IAudioCaptureClient {
    let enumerator = CoCreateInstance::<IMMDeviceEnumerator>(...);
    let device = enumerator.GetDefaultAudioEndpoint(eRender, eConsole);
    // eRender + AUDCLNT_STREAMFLAGS_LOOPBACK = loopback capture
    let audio_client = device.Activate::<IAudioClient>(...);
    audio_client.Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, ...);
    audio_client.GetService::<IAudioCaptureClient>()
}
```

PCM frames from loopback + mic are mixed and encoded to Opus before streaming.

### Architecture

```
Desktop App (Tauri 2, Windows)
  ├── Rust core
  │     ├── AudioCapture
  │     │     ├── WASAPI loopback (remote voices via speakers)
  │     │     ├── WASAPI mic capture (user's own voice)
  │     │     ├── PCM mixer → mono 16kHz (AssemblyAI requirement)
  │     │     └── Opus encoder → 32kbps chunks
  │     └── WebSocket client → /api/audio/stream (authenticated)
  └── WebView (React)
        ├── Floating mini window (always-on-top, taskbar-hidden)
        │     ├── Record / Pause / Stop
        │     ├── Live transcript snippets (last 3 lines)
        │     └── Quick note input (Ctrl+N on Windows)
        └── Full meeting view (same web app, embedded)

Backend (Next.js)
  └── /api/audio/stream (WebSocket upgrade)
        ├── Authenticate desktop token
        ├── Create meeting record (capture_mode: 'ambient')
        ├── Buffer Opus chunks → AssemblyAI Universal Streaming English WebSocket
        └── Emit transcript_segments → Supabase (same as 4A)
```

### DB changes — `007_ambient_capture.sql`

```sql
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS capture_mode text DEFAULT 'bot'
    CHECK (capture_mode IN ('bot', 'ambient')),
  ADD COLUMN IF NOT EXISTS audio_stream_id text;  -- AssemblyAI session ID

-- Desktop auth tokens (short-lived, user-scoped)
CREATE TABLE IF NOT EXISTS desktop_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE desktop_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner access" ON desktop_tokens USING (user_id = auth.uid());
```

### New env vars

```bash
# AssemblyAI Universal Streaming English — confirmed available on current plan
ASSEMBLYAI_RT_URL=wss://streaming.assemblyai.com/v3/ws
DESKTOP_TOKEN_SECRET=<32-byte secret for signing desktop tokens>
```

### Desktop app repo structure

```
apps/desktop/               ← New Tauri 2 app in monorepo
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── audio/
│   │   │   ├── capture_win.rs    ← WASAPI loopback + mic (Windows — primary target)
│   │   │   ├── capture_mac.rs    ← ScreenCaptureKit (macOS — stretch, Phase 4D+)
│   │   │   ├── mixer.rs          ← Mix loopback + mic to mono 16kHz PCM
│   │   │   └── encode.rs         ← PCM → Opus (32kbps)
│   │   └── stream/
│   │       └── ws_client.rs      ← WebSocket to /api/audio/stream
│   ├── Cargo.toml                ← deps: windows-rs, opus, tokio-tungstenite
│   └── tauri.conf.json
├── src/                          ← React UI (reuses Imisi components)
│   ├── MiniWindow.tsx            ← Floating always-on-top recorder UI
│   └── FullView.tsx              ← Embedded meeting detail
└── package.json
```

### Windows Cargo dependencies

```toml
[dependencies]
windows = { version = "0.58", features = [
  "Win32_Media_Audio",
  "Win32_System_Com",
  "Win32_Foundation",
] }
opus = "0.3"                        # Opus encoder bindings
tokio-tungstenite = "0.21"          # Async WebSocket client
tokio = { version = "1", features = ["full"] }
```

### Meeting auto-detection (stretch)

On Windows, the desktop app polls foreground window titles via `GetWindowText` / `EnumWindows`:
- Detects: Zoom (`zoom.exe`), Teams (`ms-teams.exe`), Meet (Chrome tab title contains "Meet"), Webex
- Shows a system tray notification: "Teams meeting detected — Start recording?"
- Eliminates the need to manually start a recording

### Windows-specific notes

- **No code-signing required for internal/beta use** — users click through SmartScreen "Unknown publisher" warning once
- **For public distribution:** purchase a standard OV code-signing certificate (~$200/yr) to suppress SmartScreen
- **System tray integration:** Tauri 2 has built-in `tray-icon` plugin — app lives in the tray, not the taskbar, identical to how Granola behaves
- **Auto-start on login:** registry `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` entry, added by the installer (NSIS or WiX via Tauri bundler)
- **Installer:** Tauri bundler produces an NSIS `.exe` or MSI out of the box — no extra tooling

### Security considerations

- Desktop token is a short-lived JWT (1 hour TTL), generated at `/api/desktop/token` after web login
- WebSocket stream authenticated with Bearer token in the upgrade headers
- Audio never stored raw — streamed directly to AssemblyAI, discarded after transcription
- User can revoke all desktop sessions from Settings → Integrations

---

## Milestone 4E — Platform Independence & Export

**Goal:** Full parity with Granola's platform reach + document export.

### Platform independence

Since ambient capture works via system audio, meetings table `platform` column becomes optional for ambient meetings. The platform detection logic in `lib/calendar/extractJoinUrl.ts` is used for bot-mode only.

New meeting creation flows:
1. **Bot mode (existing):** Paste join URL → bot joins
2. **Ambient mode (new):** "Start Recording" in desktop app → no URL needed
3. **Calendar auto-detect (new):** Desktop app sees calendar event → offers to start ambient recording

### Document export

New component: `ExportMenu.tsx` (dropdown on MeetingDocument page)

| Format | Implementation |
|--------|---------------|
| **Markdown** | Render `document_json` as `.md` — download via blob URL |
| **PDF** | `@react-pdf/renderer` — styled to match Imisi brand |
| **Notion push** | Extend existing `lib/tasks/notion.ts` to push full document (not just action items) |
| **Copy to clipboard** | Plain text or rich HTML |

### Settings additions

Settings → Integrations panel gains a new "Desktop App" section:
- Download link for macOS / Windows installer
- Token management: "Generate desktop token", active sessions list, revoke all
- Capture mode preference: default to Bot or Ambient

---

## New files summary

### Web app (`apps/web/`)

```
app/
  api/
    audio/stream/route.ts          ← WebSocket endpoint for desktop audio
    desktop/token/route.ts         ← Generate short-lived desktop JWT
    meetings/[id]/notes/route.ts   ← CRUD for meeting notes
  dashboard/
    meetings/[id]/document/page.tsx ← Meeting document route

components/
  transcript/
    LiveTranscriptPanel.tsx        ← Real-time transcript (4A)
  notes/
    MeetingNotesEditor.tsx         ← Tiptap editor (4B)
    NoteTimestamp.tsx              ← Meeting-relative timestamp (4B)
  meetings/
    MeetingDocument.tsx            ← Full merged document (4C)
    ExportMenu.tsx                 ← Export dropdown (4E)
  settings/
    DesktopAppPanel.tsx            ← Token management (4E)

lib/
  supabase/realtime.ts             ← Typed broadcast channel helper
  audio/assemblyai-rt.ts           ← AssemblyAI real-time streaming client
```

### Desktop app (`apps/desktop/`) — new Tauri 2 workspace member (Windows-first)

```
src-tauri/src/
  audio/capture_win.rs    ← WASAPI loopback + mic
  audio/capture_mac.rs    ← ScreenCaptureKit (stretch)
  audio/mixer.rs
  audio/encode.rs         ← Opus 32kbps
  stream/ws_client.rs
src/
  MiniWindow.tsx
  FullView.tsx
```

### Migrations

```
supabase/migrations/
  005_live_transcription.sql      ← transcript_segments table
  006_meeting_notes.sql           ← meeting_notes, note_entries tables; summaries.document_json
  007_ambient_capture.sql         ← meetings.capture_mode, desktop_tokens table
```

---

## Cost impact of Phase 4

| Change | Delta per meeting |
|--------|------------------|
| AssemblyAI real-time vs async | +$0.27 (45 min × $0.006/min uplift) |
| No Recall.ai for ambient meetings | −$0.15 (save bot cost) |
| Claude document generation (larger prompt ~+3k tokens) | +$0.009 |
| **Net per ambient meeting** | **+$0.13** |

Ambient meetings cost slightly more in AI but offset by no bot fee. The break-even tips in Imisi's favor for meetings > ~25 min.

---

## Build order recommendation

```
4A (Live transcript)   ← 1–2 days. Pure backend + one new component. Ships immediately.
4B (Notes panel)       ← 2–3 days. New DB table + Tiptap editor. Ships immediately.
4C (Smart document)    ← 2–3 days. Claude prompt change + new document UI.
4D (Desktop app)       ← 1–2 weeks. New Tauri project, Rust audio, streaming infra.
4E (Export + polish)   ← 1 week. Adds export, settings UI, auto-detection.
```

4A → 4B → 4C can be shipped as incremental web releases before the desktop app exists. A user with the web app only gets live transcription, notes, and smart documents for bot-joined meetings. 4D then makes all of it work invisibly.

---

## Open questions before build

1. **AssemblyAI streaming** — CONFIRMED available. Use **Universal Streaming English** model (fastest for real-time English). WebSocket endpoint: `wss://streaming.assemblyai.com/v3/ws`.
2. **Recall.ai live transcript webhook** — Confirm that the current Recall.ai plan emits `transcript.partial` events (some plans only emit on meeting end). Check Recall dashboard → Webhooks.
3. **Windows target** — CONFIRMED. Desktop app targets Windows first. macOS (ScreenCaptureKit) is a stretch goal requiring Apple Developer account + notarization.
4. **Tiptap license** — Tiptap Pro (collaboration features) is paid. Tiptap open-source (single-user editor) is free and sufficient for 4B.
5. **Supabase Realtime limits** — Free tier: 200 concurrent connections. Real-time transcript streams consume one connection per active meeting. Verify against expected concurrent user count.
