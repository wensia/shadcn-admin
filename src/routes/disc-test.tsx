import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DiscPublicTest } from '@/features/disc/pages/disc-public-test'

const searchSchema = z.object({
  appointment_id: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
})

export const Route = createFileRoute('/disc-test')({
  component: DiscPublicTest,
  validateSearch: searchSchema,
})
