import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DiscChannelResults } from '@/features/disc/pages/disc-channel-results'

const searchSchema = z.object({
  token: z.string().optional(),
  channel: z.string().optional(),
})

export const Route = createFileRoute('/disc-results')({
  staticData: { title: 'DISC 测试结果' },
  component: DiscChannelResults,
  validateSearch: searchSchema,
})
