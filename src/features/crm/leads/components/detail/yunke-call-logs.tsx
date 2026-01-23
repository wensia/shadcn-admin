/**
 * 云客通话记录列表组件
 * 用于在线索详情中展示该线索的通话记录
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { callRecordsApi } from '@/features/yunke/api'
import type { YunkeCallLogItem } from '@/features/yunke/types'

interface YunkeCallLogsProps {
  /** 电话号码 */
  phone: string
  /** 自定义类名 */
  className?: string
  /** 是否显示标题栏（用于跟进记录Tab的50%布局） */
  showHeader?: boolean
  /** 是否可折叠（仅在 showHeader 模式下有效） */
  collapsible?: boolean
  /** 默认是否折叠（仅在 collapsible 为 true 时有效） */
  defaultCollapsed?: boolean
}

/**
 * 格式化通话时长
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

/**
 * 格式化音频时间 (mm:ss)
 */
function formatAudioTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化时间
 */
function formatTime(timeStr: string): string {
  if (!timeStr) return '-'
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return timeStr
  }
}

/**
 * 获取通话类型图标和标签
 * @param incomingCall 0=外呼, 1=呼入
 */
function getCallTypeInfo(incomingCall: number) {
  if (incomingCall === 0) {
    return { icon: PhoneOutgoing, label: '外呼', color: 'text-blue-500' }
  }
  if (incomingCall === 1) {
    return { icon: PhoneIncoming, label: '呼入', color: 'text-green-500' }
  }
  return { icon: Phone, label: '-', color: 'text-muted-foreground' }
}

/**
 * 获取通话结果样式
 * @param callStatus 0=未接通, 2=已接通
 * @param callSeconds 通话时长（秒）
 */
function getCallResultStyle(callStatus: number, callSeconds: number) {
  if (callStatus === 2 || callSeconds > 0) {
    return { label: '已接通', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-500/80' }
  }
  return { label: '未接通', variant: 'secondary' as const, className: '' }
}

/**
 * 获取录音播放 URL
 */
function getAudioUrl(recordFile: string): string {
  // 检查是否是直接的音频文件 URL
  const isDirectAudioUrl = /\.(mp3|wav|m4a|ogg|aac)(\?|$)/i.test(recordFile)

  if (isDirectAudioUrl) {
    return recordFile
  }

  // 尝试从 URL 中提取 voiceId 参数
  const voiceIdMatch = recordFile.match(/voiceId=([^&]+)/)
  const voiceId = voiceIdMatch ? voiceIdMatch[1] : null

  if (voiceId) {
    return callRecordsApi.getRecordStreamUrl(voiceId)
  }

  return recordFile
}

/**
 * 音频播放弹窗组件
 */
interface AudioPlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: YunkeCallLogItem | null
}

function AudioPlayerDialog({ open, onOpenChange, item }: AudioPlayerDialogProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 重置状态
  const resetState = useCallback(() => {
    setIsPlaying(false)
    setIsLoading(true)
    setCurrentTime(0)
    setDuration(0)
    setError(null)
  }, [])

  // 当弹窗打开时初始化音频
  useEffect(() => {
    if (!open || !item?.recordFile) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      resetState()
      return
    }

    const audioUrl = getAudioUrl(item.recordFile)
    const audio = new Audio(audioUrl)
    audioRef.current = audio

    // 事件监听
    audio.onloadedmetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    audio.oncanplay = () => {
      setIsLoading(false)
    }

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime)
    }

    audio.onended = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.onerror = () => {
      setIsLoading(false)
      setError('播放失败，请稍后重试')
    }

    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)

    // 清理
    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [open, item, resetState])

  // 播放/暂停
  const togglePlay = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        await audioRef.current.play()
      }
    } catch (err) {
      console.error('播放失败:', err)
      setError('播放失败')
    }
  }

  // 进度条拖动
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return
    const newTime = value[0]
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // 静音切换
  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  if (!item) return null

  const typeInfo = getCallTypeInfo(item.incomingCall)
  const TypeIcon = typeInfo.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            通话录音
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 通话信息 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-3">
            <div className="flex items-center gap-2">
              <TypeIcon className={cn('h-4 w-4', typeInfo.color)} />
              <span>{typeInfo.label}</span>
              <span>·</span>
              <span>{item.userIdName || '未知员工'}</span>
            </div>
            <span>{formatTime(item.startCallTime)}</span>
          </div>

          {/* 播放器 */}
          <div className="space-y-3">
            {error ? (
              <div className="text-center py-4 text-sm text-destructive">{error}</div>
            ) : (
              <>
                {/* 进度条 */}
                <div className="space-y-2">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatAudioTime(currentTime)}</span>
                    <span>{formatAudioTime(duration)}</span>
                  </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleMute}
                    disabled={isLoading}
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    variant="default"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={togglePlay}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>

                  <div className="w-8" /> {/* 占位，保持居中 */}
                </div>
              </>
            )}
          </div>

          {/* 通话时长信息 */}
          <div className="text-center text-xs text-muted-foreground">
            通话时长: {formatDuration(item.callSeconds)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function YunkeCallLogs({ phone, className, showHeader = false, collapsible = false, defaultCollapsed = false }: YunkeCallLogsProps) {
  const s = useStyleClasses()
  const [selectedItem, setSelectedItem] = useState<YunkeCallLogItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // 分页状态
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // 查询通话记录
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['yunke-call-logs', phone],
    queryFn: () => callRecordsApi.searchByPhone({ phone, size: 100 }),
    enabled: !!phone,
    staleTime: 30 * 1000,
  })

  // 分页计算
  const paginated = useMemo(() => {
    const allItems = data?.items || []
    const total = allItems.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const items = allItems.slice(startIndex, startIndex + pageSize)
    return { items, total, totalPages }
  }, [data?.items, page, pageSize])

  // 通话统计汇总
  const callStats = useMemo(() => {
    const allItems = data?.items || []
    const connected = allItems.filter(item => item.callSeconds > 0 || item.callStatus === 2).length
    const notConnected = allItems.length - connected
    const totalCalls = allItems.length
    const totalDuration = allItems.reduce((sum, item) => sum + (item.callSeconds || 0), 0)
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / connected) : 0

    // 格式化总通时
    const formatTotalDuration = (seconds: number): string => {
      if (seconds <= 0) return '0秒'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      if (hours > 0) {
        return `${hours}时${minutes}分${secs}秒`
      }
      if (minutes > 0) {
        return `${minutes}分${secs}秒`
      }
      return `${secs}秒`
    }

    return {
      connected,
      notConnected,
      totalCalls,
      totalDuration: formatTotalDuration(totalDuration),
      avgDuration: connected > 0 ? formatTotalDuration(avgDuration) : '-'
    }
  }, [data?.items])

  // 打开播放弹窗
  const handleOpenPlayer = (item: YunkeCallLogItem) => {
    if (!item.recordFile) return
    setSelectedItem(item)
    setDialogOpen(true)
  }

  // showHeader 模式下的完整布局
  if (showHeader) {
    // 标题栏
    const headerContent = (
      <div className={cn(
        "flex items-center justify-between px-4 py-2 bg-muted/30",
        collapsible ? "cursor-pointer hover:bg-muted/50 transition-colors group" : "border-b"
      )}>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <h4 className={cn(s.text.sm, 'font-medium')}>云客通话记录</h4>
          {callStats.totalCalls > 0 && (
            <span className={cn(s.text.xs, 'text-muted-foreground ml-2')}>
              ({callStats.totalCalls} 条)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* 统计信息 - 非折叠模式或展开时显示完整统计 */}
          {!collapsible && callStats.totalCalls > 0 && (
            <div className={cn(s.text.xs, 'text-muted-foreground flex items-center gap-3')}>
              <span>
                接通 <span className="text-green-600 font-medium">{callStats.connected}</span>
              </span>
              <span>
                未接通 <span className="text-red-500 font-medium">{callStats.notConnected}</span>
              </span>
              <span>
                总通时 <span className="font-medium">{callStats.totalDuration}</span>
              </span>
            </div>
          )}
          {collapsible && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className={cn(s.text.xs, 'group-data-[state=open]:hidden')}>点击展开</span>
              <span className={cn(s.text.xs, 'hidden group-data-[state=open]:inline')}>点击收起</span>
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            </div>
          )}
        </div>
      </div>
    )

    // 内容区域
    const mainContent = (
      <>
        {/* 展开后显示完整统计信息 */}
        {collapsible && callStats.totalCalls > 0 && (
          <div className={cn(s.text.xs, 'text-muted-foreground flex items-center gap-3 px-4 py-2 bg-muted/20 border-b')}>
            <span>
              接通 <span className="text-green-600 font-medium">{callStats.connected}</span>
            </span>
            <span>
              未接通 <span className="text-red-500 font-medium">{callStats.notConnected}</span>
            </span>
            <span>
              总通话 <span className="font-medium">{callStats.totalCalls}</span>
            </span>
            <span>
              总通时 <span className="font-medium">{callStats.totalDuration}</span>
            </span>
            <span>
              平均通时 <span className="font-medium">{callStats.avgDuration}</span>
            </span>
          </div>
        )}
        <ScrollArea className="flex-1 max-h-[300px]">
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24 flex-1" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4')}>
                查询失败: {(error as Error)?.message || '未知错误'}
              </div>
            ) : !paginated.items.length ? (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4')}>
                暂无通话记录
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(s.text.xs, 'w-[100px]')}>通话时间</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[60px]')}>类型</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[70px]')}>结果</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[70px]')}>时长</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[50px]')}>录音</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[80px]')}>员工</TableHead>
                    <TableHead className={cn(s.text.xs)}>部门</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.items.map((item: YunkeCallLogItem) => {
                    const typeInfo = getCallTypeInfo(item.incomingCall)
                    const resultStyle = getCallResultStyle(item.callStatus, item.callSeconds)
                    const TypeIcon = typeInfo.icon
                    const hasAnswer = item.callSeconds > 0

                    return (
                      <TableRow key={item.id}>
                        <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                          {formatTime(item.startCallTime)}
                        </TableCell>
                        <TableCell className={s.text.xs}>
                          <div className="flex items-center gap-1">
                            <TypeIcon className={cn('h-3 w-3', typeInfo.color)} />
                            <span>{typeInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className={s.text.xs}>
                          <Badge
                            variant={resultStyle.variant}
                            className={cn(s.text.xs, s.roundedBadge, s.height.badge, resultStyle.className)}
                          >
                            {resultStyle.label}
                          </Badge>
                        </TableCell>
                        <TableCell className={s.text.xs}>
                          <div className="flex items-center gap-1">
                            {hasAnswer ? (
                              <Phone className="h-3 w-3 text-green-500" />
                            ) : (
                              <PhoneOff className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={hasAnswer ? 'text-green-600' : 'text-muted-foreground'}>
                              {formatDuration(item.callSeconds)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={s.text.xs}>
                          {item.recordFile ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleOpenPlayer(item)}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className={s.text.xs}>
                          {item.userIdName || '-'}
                        </TableCell>
                        <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                          {item.departmentList !== '该部门不存在' ? item.departmentList : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </ScrollArea>
        {/* 分页器 */}
        {paginated.total > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
            <div className={cn('flex items-center gap-2', s.text.xs)}>
              <span className="text-muted-foreground">每页</span>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-7 w-[60px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20].map((size) => (
                    <SelectItem key={size} value={`${size}`} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">条</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className={cn(s.text.xs, 'px-2')}>
                {page} / {paginated.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage(page + 1)}
                disabled={page >= paginated.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </>
    )

    // 可折叠模式
    if (collapsible) {
      return (
        <>
          <Collapsible defaultOpen={!defaultCollapsed}>
            <CollapsibleTrigger asChild>
              {headerContent}
            </CollapsibleTrigger>
            <CollapsibleContent>
              {mainContent}
            </CollapsibleContent>
          </Collapsible>

          {/* 音频播放弹窗 */}
          <AudioPlayerDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            item={selectedItem}
          />
        </>
      )
    }

    // 非折叠模式
    return (
      <>
        {headerContent}
        {mainContent}

        {/* 音频播放弹窗 */}
        <AudioPlayerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={selectedItem}
        />
      </>
    )
  }

  // 原有的非 showHeader 模式
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4', className)}>
        查询失败: {(error as Error)?.message || '未知错误'}
      </div>
    )
  }

  if (!data?.items?.length) {
    return (
      <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4', className)}>
        暂无通话记录
      </div>
    )
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(s.text.xs, 'w-[100px]')}>通话时间</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[60px]')}>类型</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[70px]')}>结果</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[70px]')}>时长</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[50px]')}>录音</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[80px]')}>员工</TableHead>
            <TableHead className={cn(s.text.xs)}>部门</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item: YunkeCallLogItem) => {
            const typeInfo = getCallTypeInfo(item.incomingCall)
            const resultStyle = getCallResultStyle(item.callStatus, item.callSeconds)
            const TypeIcon = typeInfo.icon
            const hasAnswer = item.callSeconds > 0

            return (
              <TableRow key={item.id}>
                <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                  {formatTime(item.startCallTime)}
                </TableCell>
                <TableCell className={s.text.xs}>
                  <div className="flex items-center gap-1">
                    <TypeIcon className={cn('h-3 w-3', typeInfo.color)} />
                    <span>{typeInfo.label}</span>
                  </div>
                </TableCell>
                <TableCell className={s.text.xs}>
                  <Badge
                    variant={resultStyle.variant}
                    className={cn(s.text.xs, s.roundedBadge, s.height.badge, resultStyle.className)}
                  >
                    {resultStyle.label}
                  </Badge>
                </TableCell>
                <TableCell className={s.text.xs}>
                  <div className="flex items-center gap-1">
                    {hasAnswer ? (
                      <Phone className="h-3 w-3 text-green-500" />
                    ) : (
                      <PhoneOff className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={hasAnswer ? 'text-green-600' : 'text-muted-foreground'}>
                      {formatDuration(item.callSeconds)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={s.text.xs}>
                  {item.recordFile ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleOpenPlayer(item)}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className={s.text.xs}>
                  {item.userIdName || '-'}
                </TableCell>
                <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                  {item.departmentList !== '该部门不存在' ? item.departmentList : '-'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {data.total > 20 && (
        <div className={cn(s.text.xs, 'text-muted-foreground text-center py-2 border-t')}>
          共 {data.total} 条记录，仅显示最近 20 条
        </div>
      )}

      {/* 音频播放弹窗 */}
      <AudioPlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
      />
    </div>
  )
}
