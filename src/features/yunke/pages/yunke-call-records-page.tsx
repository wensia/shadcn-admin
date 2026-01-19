/**
 * 云客通话记录页面
 */

import { PhoneCall, Clock, Construction } from 'lucide-react'

import { Main } from '@/components/layout/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function YunkeCallRecordsPage() {
  return (
    <Main fixed>
      <div className="flex flex-col gap-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">通话记录</h1>
            <p className="text-sm text-muted-foreground">
              查看云客系统通话记录和录音
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日通话</CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">功能开发中</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">通话时长</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">功能开发中</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">接通率</CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">功能开发中</p>
            </CardContent>
          </Card>
        </div>

        {/* 开发中提示 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-5 w-5 text-yellow-500" />
              功能开发中
            </CardTitle>
            <CardDescription>
              通话记录功能正在开发中，敬请期待
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PhoneCall className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">通话记录功能即将上线</p>
              <p className="text-sm">该功能将支持查看通话记录、播放录音、导出数据等</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
