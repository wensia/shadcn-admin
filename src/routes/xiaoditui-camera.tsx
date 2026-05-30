import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

import { XiaodituiWatermarkCameraPublicPage } from '@/features/crm/xiaoditui/watermark-camera-public-page'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/xiaoditui-camera')({
  staticData: { title: '水印打卡' },
  component: XiaodituiWatermarkCameraPublicPage,
  validateSearch: searchSchema,
})
