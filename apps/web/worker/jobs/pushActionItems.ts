// apps/web/worker/jobs/pushActionItems.ts
// Inngest job: push action items to Notion/Asana/Jira after a meeting completes
import { inngest } from './pipeline'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

function getServiceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const pushActionItemsJob = inngest.createFunction(
  { id: 'push-action-items', name: 'Push action items to task tools' },
  { event: 'imisi/meeting.ended' },
  async ({ event, step }) => {
    const { meetingId } = event.data
    const supabase = getServiceSupabase()

    // Load meeting + action items
    const meetingData = await step.run('load-meeting-data', async () => {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('user_id, title')
        .eq('id', meetingId)
        .single()

      const { data: items } = await supabase
        .from('action_items')
        .select('id, text, assignee_name, due_date, priority')
        .eq('meeting_id', meetingId)

      return { meeting, items: items ?? [] }
    })

    if (!meetingData.meeting || !meetingData.items.length) return { pushed: 0 }

    // Load task integrations with push enabled
    const taskIntegrations = await step.run('load-integrations', async () => {
      const { data } = await supabase
        .from('integrations')
        .select('provider, access_token, refresh_token, token_expires_at, config')
        .eq('user_id', meetingData.meeting!.user_id)
        .in('provider', ['notion', 'asana', 'jira'])
        .eq('task_push_enabled', true)

      return data ?? []
    })

    if (!taskIntegrations.length) return { pushed: 0 }

    let pushed = 0

    for (const integration of taskIntegrations) {
      await step.run(`push-to-${integration.provider}`, async () => {
        const config = (integration.config as Record<string, string>) ?? {}
        const accessToken = integration.access_token
        if (!accessToken) return

        const meetingTitle = meetingData.meeting?.title ?? 'Untitled meeting'

        for (const item of meetingData.items) {
          let externalId: string | null = null
          let pushError: string | null = null

          try {
            if (integration.provider === 'notion') {
              const { pushToNotion } = await import('@/lib/tasks/notion')
              const dbId = config.notion_database_id
              if (!dbId) throw new Error('Notion database ID not configured')
              externalId = await pushToNotion(accessToken, dbId, meetingTitle, item)
            } else if (integration.provider === 'asana') {
              const { pushToAsana } = await import('@/lib/tasks/asana')
              const projectGid = config.asana_project_gid
              if (!projectGid) throw new Error('Asana project not configured')
              externalId = await pushToAsana(accessToken, projectGid, meetingTitle, item)
            } else if (integration.provider === 'jira') {
              const { pushToJira } = await import('@/lib/tasks/jira')
              const projectKey = config.jira_project_key
              if (!projectKey) throw new Error('Jira project not configured')
              externalId = await pushToJira(accessToken, projectKey, meetingTitle, item)
            }
          } catch (err: any) {
            pushError = err.message ?? 'Unknown error'
          }

          await supabase
            .from('action_items')
            .update({
              push_provider: integration.provider,
              push_status: externalId ? 'pushed' : 'failed',
              push_error: pushError,
            } as any)
            .eq('id', item.id)

          if (externalId) pushed++
        }
      })
    }

    return { pushed }
  }
)
