// lib/tasks/jira.ts — Push action items to Jira issues (Atlassian OAuth 2.0)
export interface ActionItem {
  text: string
  due_date?: string | null
  priority?: string | null
}

async function getCloudId(accessToken: string): Promise<string> {
  const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Atlassian resources error ${res.status}`)
  const sites = await res.json()
  if (!sites.length) throw new Error('No Atlassian sites found')
  return sites[0].id
}

export async function pushToJira(
  accessToken: string,
  projectKey: string,
  meetingTitle: string,
  item: ActionItem,
  cloudId?: string
): Promise<string> {
  const cid = cloudId ?? await getCloudId(accessToken)

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary: item.text,
    description: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: `From meeting: ${meetingTitle}` }],
        },
      ],
    },
    issuetype: { name: 'Task' },
  }

  if (item.due_date) {
    fields.duedate = item.due_date
  }

  if (item.priority) {
    const priorityMap: Record<string, string> = {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    }
    fields.priority = { name: priorityMap[item.priority] ?? 'Medium' }
  }

  const res = await fetch(`https://api.atlassian.com/ex/jira/${cid}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ fields }),
  })

  if (!res.ok) throw new Error(`Jira API error ${res.status}: ${await res.text()}`)
  const issue = await res.json()
  return issue.id
}

export async function getJiraProjects(
  accessToken: string,
  cloudId?: string
): Promise<{ key: string; name: string }[]> {
  const cid = cloudId ?? await getCloudId(accessToken)
  const res = await fetch(
    `https://api.atlassian.com/ex/jira/${cid}/rest/api/3/project/search?maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.values ?? []).map((p: any) => ({ key: p.key, name: p.name }))
}
