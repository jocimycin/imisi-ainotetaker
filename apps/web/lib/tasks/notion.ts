// lib/tasks/notion.ts — Push action items to a Notion database
export interface ActionItem {
  text: string
  assignee_name?: string | null
  due_date?: string | null
  priority?: string | null
}

export async function pushToNotion(
  accessToken: string,
  databaseId: string,
  meetingTitle: string,
  item: ActionItem
): Promise<string> {
  const properties: Record<string, unknown> = {
    Name: {
      title: [{ text: { content: item.text } }],
    },
    Meeting: {
      rich_text: [{ text: { content: meetingTitle } }],
    },
  }

  if (item.assignee_name) {
    properties['Assignee'] = {
      rich_text: [{ text: { content: item.assignee_name } }],
    }
  }

  if (item.due_date) {
    properties['Due date'] = {
      date: { start: item.due_date },
    }
  }

  if (item.priority) {
    properties['Priority'] = {
      select: { name: item.priority },
    }
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })

  if (!res.ok) throw new Error(`Notion API error ${res.status}: ${await res.text()}`)
  const page = await res.json()
  return page.id
}

export async function getNotionDatabases(accessToken: string): Promise<{ id: string; title: string }[]> {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({ filter: { value: 'database', property: 'object' } }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []).map((db: any) => ({
    id: db.id,
    title: db.title?.[0]?.plain_text ?? 'Untitled',
  }))
}
