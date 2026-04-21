import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { LeadChannelSubmit } from '@/features/leads/pages/lead-channel-submit'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/lead-submit')({
  staticData: { title: '线索录入' },
  component: LeadChannelSubmit,
  validateSearch: searchSchema,
})
