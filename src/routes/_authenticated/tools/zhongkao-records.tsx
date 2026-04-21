import { createFileRoute } from '@tanstack/react-router'
import { ZhongkaoRecordsPage } from '@/features/tools/zhongkao/pages/zhongkao-records-page'

export const Route = createFileRoute('/_authenticated/tools/zhongkao-records')({
  staticData: { title: '中考分析记录' },
  component: ZhongkaoRecordsPage,
})
