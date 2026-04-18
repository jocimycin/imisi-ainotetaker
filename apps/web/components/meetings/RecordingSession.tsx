'use client'
// components/meetings/RecordingSession.tsx
// Handles the full in-browser recording flow:
//   setup → recording → upload → processing → done
//
// Audio capture uses getDisplayMedia (screen share + audio) so all meeting participants
// are captured — not just the user's mic. On macOS: user selects the meeting window/tab
// and checks "Share audio". On Windows: system audio is captured automatically.

import { useState, useRef, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Phase = 'setup' | 'recording' | 'uploading' | 'processing' | 'done' | 'error'

interface Props {
  onClose: () => void
}

export function RecordingSession({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [title, setTitle] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up stream and timer when unmounting mid-recording
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function startRecording() {
    if (!title.trim()) return

    try {
      // Request screen/tab capture with audio.
      // The browser will ask the user to pick a screen, window, or tab.
      // For meeting capture: pick the meeting window/tab and check "Share audio".
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,   // required by the spec — we discard the video track after
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
        },
      })

      // Drop the video track — we only need audio
      stream.getVideoTracks().forEach((t) => t.stop())

      if (!stream.getAudioTracks().length) {
        setErrorMsg(
          'No audio captured. On macOS: when sharing, check the "Share audio" checkbox. On Windows: select "Entire Screen" to capture system audio.'
        )
        setPhase('error')
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      streamRef.current = stream
      chunksRef.current = []

      // 32kbps Opus: excellent speech quality, ~14MB/hr — well within Supabase's 50MB free limit.
      // 128kbps (browser default) would hit the limit at ~52min. Don't change this without upgrading.
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
        audioBitsPerSecond: 32_000,
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => handleUpload()

      // Collect in 5-second chunks to reduce memory pressure on long recordings
      recorder.start(5000)
      mediaRecorderRef.current = recorder

      setPhase('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)

      // If the user stops sharing via the browser's built-in controls, stop recording too
      stream.getAudioTracks()[0].onended = () => stopRecording()
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Permission denied. Allow screen sharing in your browser settings.')
      } else {
        setErrorMsg(`Could not start recording: ${err.message}`)
      }
      setPhase('error')
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    setPhase('uploading')
  }

  async function handleUpload() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErrorMsg('Session expired. Please refresh and try again.')
      setPhase('error')
      return
    }

    try {
      // 1. Create the meeting record server-side, get a meeting ID back
      const meetingRes = await fetch('/api/meetings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      if (!meetingRes.ok) throw new Error('Failed to create meeting record')
      const { meetingId } = await meetingRes.json()

      // 2. Upload audio blob directly to Supabase Storage (bypasses Vercel 4.5MB body limit)
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const storagePath = `${user.id}/${meetingId}.webm`

      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(storagePath, blob, {
          contentType: 'audio/webm',
          upsert: false,
        })

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

      // 3. Tell the server the upload is done — it generates a signed URL and submits to AssemblyAI
      const processRes = await fetch(`/api/meetings/${meetingId}/upload-recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath }),
      })
      if (!processRes.ok) throw new Error('Failed to start processing')

      setMeetingUrl(`/dashboard/meetings/${meetingId}`)
      setPhase('done')
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Upload failed. Please try again.')
      setPhase('error')
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div
      style={{ background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className="fixed inset-0 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'recording' && phase !== 'uploading') {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium">Record this meeting</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Meeting title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && title.trim() && startRecording()}
                  placeholder="e.g. Product review with design team"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-300"
                  autoFocus
                />
              </div>

              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-xs text-gray-500">
                <p className="font-medium text-gray-700">How it works</p>
                <p>1. Click <strong>Start recording</strong> — your browser will ask what to share.</p>
                <p>2. Select your <strong>meeting window or tab</strong>.</p>
                <p>3. <strong>Check "Share audio"</strong> to capture all participants (not just your mic).</p>
                <p>4. Click <strong>Stop recording</strong> when done — Imisi transcribes and analyses automatically.</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 text-sm py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startRecording}
                  disabled={!title.trim()}
                  className="flex-1 text-sm py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  Start recording
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── RECORDING ── */}
        {phase === 'recording' && (
          <div className="text-center space-y-6 py-2">
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Recording</span>
            </div>

            <div className="text-4xl font-mono font-light text-gray-800 tracking-widest">
              {formatTime(elapsed)}
            </div>

            <p className="text-xs text-gray-400">
              Recording in progress. Imisi is capturing the meeting audio.
            </p>

            <button
              onClick={stopRecording}
              className="w-full text-sm py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
            >
              Stop recording
            </button>
          </div>
        )}

        {/* ── UPLOADING ── */}
        {phase === 'uploading' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-10 h-10 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-700">Uploading recording…</p>
            <p className="text-xs text-gray-400">This may take a moment depending on recording length.</p>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {phase === 'processing' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-10 h-10 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-700">Transcribing…</p>
            <p className="text-xs text-gray-400">
              AssemblyAI is processing your recording. You'll get an email when the summary is ready — usually within a few minutes.
            </p>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && (
          <div className="text-center space-y-5 py-2">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Recording submitted</p>
              <p className="text-xs text-gray-400 mt-1">
                Imisi is transcribing and analysing your meeting. You'll get a summary email when it's done.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 text-sm py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <a
                href={meetingUrl}
                className="flex-1 text-sm py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-center"
              >
                View meeting
              </a>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-medium text-gray-800">Recording failed</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5">{errorMsg}</p>
            <button
              onClick={() => { setPhase('setup'); setErrorMsg('') }}
              className="w-full text-sm py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
