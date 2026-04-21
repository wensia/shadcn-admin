import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ZhongkaoPublicPage } from '@/features/tools/zhongkao/pages/zhongkao-public'

const searchSchema = z.object({
  district: z.string().optional(),
})

export const Route = createFileRoute('/tools/zhongkao')({
  staticData: { title: '中考志愿填报' },
  component: ZhongkaoPublicPage,
  validateSearch: searchSchema,
})
