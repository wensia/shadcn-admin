/**
 * Admin 占位符页面组件
 * 用于尚未完成的页面显示
 */

import { Construction } from 'lucide-react'
import { Card } from '@douyinfe/semi-ui-19'

interface AdminPlaceholderPageProps {
  title: string
  description?: string
}

export function AdminPlaceholderPage({ title, description }: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm" style={{ color: 'var(--semi-color-text-2)' }}>{description}</p>}
      </div>

      <Card
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
            <Construction className="w-5 h-5 text-amber-500" />
            <span style={{ fontSize: 16, fontWeight: 500 }}>页面开发中</span>
          </div>
        }
      >
        <p style={{ color: 'var(--semi-color-text-2)' }}>
          此页面正在开发中，敬请期待...
        </p>
      </Card>
    </div>
  )
}
