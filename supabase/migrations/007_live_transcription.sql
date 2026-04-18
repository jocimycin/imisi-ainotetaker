-- 007_live_transcription.sql
-- Phase 4A: Live streaming transcript support

-- Add streaming state columns to transcripts
ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS is_streaming    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_segment_at timestamptz;

-- Real-time transcript segments streamed during a live meeting
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

CREATE INDEX IF NOT EXISTS idx_transcript_segments_meeting
  ON transcript_segments(meeting_id, segment_index);

ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner access" ON transcript_segments;
CREATE POLICY "owner access" ON transcript_segments
  USING (meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid()));
