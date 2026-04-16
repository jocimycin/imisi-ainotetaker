// lib/tasks/asana.ts — Push action items to Asana tasks
export interface ActionItem {
  text: string
  assignee_name?: string | null
  due_date?: string | null
}

export async function pushToAsana(
  accessToken: string,
  projectGid: string,
  meetingTitle: string,
  item: ActionItem
): Promise<string> {
  const body: Record<string, unknown> = {
    data: {
      name: item.text,
      notes: `From meeting: ${meetingTitle}`,
      projects: [projectGid],
    },
  }

  if (item.due_date) {
    ;(body.data as any).due_on = item.due_date
  }

  const res = await fetch('https://app.asana.com/api/1.0/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Asana API error ${res.status}: ${await res.text()}`)
  const task = await res.json()
  return task.data.gid
}

export async function getAsanaProjects(accessToken: string): Promise<{ gid: string; name: string }[]> {
  const res = await fetch('https://app.asana.com/api/1.0/projects?limit=50&opt_fields=gid,name', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.data ?? []
}
