/**
 * 线索通话记录组件（本地数据库版本，含 AI 分析数据）
 *
 * 替代 YunkeCallLogs 组件，使用本地数据库数据，
 * 展示 AI 意向、质量评分、摘要等信息。
 */

import { useState, useRef, useEffect, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  PhoneOutgoing,
  PhoneIncoming,
  Phone,
  Play,
  Pause,
  Loader2,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Brain,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { getLeadCallRecords, type LeadCallRecord, type TranscriptSegment } from '../../api'
import { callRecordsApi } from '@/features/yunke/api'

interface LeadCallRecordsProps {
  leadId: string
  className?: string
  showHeader?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) return `${minutes}分${secs}秒`
  return `${secs}秒`
}

function formatTime(timeStr: string | null): string {
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

function formatAudioTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/** AI 意向等级 badge */
function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent || intent === 'none') return null

  const config: Record<string, { label: string; className: string }> = {
    high: { label: '高意向', className: 'bg-red-500 hover:bg-red-500/80 text-white' },
    medium: { label: '中意向', className: 'bg-orange-500 hover:bg-orange-500/80 text-white' },
    low: { label: '低意向', className: 'bg-gray-400 hover:bg-gray-400/80 text-white' },
  }

  const c = config[intent]
  if (!c) return null

  return (
    <Badge variant="default" className={cn('text-[10px] h-4 px-1', c.className)}>
      {c.label}
    </Badge>
  )
}

/** AI 评分 badge */
function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null

  let className = 'bg-gray-400'
  if (score >= 80) className = 'bg-green-500'
  else if (score >= 60) className = 'bg-blue-500'
  else if (score >= 40) className = 'bg-orange-500'
  else className = 'bg-red-500'

  return (
    <Badge variant="default" className={cn('text-[10px] h-4 px-1 text-white', className)}>
      {score}分
    </Badge>
  )
}

/** 转录文本查看弹窗 */
function TranscriptDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LeadCallRecord | null
}) {
  if (!item?.transcript?.length) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            转录文本 — {item.staff_name || '未知'} → {item.callee || '未知'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 max-h-[60vh] pr-4">
          <div className="space-y-3 py-2">
            {item.transcript.map((seg: TranscriptSegment, i: number) => {
              const isStaff = seg.speaker === '客服' || seg.speaker === 'agent' || seg.speaker === '坐席'
              return (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2',
                    isStaff ? 'flex-row' : 'flex-row-reverse'
                  )}
                >
                  <Badge
                    variant={isStaff ? 'default' : 'secondary'}
                    className="h-5 px-1.5 text-[10px] shrink-0 self-start mt-0.5"
                  >
                    {seg.speaker}
                  </Badge>
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs leading-relaxed max-w-[80%]',
                      isStaff
                        ? 'bg-primary/10 text-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {seg.text}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

/** 音频播放器弹窗 */
function AudioPlayerDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LeadCallRecord | null
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  const audioUrl = item?.recording_url
    ? (() => {
        const match = item.recording_url.match(/voiceId=([^&]+)/)
        return match ? callRecordsApi.getRecordStreamUrl(match[1]) : item.recording_url
      })()
    : null

  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlaying(false)
      setIsLoading(true)
      setCurrentTime(0)
    }
  }, [open])

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  if (!item || !audioUrl) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-sm">
            录音播放 - {item.staff_name || '未知'} → {item.callee || '未知'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <audio
            ref={audioRef}
            src={audioUrl}
            onLoadedMetadata={(e) => {
              setDuration((e.target as HTMLAudioElement).duration)
              setIsLoading(false)
            }}
            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
            onEnded={() => setIsPlaying(false)}
            onError={() => setIsLoading(false)}
          />

          {/* 进度条 */}
          <div className="space-y-1">
            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={0.1}
              onValueChange={([val]) => {
                if (audioRef.current) audioRef.current.currentTime = val
                setCurrentTime(val)
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>

          {/* 控制栏 */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsMuted(!isMuted)
                if (audioRef.current) audioRef.current.muted = !isMuted
              }}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <Button
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handlePlayPause}
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

            <a href={audioUrl} download target="_blank" rel="noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function LeadCallRecords({
  leadId,
  className,
  showHeader = true,
  collapsible = false,
  defaultCollapsed = false,
}: LeadCallRecordsProps) {
  const s = useStyleClasses()
  const [isOpen, setIsOpen] = useState(!defaultCollapsed)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [playingItem, setPlayingItem] = useState<LeadCallRecord | null>(null)
  const [transcriptItem, setTranscriptItem] = useState<LeadCallRecord | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['lead-call-records', leadId, page],
    queryFn: async () => {
      const response = await getLeadCallRecords(leadId, { page, size: pageSize })
      return response.data  // PaginatedResponse
    },
    enabled: !!leadId && isOpen,
  })

  const records = data?.items || []
  const total = data?.total || 0
  const totalPages = data?.pages || Math.ceil(total / pageSize)

  const content = (
    <div className={cn('flex flex-col', className)}>
      {isLoading ? (
        <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4')}>加载中...</div>
      ) : records.length === 0 ? (
        <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4')}>暂无通话记录</div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(s.text.xs, 'w-[110px]')}>通话时间</TableHead>
                  <TableHead className={cn(s.text.xs, 'w-[50px]')}>类型</TableHead>
                  <TableHead className={cn(s.text.xs, 'w-[60px]')}>时长</TableHead>
                  <TableHead className={cn(s.text.xs, 'w-[60px]')}>结果</TableHead>
                  <TableHead className={cn(s.text.xs, 'w-[70px]')}>员工</TableHead>
                  <TableHead className={cn(s.text.xs)}>AI分析</TableHead>
                  <TableHead className={cn(s.text.xs, 'w-[60px]')}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const isConnected = (r.duration || 0) > 0
                  const callTypeIcon =
                    r.call_type === '外呼' ? PhoneOutgoing :
                    r.call_type === '呼入' ? PhoneIncoming : Phone
                  const CallIcon = callTypeIcon

                  return (
                    <TableRow key={r.id}>
                      <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                        {formatTime(r.call_time)}
                      </TableCell>
                      <TableCell>
                        <CallIcon className={cn(
                          'h-3.5 w-3.5',
                          r.call_type === '外呼' ? 'text-blue-500' : 'text-green-500'
                        )} />
                      </TableCell>
                      <TableCell className={s.text.xs}>
                        {formatDuration(r.duration)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isConnected ? 'default' : 'secondary'}
                          className={cn(
                            s.text.xs,
                            'h-4 px-1 rounded-sm',
                            isConnected && 'bg-green-500 hover:bg-green-500/80'
                          )}
                        >
                          {isConnected ? '已接通' : '未接通'}
                        </Badge>
                      </TableCell>
                      <TableCell className={s.text.xs}>
                        {r.staff_name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <IntentBadge intent={r.ai_customer_intent} />
                          <ScoreBadge score={r.ai_quality_score} />
                          {r.ai_summary && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Brain className="h-3.5 w-3.5 text-purple-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <p className="text-xs whitespace-pre-wrap">{r.ai_summary}</p>
                                {r.ai_label_primary && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    标签: {r.ai_label_primary}
                                    {r.ai_label_secondary ? ` / ${r.ai_label_secondary}` : ''}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {r.transcript_status === 'completed' && r.transcript?.length && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setTranscriptItem(r)}
                                >
                                  <FileText className="h-3 w-3 text-blue-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">查看转录文本</TooltipContent>
                            </Tooltip>
                          )}
                          {r.has_recording && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setPlayingItem(r)}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">播放录音</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* 分页器 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
              <span className={cn(s.text.xs, 'text-muted-foreground')}>
                共 {total} 条
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className={cn(s.text.xs, 'px-2')}>
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AudioPlayerDialog
        open={!!playingItem}
        onOpenChange={(open) => !open && setPlayingItem(null)}
        item={playingItem}
      />

      <TranscriptDialog
        open={!!transcriptItem}
        onOpenChange={(open) => !open && setTranscriptItem(null)}
        item={transcriptItem}
      />
    </div>
  )

  if (!showHeader) return content

  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/30 border-b">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className={cn(s.text.sm, 'font-medium')}>通话记录</h4>
              {total > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {total}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>{content}</CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className={cn(s.text.sm, 'font-medium')}>通话记录</h4>
        </div>
        {total > 0 && (
          <span className={cn(s.text.xs, 'text-muted-foreground')}>共 {total} 条</span>
        )}
      </div>
      {content}
    </div>
  )
}

export default LeadCallRecords
