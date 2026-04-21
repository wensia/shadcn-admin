import { createFileRoute } from '@tanstack/react-router'
import { XiaoshengchuPublicPage } from '@/features/tools/xiaoshengchu/pages/xiaoshengchu-public'

export const Route = createFileRoute('/tools/xiaoshengchu')({
  staticData: { title: '小升初志愿模拟' },
  component: XiaoshengchuPublicPage,
})
