/**
 * 云客通话记录列表组件 - Semi Design 版本
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Modal, Tag, Button, Select, Slider, Skeleton } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconChevronDown } from '@douyinfe/semi-icons'
import {
  Phone,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Play,
  Pause,
  Loader2,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import { callRecordsApi } from '@/features/yunke/api'
import type { YunkeCallLogItem } from '@/features/yunke/types'

interface YunkeCallLogsProps {
  phone: string
  className?: string
  showHeader?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) return `${minutes}分${secs}秒`
  return `${secs}秒`
}

function formatAudioTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '-'
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return timeStr }
}

function getCallTypeInfo(incomingCall: number) {
  if (incomingCall === 0) return { icon: PhoneOutgoing, label: '外呼', color: '#0077fa' }
  if (incomingCall === 1) return { icon: PhoneIncoming, label: '呼入', color: '#00b42a' }
  return { icon: Phone, label: '-', color: 'var(--semi-color-text-2)' }
}

function getCallResultInfo(callStatus: number, callSeconds: number) {
  if (callStatus === 2 || callSeconds > 0) return { label: '已接通', color: 'green' as const }
  return { label: '未接通', color: undefined }
}

function getAudioUrl(recordFile: string): string {
  const isDirectAudioUrl = /\.(mp3|wav|m4a|ogg|aac)(\?|$)/i.test(recordFile)
  if (isDirectAudioUrl) return recordFile
  const voiceIdMatch = recordFile.match(/voiceId=([^&]+)/)
  const voiceId = voiceIdMatch ? voiceIdMatch[1] : null
  if (voiceId) return callRecordsApi.getRecordStreamUrl(voiceId)
  return recordFile
}

/** 音频播放弹窗 */
function AudioPlayerDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item: YunkeCallLogItem | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const resetState = useCallback(() => {
    setIsPlaying(false); setIsLoading(true); setCurrentTime(0); setDuration(0); setError(null)
  }, [])

  useEffect(() => {
    if (!open || !item?.recordFile) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      resetState()
      return
    }
    const audioUrl = getAudioUrl(item.recordFile)
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.onloadedmetadata = () => { setDuration(audio.duration); setIsLoading(false) }
    audio.oncanplay = () => setIsLoading(false)
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.onended = () => { setIsPlaying(false); setCurrentTime(0) }
    audio.onerror = () => { setIsLoading(false); setError('播放失败，请稍后重试') }
    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)
    return () => { audio.pause(); audio.src = ''; audioRef.current = null }
  }, [open, item, resetState])

  const togglePlay = async () => {
    if (!audioRef.current) return
    try {
      if (isPlaying) audioRef.current.pause()
      else await audioRef.current.play()
    } catch { setError('播放失败') }
  }

  const handleDownload = async () => {
    if (!item?.recordFile) return
    setIsDownloading(true)
    try {
      const audioUrl = getAudioUrl(item.recordFile)
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      const phone = item.callNumber || 'unknown'
      const durationStr = `${item.callSeconds}秒`
      const timeStr = item.startCallTime
        ? new Date(item.startCallTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/[/:]/g, '-').replace(/\s/g, '_')
        : 'unknown'
      const fileName = `${phone}_${durationStr}_${timeStr}.mp3`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { setError('下载失败，请稍后重试') } finally { setIsDownloading(false) }
  }

  if (!item) return null

  const typeInfo = getCallTypeInfo(item.incomingCall)
  const TypeIcon = typeInfo.icon

  return (
    <Modal title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><Phone style={{ width: 16, height: 16 }} />通话录音</span>} visible={open} onCancel={onClose} footer={null} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--semi-color-text-2)', borderBottom: '1px solid var(--semi-color-border)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TypeIcon style={{ width: 16, height: 16, color: typeInfo.color }} />
            <span>{typeInfo.label}</span>
            <span>·</span>
            <span>{item.userIdName || '未知员工'}</span>
          </div>
          <span>{formatTime(item.startCallTime)}</span>
        </div>
        {error ? (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#ef4444' }}>{error}</div>
        ) : (
          <>
            <div>
              <Slider
                value={currentTime}
                max={duration || 100}
                step={0.1}
                onChange={(val) => { if (audioRef.current) audioRef.current.currentTime = val as number; setCurrentTime(val as number) }}
                disabled={isLoading}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 4 }}>
                <span>{formatAudioTime(currentTime)}</span>
                <span>{formatAudioTime(duration)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <Button theme="borderless" icon={isMuted ? <VolumeX style={{ width: 16, height: 16 }} /> : <Volume2 style={{ width: 16, height: 16 }} />} onClick={() => { if (audioRef.current) audioRef.current.muted = !isMuted; setIsMuted(!isMuted) }} disabled={isLoading} />
              <Button
                theme="solid"
                style={{ borderRadius: '50%', width: 48, height: 48 }}
                icon={isLoading ? <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} /> : isPlaying ? <Pause style={{ width: 20, height: 20 }} /> : <Play style={{ width: 20, height: 20, marginLeft: 2 }} />}
                onClick={togglePlay}
                disabled={isLoading}
              />
              <Button theme="borderless" icon={isDownloading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: 16, height: 16 }} />} onClick={handleDownload} disabled={isLoading || isDownloading} />
            </div>
          </>
        )}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--semi-color-text-2)' }}>
          通话时长: {formatDuration(item.callSeconds)}
        </div>
      </div>
    </Modal>
  )
}

export function YunkeCallLogs({ phone, className, showHeader = false, collapsible = false, defaultCollapsed = false }: YunkeCallLogsProps) {
  const [selectedItem, setSelectedItem] = useState<YunkeCallLogItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [isOpen, setIsOpen] = useState(!defaultCollapsed)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['yunke-call-logs', phone],
    queryFn: () => callRecordsApi.searchByPhone({ phone, size: 100 }),
    enabled: !!phone,
    staleTime: 30 * 1000,
  })

  const paginated = useMemo(() => {
    const allItems = data?.items || []
    const total = allItems.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const items = allItems.slice(startIndex, startIndex + pageSize)
    return { items, total, totalPages }
  }, [data?.items, page, pageSize])

  const callStats = useMemo(() => {
    const allItems = data?.items || []
    const connected = allItems.filter(item => item.callSeconds > 0 || item.callStatus === 2).length
    const notConnected = allItems.length - connected
    const totalCalls = allItems.length
    const totalDuration = allItems.reduce((sum, item) => sum + (item.callSeconds || 0), 0)
    const avgDuration = connected > 0 ? Math.round(totalDuration / connected) : 0
    const fmt = (s: number): string => {
      if (s <= 0) return '0秒'
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
      if (h > 0) return `${h}时${m}分${sec}秒`
      if (m > 0) return `${m}分${sec}秒`
      return `${sec}秒`
    }
    return { connected, notConnected, totalCalls, totalDuration: fmt(totalDuration), avgDuration: connected > 0 ? fmt(avgDuration) : '-' }
  }, [data?.items])

  const handleOpenPlayer = (item: YunkeCallLogItem) => {
    if (!item.recordFile) return
    setSelectedItem(item)
    setDialogOpen(true)
  }

  const columns: ColumnProps<YunkeCallLogItem>[] = [
    {
      title: '通话时间', dataIndex: 'startCallTime', width: 100,
      render: (text) => <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>{formatTime(text as string)}</span>,
    },
    {
      title: '类型', dataIndex: 'incomingCall', width: 60,
      render: (val) => {
        const info = getCallTypeInfo(val as number)
        const Icon = info.icon
        return <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon style={{ width: 12, height: 12, color: info.color }} /><span style={{ fontSize: 13 }}>{info.label}</span></div>
      },
    },
    {
      title: '结果', dataIndex: 'callStatus', width: 70,
      render: (_val, record) => {
        if (!record) return null
        const info = getCallResultInfo(record.callStatus, record.callSeconds)
        return <Tag size="small" color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '时长', dataIndex: 'callSeconds', width: 70,
      render: (val, record) => {
        if (!record) return null
        const hasAnswer = record.callSeconds > 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            {hasAnswer ? <Phone style={{ width: 12, height: 12, color: '#00b42a' }} /> : <PhoneOff style={{ width: 12, height: 12, color: 'var(--semi-color-text-2)' }} />}
            <span style={{ color: hasAnswer ? '#16a34a' : 'var(--semi-color-text-2)' }}>{formatDuration(val as number)}</span>
          </div>
        )
      },
    },
    {
      title: '录音', dataIndex: 'recordFile', width: 50,
      render: (val, record) => {
        if (!record) return null
        return val ? (
          <Button theme="borderless" icon={<Play style={{ width: 14, height: 14 }} />} onClick={() => handleOpenPlayer(record)} />
        ) : <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
      },
    },
    {
      title: '员工', dataIndex: 'userIdName', width: 80,
      render: (text) => <span style={{ fontSize: 13 }}>{(text as string) || '-'}</span>,
    },
    {
      title: '部门', dataIndex: 'departmentList',
      render: (text) => <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>{text !== '该部门不存在' ? text : '-'}</span>,
    },
  ]

  // showHeader 模式
  if (showHeader) {
    const headerContent = (
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', background: 'var(--semi-color-fill-0)',
          cursor: collapsible ? 'pointer' : undefined,
          borderBottom: collapsible ? undefined : '1px solid var(--semi-color-border)',
        }}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Phone style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>云客通话记录</span>
          {callStats.totalCalls > 0 && <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginLeft: 8 }}>({callStats.totalCalls} 条)</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!collapsible && callStats.totalCalls > 0 && (
            <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', display: 'flex', gap: 12 }}>
              <span>接通 <span style={{ color: '#16a34a', fontWeight: 500 }}>{callStats.connected}</span></span>
              <span>未接通 <span style={{ color: '#ef4444', fontWeight: 500 }}>{callStats.notConnected}</span></span>
              <span>总通时 <span style={{ fontWeight: 500 }}>{callStats.totalDuration}</span></span>
            </div>
          )}
          {collapsible && (
            <IconChevronDown style={{ fontSize: 16, color: 'var(--semi-color-text-2)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          )}
        </div>
      </div>
    )

    const mainContent = (
      <>
        {collapsible && callStats.totalCalls > 0 && (
          <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', display: 'flex', gap: 12, padding: '8px 16px', background: 'var(--semi-color-fill-0)', borderBottom: '1px solid var(--semi-color-border)' }}>
            <span>接通 <span style={{ color: '#16a34a', fontWeight: 500 }}>{callStats.connected}</span></span>
            <span>未接通 <span style={{ color: '#ef4444', fontWeight: 500 }}>{callStats.notConnected}</span></span>
            <span>总通话 <span style={{ fontWeight: 500 }}>{callStats.totalCalls}</span></span>
            <span>总通时 <span style={{ fontWeight: 500 }}>{callStats.totalDuration}</span></span>
            <span>平均通时 <span style={{ fontWeight: 500 }}>{callStats.avgDuration}</span></span>
          </div>
        )}
        <div style={{ maxHeight: 300, overflow: 'auto', padding: 16 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(3)].map((_, i) => (
                <Skeleton.Paragraph key={i} rows={1} style={{ width: '100%' }} />
              ))}
            </div>
          ) : isError ? (
            <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>
              查询失败: {(error as Error)?.message || '未知错误'}
            </div>
          ) : !paginated.items.length ? (
            <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>
              暂无通话记录
            </div>
          ) : (
            <Table columns={columns} dataSource={paginated.items} rowKey="id" pagination={false} size="small" />
          )}
        </div>
        {paginated.total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--semi-color-text-2)' }}>每页</span>
              <Select value={pageSize} onChange={(val) => { setPageSize(val as number); setPage(1) }} optionList={[5, 10, 20].map(s => ({ label: String(s), value: s }))} style={{ width: 70 }} size="small" />
              <span style={{ color: 'var(--semi-color-text-2)' }}>条</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button theme="light" disabled={page <= 1} onClick={() => setPage(page - 1)} icon={<ChevronLeft style={{ width: 16, height: 16 }} />} />
              <span style={{ fontSize: 12, padding: '0 8px' }}>{page} / {paginated.totalPages || 1}</span>
              <Button theme="light" disabled={page >= paginated.totalPages} onClick={() => setPage(page + 1)} icon={<ChevronRight style={{ width: 16, height: 16 }} />} />
            </div>
          </div>
        )}
      </>
    )

    return (
      <>
        {collapsible ? (
          <>
            {headerContent}
            {isOpen && mainContent}
          </>
        ) : (
          <>
            {headerContent}
            {mainContent}
          </>
        )}
        <AudioPlayerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} item={selectedItem} />
      </>
    )
  }

  // 非 showHeader 模式
  if (isLoading) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...Array(3)].map((_, i) => <Skeleton.Paragraph key={i} rows={1} style={{ width: '100%' }} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className={className} style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>
        查询失败: {(error as Error)?.message || '未知错误'}
      </div>
    )
  }

  if (!data?.items?.length) {
    return (
      <div className={className} style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>
        暂无通话记录
      </div>
    )
  }

  return (
    <div className={className}>
      <Table columns={columns} dataSource={data.items} rowKey="id" pagination={false} size="small" />
      {data.total > 20 && (
        <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '8px 0', borderTop: '1px solid var(--semi-color-border)' }}>
          共 {data.total} 条记录，仅显示最近 20 条
        </div>
      )}
      <AudioPlayerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} item={selectedItem} />
    </div>
  )
}
