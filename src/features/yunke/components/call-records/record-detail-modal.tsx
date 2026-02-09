/**
 * 录音详情弹窗
 * 顶部音频播放器 + 下方 Tabs（转写文本 / AI 分析）
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Pause, Volume2, VolumeX, Phone, SkipBack, SkipForward, Download, FileText, BrainCircuit } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { callRecordsApi } from '../../api'
import { TranscriptViewer } from './transcript-viewer'
import { AIAnalysisPanel } from './ai-analysis-panel'
import type { CallRecord } from '../../types'

interface RecordDetailModalProps {
  record: CallRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
  const [activeTab, setActiveTab] = useState('transcript')

  // 本地 record 状态，分析完成后可更新
  const [localRecord, setLocalRecord] = useState<CallRecord | null>(recordProp)
  useEffect(() => {
    setLocalRecord(recordProp)
  }, [recordProp])

  const record = localRecord

  // 是否正在轮询分析状态
  const isPolling = record?.ai_analysis_status === 'processing'

  // 轮询 AI 分析状态（每 3 秒，仅在 processing 状态时启用）
  useQuery({
    queryKey: ['analysis-status', record?.id],
    queryFn: () => callRecordsApi.getAnalysisStatus(record!.id),
    enabled: !!record?.id && open && isPolling,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    select: useCallback((data: { status: string; analysis: any; error: string | null; analyzed_at: string | null }) => {
      if (data.status === 'completed' && data.analysis) {
        setLocalRecord((prev) =>
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
        setLocalRecord((prev) =>
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
  const hasTranscript = record?.transcript && record.transcript.length > 0
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
      setLocalRecord((prev) =>
        prev
          ? { ...prev, ai_analysis_status: 'processing', ai_analysis_error: null }
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
      setActiveTab('transcript')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[85vh] p-0 flex flex-col gap-0">
        {/* 头部信息 */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            通话详情
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 pt-2">
            {record && (
              <>
                <span>{record.staff_name || '未知员工'}</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="font-mono">{record.callee || record.caller || '-'}</span>
                <Badge variant="secondary">{formatTime(record.call_time)}</Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* 音频播放器 - 固定在顶部 */}
        {hasRecording && (
          <div className="px-6 py-4 border-y bg-muted/30 shrink-0">
            {isLoadingUrl ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-2 w-full rounded" />
                  <div className="flex justify-between mt-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            ) : audioUrl ? (
              <div className="space-y-3">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* 进度条 */}
                <div>
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                    <span>{formatPlayTime(currentTime)}</span>
                    <span>{formatPlayTime(duration)}</span>
                  </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {/* 快退 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={skipBackward}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>

                    {/* 播放/暂停 */}
                    <Button
                      variant="default"
                      size="icon"
                      className="h-11 w-11 rounded-full"
                      onClick={togglePlay}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </Button>

                    {/* 快进 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={skipForward}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 音量控制 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={toggleMute}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="w-20 cursor-pointer"
                    />

                    {/* 下载录音 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a href={audioUrl} download={`${record?.staff_name || '录音'}_${record?.callee || record?.caller || ''}.mp3`}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-2">
                无法获取录音地址
              </div>
            )}
          </div>
        )}

        {/* Tabs 内容区域 */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className={cn('flex-1 min-h-0 flex flex-col', !hasRecording && 'border-t')}
        >
          <TabsList className="mx-6 mt-3 shrink-0">
            <TabsTrigger value="transcript">
              <FileText className="h-4 w-4 mr-1.5" />
              转写文本
            </TabsTrigger>
            <TabsTrigger value="ai-analysis">
              <BrainCircuit className="h-4 w-4 mr-1.5" />
              AI 分析
              {record?.ai_analysis_status === 'completed' && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  已分析
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="flex-1 min-h-0 overflow-hidden relative mt-0">
            {hasTranscript ? (
              <TranscriptViewer
                transcript={record?.transcript || []}
                currentTime={currentTime}
                onSeek={handleTranscriptSeek}
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                {hasRecording ? '暂无转写文本' : '此通话无录音'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-analysis" className="flex-1 min-h-0 overflow-hidden mt-0">
            {record && (
              <AIAnalysisPanel
                record={record}
                isAnalyzing={analyzeMutation.isPending || isPolling}
                onAnalyze={() => analyzeMutation.mutate()}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
