/**
 * Admin 占位符页面组件
 * 用于尚未完成的页面显示
 */

import { Construction } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AdminPlaceholderPageProps {
  title: string
  description?: string
}

export function AdminPlaceholderPage({ title, description }: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="w-5 h-5 text-amber-500" />
            页面开发中
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            此页面正在开发中，敬请期待...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
