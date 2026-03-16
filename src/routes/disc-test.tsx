import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DiscPublicTest } from '@/features/disc/pages/disc-public-test'

const searchSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  ref: z.string().optional(),
  id: z.string().optional(),
  channel: z.string().optional(),
})

export const Route = createFileRoute('/disc-test')({
  component: DiscPublicTest,
  validateSearch: searchSchema,
})
