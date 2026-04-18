-- 008_meeting_notes.sql
-- Phase 4B: In-meeting notes panel
-- Phase 4C: Smart document columns on summaries

-- ── 4B: Note tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   uuid REFERENCES meetings(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  content      text NOT NULL DEFAULT '',
  content_json jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS note_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid REFERENCES meetings(id) ON DELETE CASCADE,
  note_id     uuid REFERENCES meeting_notes(id) ON DELETE CASCADE,
  text        text NOT NULL,
  meeting_ms  integer,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE meeting_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_entries   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner access" ON meeting_notes;
CREATE POLICY "owner access" ON meeting_notes
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owner access" ON note_entries;
CREATE POLICY "owner access" ON note_entries
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));

-- Auto-update updated_at on meeting_notes
CREATE OR REPLACE FUNCTION update_meeting_notes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meeting_notes_updated_at ON meeting_notes;
CREATE TRIGGER meeting_notes_updated_at
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_meeting_notes_updated_at();

-- ── 4C: Smart document columns on summaries ────────────────────────────────

ALTER TABLE summaries
  ADD COLUMN IF NOT EXISTS document_json  jsonb,
  ADD COLUMN IF NOT EXISTS has_user_notes boolean DEFAULT false;
