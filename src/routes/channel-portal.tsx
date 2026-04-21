import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ChannelPortal } from '@/features/leads/pages/channel-portal'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/channel-portal')({
  staticData: { title: '渠道录入' },
  component: ChannelPortal,
  validateSearch: searchSchema,
})
