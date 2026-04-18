// lib/supabase/realtime.ts
// Typed helpers for Supabase Realtime Postgres Changes subscriptions.
// Used by LiveTranscriptPanel to stream transcript_segments as they arrive.

import type { SupabaseClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface LiveSegment {
  id: string
  meeting_id: string
  segment_index: number
  speaker: string | null
  text: string
  start_ms: number | null
  end_ms: number | null
  is_final: boolean
  created_at: string
}

type SegmentChangeHandler = (payload: RealtimePostgresChangesPayload<LiveSegment>) => void

/**
 * Subscribe to live transcript_segments for a given meeting.
 * Returns an unsubscribe function — call it in a useEffect cleanup.
 */
export function subscribeToTranscriptSegments(
  supabase: SupabaseClient,
  meetingId: string,
  onUpdate: SegmentChangeHandler
): () => void {
  const channel = supabase
    .channel(`transcript:${meetingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transcript_segments',
        filter: `meeting_id=eq.${meetingId}`,
      },
      onUpdate
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
