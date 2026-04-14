// Deprecated — use /api/meetings/[id]/ask instead
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Use /api/meetings/[id]/ask' }, { status: 410 })
}
