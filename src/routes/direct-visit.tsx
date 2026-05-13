import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DirectVisitSubmit } from '@/features/leads/pages/direct-visit-submit'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/direct-visit')({
  staticData: { title: '直访登记' },
  component: DirectVisitSubmit,
  validateSearch: searchSchema,
})
