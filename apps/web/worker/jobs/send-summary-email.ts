// apps/web/worker/jobs/send-summary-email.ts
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import type { AnalysisResult } from '@imisi/ai/analyse'
import type { Database } from '@/types/database'

const resend = new Resend(process.env.RESEND_API_KEY)

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function sendSummaryEmail(meetingId: string, analysis: AnalysisResult) {
  const supabase = getServiceSupabase()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('title, started_at, platform, attendees, duration_seconds')
    .eq('id', meetingId)
    .single()

  if (!meeting) return

  const attendees = (meeting.attendees as Array<{ name: string; email: string }>) ?? []
  const recipients = attendees.filter((a) => a.email)

  const durationMin = Math.round((meeting.duration_seconds ?? 0) / 60)
  const date = meeting.started_at
    ? new Date(meeting.started_at).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown date'

  const html = buildEmailHtml({
    title: meeting.title ?? 'Meeting summary',
    date,
    platform: meeting.platform,
    durationMin,
    meetingId,
    analysis,
  })

  for (const attendee of recipients) {
    const { error } = await resend.emails.send({
      from: `Imisi <${process.env.RESEND_FROM_EMAIL}>`,
      to: attendee.email,
      subject: `Meeting notes: ${meeting.title ?? 'Your meeting'} — ${date}`,
      html,
    })

    await supabase.from('email_logs').insert({
      meeting_id: meetingId,
      recipient_email: attendee.email,
      status: error ? 'failed' : 'sent',
      sent_at: new Date().toISOString(),
    })
  }
}

function buildEmailHtml(opts: {
  title: string
  date: string
  platform: string
  durationMin: number
  meetingId: string
  analysis: AnalysisResult
}) {
  const { title, date, platform, durationMin, meetingId, analysis } = opts
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/meetings/${meetingId}`

  const actionItemsHtml = analysis.action_items
    .map(
      (a) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
          <p style="margin:0;font-size:14px;color:#111;">${a.text}</p>
          ${a.assignee_name ? `<p style="margin:2px 0 0;font-size:12px;color:#888;">Owner: ${a.assignee_name}</p>` : ''}
          ${a.due_date ? `<p style="margin:2px 0 0;font-size:12px;color:#888;">Due: ${a.due_date}</p>` : ''}
        </td>
      </tr>`
    )
    .join('')

  const keyPointsHtml = analysis.key_points
    .map((p) => `<li style="margin-bottom:6px;font-size:14px;color:#333;">${p}</li>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eee;">

    <div style="background:#534AB7;padding:24px 32px;">
      <p style="margin:0;font-size:13px;color:#AFA9EC;letter-spacing:0.05em;text-transform:uppercase;">Imisi Meeting Notes</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:500;">${title}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#CECBF6;">${date} · ${durationMin} min · ${platform}</p>
    </div>

    <div style="padding:24px 32px;">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#888;margin:0 0 10px;">Summary</h2>
      <p style="font-size:15px;color:#222;line-height:1.6;margin:0 0 24px;">${analysis.tldr}</p>

      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#888;margin:0 0 10px;">Key points</h2>
      <ul style="padding-left:18px;margin:0 0 24px;">${keyPointsHtml}</ul>

      ${
        analysis.action_items.length > 0
          ? `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#888;margin:0 0 10px;">Action items (${analysis.action_items.length})</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${actionItemsHtml}</table>`
          : ''
      }

      <a href="${dashboardUrl}" style="display:inline-block;background:#534AB7;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;">
        View full transcript in Imisi
      </a>
    </div>

    <div style="padding:16px 32px;border-top:1px solid #f0f0f0;background:#fafafa;">
      <p style="margin:0;font-size:12px;color:#aaa;">Sent by Imisi — your meeting intelligence assistant. <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color:#888;">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`
}
