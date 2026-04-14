// apps/web/app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest, functions } from '@/worker/jobs/pipeline'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
