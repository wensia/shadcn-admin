/**
 * 录音详情弹窗
 * 顶部音频播放器 + 下方标签页（转写文本 / AI 分析）
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Volume2, VolumeX, Phone, SkipBack, SkipForward, Download, FileText, BrainCircuit, Loader2, Copy, FileJson, FileType } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatTime } from '@/lib/utils/time'

import { toast } from 'sonner'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { callRecordsApi } from '../../api'
import { TranscriptViewer } from './transcript-viewer'
import { AIAnalysisPanel } from './ai-analysis-panel'
import type { CallRecord, TranscriptSegment } from '../../types'

interface RecordDetailModalProps {
  record: CallRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 将转写文本格式化为可读对话文本
 */
function formatTranscriptText(transcript: TranscriptSegment[]): string {
  return transcript.map((seg) => {
    const speaker = seg.speaker.toLowerCase()
    const role =
      speaker.includes('agent') || speaker.includes('员工') || speaker.includes('staff') || speaker === '0'
        ? '员工'
        : '客户'
    const mins = Math.floor(seg.start_time / 60)
    const secs = Math.floor(seg.start_time % 60)
    const time = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    return `${role} [${time}]: ${seg.text}`
  }).join('\n')
}

/**
 * 格式化播放时间
 */
function formatPlayTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function RecordDetailModal({ record: recordProp, open, onOpenChange }: RecordDetailModalProps) {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  // 懒加载完整记录（含 transcript 和 ai_analysis）
  const [fullRecord, setFullRecord] = useState<CallRecord | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  useEffect(() => {
    if (open && recordProp) {
      setIsDetailLoading(true)
      callRecordsApi.getCallRecord(recordProp.id)
        .then(data => setFullRecord(data))
        .catch(err => showApiErrorToast(err, '加载详情失败'))
        .finally(() => setIsDetailLoading(false))
    } else {
      setFullRecord(null)
    }
  }, [open, recordProp?.id])

  // 头部信息使用列表数据（recordProp），内容面板使用完整数据（fullRecord）
  const record = recordProp

  // 是否正在轮询分析状态
  const isPolling = (fullRecord?.ai_analysis_status ?? record?.ai_analysis_status) === 'processing'

  // 轮询 AI 分析状态（每 3 秒，仅在 processing 状态时启用）
  useQuery({
    queryKey: ['analysis-status', record?.id],
    queryFn: () => callRecordsApi.getAnalysisStatus(record!.id),
    enabled: !!record?.id && open && isPolling,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    select: useCallback((data: { status: string; analysis: any; error: string | null; analyzed_at: string | null }) => {
      if (data.status === 'completed' && data.analysis) {
        setFullRecord((prev) =>
          prev
            ? {
                ...prev,
                ai_analysis: data.analysis,
                ai_analysis_status: 'completed',
                ai_analyzed_at: data.analyzed_at,
              }
            : prev
        )
        toast.success('AI 分析完成')
        queryClient.invalidateQueries({ queryKey: ['call-records'] })
      } else if (data.status === 'failed') {
        setFullRecord((prev) =>
          prev
            ? { ...prev, ai_analysis_status: 'failed' }
            : prev
        )
        toast.error(`分析失败: ${data.error || '未知错误'}`)
      }
      return data
    }, [queryClient]),
  })

  // 从录音 URL 中提取 voiceId（有转写文本说明有录音）
  const hasTranscript = record?.has_transcript || (fullRecord?.transcript && fullRecord.transcript.length > 0)
  const voiceId = (record?.has_recording || hasTranscript)
    ? record?.record_id || ''
    : ''

  // 获取录音 URL
  const { data: recordUrlData, isLoading: isLoadingUrl } = useQuery({
    queryKey: ['record-url', voiceId],
    queryFn: () => callRecordsApi.getRecordUrl(voiceId),
    enabled: !!voiceId && open,
    staleTime: 30 * 60 * 1000, // 30 分钟缓存
  })

  const audioUrl = recordUrlData?.url || ''

  // AI 分析 mutation（提交异步任务，立即返回）
  const analyzeMutation = useMutation({
    mutationFn: () => callRecordsApi.analyzeCallRecord(record!.id),
    onSuccess: () => {
      // 立即将本地状态设为 processing，触发轮询
      setFullRecord((prev) =>
        prev
          ? { ...prev, ai_analysis_status: 'processing' }
          : prev
      )
    },
    onError: (error: Error) => {
      toast.error(`提交分析失败: ${error.message}`)
    },
  })

  // 重置播放状态
  useEffect(() => {
    if (!open) {
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
    }
  }, [open])

  // 处理播放/暂停
  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // 快退 10 秒
  const skipBackward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
  }

  // 快进 10 秒
  const skipForward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10)
  }

  // 处理进度条拖动
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return
    const time = value[0]
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  // 处理音量调整
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return
    const vol = value[0]
    audioRef.current.volume = vol
    setVolume(vol)
    setIsMuted(vol === 0)
  }

  // 处理静音
  const toggleMute = () => {
    if (!audioRef.current) return
    const newMuted = !isMuted
    audioRef.current.muted = newMuted
    setIsMuted(newMuted)
  }

  // 处理转写文本点击跳转
  const handleTranscriptSeek = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
    if (!isPlaying) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // 有转写文本说明有录音，或者 has_recording 为 true
  const hasRecording = record?.has_recording || hasTranscript

  const fullTranscript = fullRecord?.transcript
  const hasFullTranscript = fullTranscript && fullTranscript.length > 0

  const renderTranscriptPanel = () => (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* 播放器 + 工具栏 */}
      <div className="shrink-0 border-b px-4 py-2 space-y-2">
        {hasRecording && (
          <>
            {isLoadingUrl ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-1.5 flex-1 rounded" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : audioUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={skipBackward} aria-label="快退 10 秒">
                    <SkipBack className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button variant="default" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={togglePlay} aria-label={isPlaying ? '暂停播放' : '开始播放'}>
                    {isPlaying ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5 ml-0.5" aria-hidden="true" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={skipForward} aria-label="快进 10 秒">
                    <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <span className="w-[34px] shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {formatPlayTime(currentTime)}
                  </span>
                </div>

                <div className="flex min-w-[140px] flex-1 items-center gap-2">
                  <Slider value={[currentTime]} max={duration || 100} step={0.1} onValueChange={handleSeek} className="min-w-0 flex-1 cursor-pointer" />
                  <span className="w-[34px] shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {formatPlayTime(duration)}
                  </span>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <div className="hidden h-4 w-px bg-border sm:block" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={toggleMute} aria-label={isMuted || volume === 0 ? '取消静音' : '静音'}>
                    {isMuted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  </Button>
                  <Slider value={[isMuted ? 0 : volume]} max={1} step={0.1} onValueChange={handleVolumeChange} className="w-14 cursor-pointer shrink-0 sm:w-16" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                    <a href={audioUrl} download={`${record?.staff_name || '录音'}_${record?.callee || record?.caller || ''}.mp3`} aria-label="下载录音">
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-xs py-1">
                无法获取录音地址
              </div>
            )}
          </>
        )}
        {hasFullTranscript && (
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                  <Copy className="mr-1 h-3 w-3" aria-hidden="true" />
                  复制
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const text = formatTranscriptText(fullTranscript || [])
                    navigator.clipboard.writeText(text)
                    toast.success('已复制格式化对话文本')
                  }}
                >
                  <FileType className="mr-2 h-4 w-4" aria-hidden="true" />
                  复制对话文本
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const json = JSON.stringify(fullTranscript || [], null, 2)
                    navigator.clipboard.writeText(json)
                    toast.success('已复制原始 JSON')
                  }}
                >
                  <FileJson className="mr-2 h-4 w-4" aria-hidden="true" />
                  复制原始 JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {isDetailLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
            加载转写文本...
          </div>
        ) : hasFullTranscript ? (
          <TranscriptViewer
            transcript={fullTranscript || []}
            currentTime={currentTime}
            onSeek={handleTranscriptSeek}
          />
        ) : (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
            {hasRecording ? '暂无转写文本' : '此通话无录音'}
          </div>
        )}
      </div>
    </div>
  )

  // 使用 fullRecord 的分析状态（如果已加载），否则回退到列表数据
  const analysisStatus = fullRecord?.ai_analysis_status ?? record?.ai_analysis_status

  const renderAnalysisPanel = () => (
    <div className="flex-1 min-h-0 flex flex-col">
      {analysisStatus === 'completed' && (
        <div className="px-4 py-1.5 shrink-0 border-b flex items-center justify-end gap-2">
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            已分析
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending || isPolling || isDetailLoading}
          >
            {analyzeMutation.isPending || isPolling ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                分析中…
              </>
            ) : (
              '重新分析'
            )}
          </Button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isDetailLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
            加载 AI 分析...
          </div>
        ) : fullRecord ? (
          <AIAnalysisPanel
            record={fullRecord}
            isAnalyzing={analyzeMutation.isPending || isPolling}
            onAnalyze={() => analyzeMutation.mutate()}
          />
        ) : record ? (
          <AIAnalysisPanel
            record={record}
            isAnalyzing={analyzeMutation.isPending || isPolling}
            onAnalyze={() => analyzeMutation.mutate()}
          />
        ) : null}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !h-screen !w-screen !max-w-none !rounded-none overflow-hidden p-0 flex flex-col gap-0">
        {/* 头部：通话信息 */}
        <div className="shrink-0 border-b">
          <DialogHeader className="px-5 pr-12 pt-4 pb-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" aria-hidden="true" />
                通话详情
              </DialogTitle>
              <DialogDescription className="mt-0 flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                {record && (
                  <>
                    <span className="max-w-[120px] truncate text-xs sm:max-w-[160px]">{record.staff_name || '未知员工'}</span>
                    <span className="text-muted-foreground text-xs">&rarr;</span>
                    <span className="max-w-[140px] truncate font-mono text-xs sm:max-w-[180px]">{record.callee || record.caller || '-'}</span>
                    <Badge variant="secondary" className="h-5 text-[11px]">{formatTime(record.call_time)}</Badge>
                  </>
                )}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        {/* 内容区：标签页切换 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs defaultValue="transcript" className="flex h-full min-h-0 flex-col gap-0">
            <div className="shrink-0 border-b px-3 py-2">
              <TabsList className="grid h-8 w-full grid-cols-2">
                <TabsTrigger value="transcript" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  转写文本
                </TabsTrigger>
                <TabsTrigger value="analysis" className="gap-1.5 text-xs">
                  <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
                  AI 分析
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="transcript" className="m-0 flex flex-1 min-h-0 flex-col overflow-hidden">
              {renderTranscriptPanel()}
            </TabsContent>
            <TabsContent value="analysis" className="m-0 flex flex-1 min-h-0 flex-col overflow-hidden">
              {renderAnalysisPanel()}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
