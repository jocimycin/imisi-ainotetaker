// lib/calendar/extractJoinUrl.ts
const PATTERNS = [
  /https?:\/\/([\w-]+\.)*zoom\.us\/j\/[\w?=&-]+/i,
  /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"'<>]+/i,
  /https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i,
  /https?:\/\/meeting\.zoho\.com\/[^\s"'<>]+/i,
  /https?:\/\/cliq\.zoho\.com\/[^\s"'<>]+/i,
]

export function extractJoinUrl(texts: (string | null | undefined)[]): string | null {
  const combined = texts.filter(Boolean).join(' ')
  // Strip HTML tags before scanning
  const plain = combined.replace(/<[^>]+>/g, ' ')
  for (const pattern of PATTERNS) {
    const match = plain.match(pattern)
    if (match) return match[0].replace(/['"<>]+$/, '')
  }
  return null
}
