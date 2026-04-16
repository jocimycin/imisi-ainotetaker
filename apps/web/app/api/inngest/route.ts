// apps/web/app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest, functions } from '@/worker/jobs/pipeline'
import { calendarFunctions } from '@/worker/jobs/calendarSync'
import { pushActionItemsJob } from '@/worker/jobs/pushActionItems'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [...functions, ...calendarFunctions, pushActionItemsJob],
})
