/**
 * CRM 每日通知弹窗 - Semi Design 版
 * 用户进入 CRM 时弹出，点击「已知晓」后今日不再提示
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Modal, Button } from '@douyinfe/semi-ui-19'
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
    <Modal
      visible={open}
      onCancel={handleDismiss}
      title={noticeData.title}
      footer={
        <Button theme="solid" onClick={handleDismiss}>
          已知晓
        </Button>
      }
      width={500}
      style={{ maxHeight: '80vh' }}
      bodyStyle={{ overflow: 'auto', maxHeight: 'calc(80vh - 120px)' }}
    >
      <div className="prose prose-sm dark:prose-invert" style={{ maxWidth: 'none' }}>
        <ReactMarkdown>{noticeData.content}</ReactMarkdown>
      </div>
    </Modal>
  )
}
