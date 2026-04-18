-- 005_local_recording.sql
-- Supports in-browser audio recording as an alternative to the Recall.ai bot path.
-- Needed when corporate IT blocks external bots from joining meetings.

-- Add recording source to distinguish bot-joined vs locally recorded meetings
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'bot'
    CHECK (source IN ('bot', 'local_recording'));

-- Path within Supabase Storage bucket "recordings" (e.g. "{user_id}/{meeting_id}.webm")
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS recording_path TEXT;

-- AssemblyAI transcript job ID — stored after submission, used to correlate the webhook
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS transcript_job_id TEXT;

-- Storage bucket for audio recordings (run once, idempotent via IF NOT EXISTS in storage API)
-- Execute this separately in Supabase dashboard > Storage > New bucket:
--   Name: recordings
--   Public: false
--   File size limit: 500MB
--   Allowed MIME types: audio/webm, audio/ogg, audio/mp4, audio/mpeg

COMMENT ON COLUMN meetings.source IS 'bot = Recall.ai bot joined the call; local_recording = user recorded in-browser';
COMMENT ON COLUMN meetings.recording_path IS 'Supabase Storage path: recordings/{user_id}/{meeting_id}.webm';
COMMENT ON COLUMN meetings.transcript_job_id IS 'AssemblyAI transcript ID — set after audio is submitted for transcription';
