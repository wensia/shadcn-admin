import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { LeadChannelSubmit } from '@/features/leads/pages/lead-channel-submit'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/lead-submit')({
  component: LeadChannelSubmit,
  validateSearch: searchSchema,
})
