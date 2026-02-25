/**
 * CRM 每日通知弹窗
 * 用户进入 CRM 时弹出，点击「已知晓」后今日不再提示
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getActiveDailyNotice } from '../daily-notice-api'

const KEY_PREFIX = 'daily_notice_dismissed_'

function getDismissKey(noticeId: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `${KEY_PREFIX}${noticeId}_${today}`
}

function isDismissedToday(noticeId: string): boolean {
  return localStorage.getItem(getDismissKey(noticeId)) === 'true'
}

function dismissToday(noticeId: string): void {
  localStorage.setItem(getDismissKey(noticeId), 'true')
  // 清理超过 7 天的旧 key
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith(KEY_PREFIX)) {
      const datePart = key.split('_').pop()
      if (datePart && new Date(datePart) < sevenDaysAgo) {
        localStorage.removeItem(key)
      }
    }
  }
}

export function DailyNoticeDialog() {
  const [open, setOpen] = useState(false)

  const { data: noticeData } = useQuery({
    queryKey: ['daily-notice-active'],
    queryFn: async () => {
      const response = await getActiveDailyNotice()
      // apiClient 拦截器已返回 ApiResponse，response.data 即为通知数据
      return response.data ?? null
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  useEffect(() => {
    if (noticeData?.id && !isDismissedToday(noticeData.id)) {
      setOpen(true)
    }
  }, [noticeData])

  const handleDismiss = () => {
    if (noticeData?.id) {
      dismissToday(noticeData.id)
    }
    setOpen(false)
  }

  if (!noticeData) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss()
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col p-0 sm:max-w-[500px]">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>{noticeData.title}</DialogTitle>
          <DialogDescription>每日通知</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6">
          <div className="prose prose-sm dark:prose-invert max-w-none pb-4">
            <ReactMarkdown>{noticeData.content}</ReactMarkdown>
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0 border-t px-6 pt-4 pb-6">
          <Button onClick={handleDismiss} className="w-full sm:w-auto">
            已知晓
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
