/**
 * 录音详情弹窗 - 双列布局
 * 顶部：通话信息条
 * 左列：音频播放器 + 转写文本
 * 右列：AI 分析
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SideSheet, Button, Tag, Slider, Skeleton, Dropdown, Toast, Spin, Modal } from '@douyinfe/semi-ui-19'
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  Download, FileText, BrainCircuit, Copy, FileJson, FileType,
  ArrowRight, Clock, Building2, Baby, RotateCcw, RefreshCw, Loader2,
} from 'lucide-react'
import { formatTime } from '@/lib/utils/time'
import { copyToClipboard } from '@/lib/utils'

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

/** Semi 原生色（使用 CSS 变量） */
const BRAND = {
  cardBorder: 'var(--semi-color-border)',
  accent: 'var(--semi-color-primary)',
}

/** 倍速选项 */
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]
type AnalysisStatusResponse = {
  status: string
  analysis: unknown
  error: string | null
  analyzed_at: string | null
}
type SemiTagColor = 'grey' | 'green' | 'orange' | 'blue'

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

/**
 * 格式化通话时长（秒 -> 分秒）
 */
function formatDurationDisplay(seconds: number | null | undefined): string {
  if (seconds == null) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}秒`
  return `${mins}分${secs > 0 ? `${secs}秒` : ''}`
}

/**
 * 获取通话结果颜色
 */
function getCallResultColor(result: string | null | undefined): SemiTagColor {
  if (!result) return 'grey'
  const r = result.toLowerCase()
  if (r.includes('接通') || r.includes('answered') || r.includes('connected')) return 'green'
  if (r.includes('未接') || r.includes('missed') || r.includes('no answer')) return 'red'
  if (r.includes('忙') || r.includes('busy')) return 'orange'
  return 'grey'
}

export function RecordDetailModal({ record: recordProp, open, onOpenChange }: RecordDetailModalProps) {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [reanalyzeConfirmOpen, setReanalyzeConfirmOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // 懒加载完整记录（含 transcript 和 ai_analysis）
  const [fullRecord, setFullRecord] = useState<CallRecord | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const resetPlayerState = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setPlaybackRate(1)
  }, [])

  useEffect(() => {
    if (!open || !recordProp) {
      const frameId = requestAnimationFrame(() => {
        setFullRecord(null)
      })
      return () => cancelAnimationFrame(frameId)
    }

    const frameId = requestAnimationFrame(() => {
      setIsDetailLoading(true)
      callRecordsApi.getCallRecord(recordProp.id)
        .then((data) => setFullRecord(data))
        .catch((err) => showApiErrorToast(err, '加载详情失败'))
        .finally(() => setIsDetailLoading(false))
    })

    return () => cancelAnimationFrame(frameId)
  }, [open, recordProp])

  const record = recordProp

  // 是否正在轮询分析状态
  const isPolling = (fullRecord?.ai_analysis_status ?? record?.ai_analysis_status) === 'processing'

  // 轮询 AI 分析状态
  useQuery({
    queryKey: ['analysis-status', record?.id],
    queryFn: () => callRecordsApi.getAnalysisStatus(record!.id),
    enabled: !!record?.id && open && isPolling,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    select: useCallback((data: AnalysisStatusResponse) => {
      if (data.status === 'completed' && data.analysis) {
        setFullRecord((prev) =>
          prev
            ? { ...prev, ai_analysis: data.analysis, ai_analysis_status: 'completed', ai_analyzed_at: data.analyzed_at }
            : prev
        )
        Toast.success('AI 分析完成')
        queryClient.invalidateQueries({ queryKey: ['call-records'] })
      } else if (data.status === 'failed') {
        setFullRecord((prev) => prev ? { ...prev, ai_analysis_status: 'failed' } : prev)
        Toast.error(`分析失败: ${data.error || '未知错误'}`)
      }
      return data
    }, [queryClient]),
  })

  const hasTranscript = record?.has_transcript || (fullRecord?.transcript && fullRecord.transcript.length > 0)
  const voiceId = (record?.has_recording || hasTranscript) ? record?.record_id || '' : ''

  const { data: recordUrlData, isLoading: isLoadingUrl } = useQuery({
    queryKey: ['record-url', voiceId],
    queryFn: () => callRecordsApi.getRecordUrl(voiceId),
    enabled: !!voiceId && open,
    staleTime: 30 * 60 * 1000,
  })

  const audioUrl = recordUrlData?.url || ''

  const analyzeMutation = useMutation({
    mutationFn: () => callRecordsApi.analyzeCallRecord(record!.id),
    onSuccess: () => {
      setFullRecord((prev) => prev ? { ...prev, ai_analysis_status: 'processing' } : prev)
    },
    onError: (error: Error) => {
      Toast.error(`提交分析失败: ${error.message}`)
    },
  })
  const { mutate: triggerAnalyze, isPending: isAnalyzePending } = analyzeMutation

  // 重置播放状态
  useEffect(() => {
    if (open) return
    const frameId = requestAnimationFrame(() => {
      resetPlayerState()
    })
    return () => cancelAnimationFrame(frameId)
  }, [open, resetPlayerState])

  const handleClose = useCallback(() => {
    resetPlayerState()
    setFullRecord(null)
    setReanalyzeConfirmOpen(false)
    onOpenChange(false)
  }, [onOpenChange, resetPlayerState])

  const handleDownloadRecord = useCallback(async () => {
    if (!voiceId) return
    const baseName = `${record?.staff_name || '录音'}_${record?.callee || record?.caller || ''}`
    setDownloading(true)
    try {
      const blob = await callRecordsApi.downloadRecordBlob(voiceId, baseName)
      if (!blob || blob.size === 0) {
        Toast.error('录音文件为空')
        return
      }
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${baseName}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      showApiErrorToast(err, '下载录音失败')
    } finally {
      setDownloading(false)
    }
  }, [voiceId, record?.staff_name, record?.callee, record?.caller])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const skipBackward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
  }

  const skipForward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10)
  }

  const handleSeek = (val: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = val
    setCurrentTime(val)
  }

  const handleVolumeChange = (val: number) => {
    if (!audioRef.current || !Number.isFinite(val)) return
    const clamped = Math.max(0, Math.min(1, val))
    audioRef.current.volume = clamped
    setVolume(clamped)
    setIsMuted(clamped === 0)
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    const newMuted = !isMuted
    audioRef.current.muted = newMuted
    setIsMuted(newMuted)
  }

  const resetPlayback = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    setCurrentTime(0)
  }

  const cyclePlaybackRate = () => {
    if (!audioRef.current) return
    const idx = PLAYBACK_RATES.indexOf(playbackRate)
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]
    audioRef.current.playbackRate = next
    setPlaybackRate(next)
  }

  const handleTranscriptSeek = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
    if (!isPlaying) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const hasRecording = record?.has_recording || hasTranscript
  const fullTranscript = fullRecord?.transcript
  const hasFullTranscript = fullTranscript && fullTranscript.length > 0
  const analysisStatus = fullRecord?.ai_analysis_status ?? record?.ai_analysis_status

  const handleAnalyzeClick = useCallback(() => {
    if (analysisStatus === 'completed') {
      setReanalyzeConfirmOpen(true)
      return
    }
    triggerAnalyze()
  }, [analysisStatus, triggerAnalyze])

  const handleConfirmReanalyze = useCallback(() => {
    setReanalyzeConfirmOpen(false)
    triggerAnalyze()
  }, [triggerAnalyze])

  return (
    <>
      <SideSheet
        visible={open}
        onCancel={handleClose}
        placement="right"
        width="100vw"
        title={record ? (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--semi-color-text-0)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.staff_name || '未知员工'}
              </span>
              <ArrowRight style={{ height: 14, width: 14, color: 'var(--semi-color-text-3)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.callee || record.caller || '-'}
              </span>
            </div>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--semi-color-text-3)', flexShrink: 0 }} />
            <Tag size="small" color={getCallResultColor(record.call_result)} style={{ height: 20, fontSize: 11 }}>
              {record.call_result || '未知'}
            </Tag>
            <Tag size="small" color="blue" style={{ height: 20, fontSize: 11 }}>
              {record.call_type || '未知'}
            </Tag>
            <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--semi-color-text-2)' }}>
              {formatDurationDisplay(record.duration)}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--semi-color-text-3)', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              <Building2 style={{ height: 12, width: 12, flexShrink: 0 }} />
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.department || '-'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              <Clock style={{ height: 12, width: 12, flexShrink: 0 }} />
              <span>{formatTime(record.call_time) || '-'}</span>
            </div>
            {record.lead_child_name && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--semi-color-text-3)', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <Baby style={{ height: 12, width: 12, color: BRAND.accent, flexShrink: 0 }} />
                  <span style={{ color: BRAND.accent, fontWeight: 500 }}>{record.lead_child_name}</span>
                </div>
              </>
            )}
          </div>
        ) : '通话详情'}
        closable
        closeOnEsc
        headerStyle={{ background: 'var(--semi-color-bg-0)', borderBottom: `1px solid ${BRAND.cardBorder}`, padding: '10px 20px' }}
        bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      >

        {/* ====== 主体：左右双列 ====== */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ===== 左列：播放器 + 转写文本（占 1/3） ===== */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${BRAND.cardBorder}`,
          overflow: 'hidden',
        }}>
          {/* 左列标题栏 */}
          <div style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderBottom: `1px solid ${BRAND.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
              <FileText style={{ height: 14, width: 14 }} aria-hidden="true" />
              转写文本
            </span>
            {/* 复制按钮 */}
            {hasFullTranscript && (
              <Dropdown
                trigger="click"
                position="bottomRight"
                clickToHide
                render={
                  <Dropdown.Menu>
                    <Dropdown.Item
                      onClick={async () => {
                        const text = formatTranscriptText(fullTranscript || [])
                        const ok = await copyToClipboard(text)
                        if (ok) Toast.success('已复制格式化对话文本')
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileType style={{ height: 14, width: 14 }} aria-hidden="true" />
                        复制对话文本
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={async () => {
                        const json = JSON.stringify(fullTranscript || [], null, 2)
                        const ok = await copyToClipboard(json)
                        if (ok) Toast.success('已复制原始 JSON')
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileJson style={{ height: 14, width: 14 }} aria-hidden="true" />
                        复制原始 JSON
                      </span>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                }
              >
                <span>
                  <Button
                    theme="borderless"
                    size="small"
                    icon={<Copy style={{ height: 12, width: 12 }} />}
                    style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                  >
                    复制
                  </Button>
                </span>
              </Dropdown>
            )}
          </div>

          {/* 音频播放器 */}
          {hasRecording && (
            <div style={{
              flexShrink: 0,
              padding: '8px 16px 10px',
              borderBottom: `1px solid ${BRAND.cardBorder}`,
              background: '#fff',
            }}>
              {isLoadingUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                  <Skeleton.Avatar size="small" style={{ flexShrink: 0 }} />
                  <Skeleton.Paragraph rows={1} style={{ flex: 1 }} />
                </div>
              ) : audioUrl ? (
                <>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ width: 36, flexShrink: 0, textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--semi-color-text-2)' }}>
                      {formatPlayTime(currentTime)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Slider
                        key={duration}
                        min={0}
                        value={currentTime}
                        max={duration || 100}
                        step={0.1}
                        onChange={(val) => handleSeek(val as number)}
                        tipFormatter={null}
                      />
                    </div>
                    <span style={{ width: 36, flexShrink: 0, fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--semi-color-text-2)' }}>
                      {formatPlayTime(duration)}
                    </span>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Button
                        theme="borderless"
                        type="tertiary"
                        size="small"
                        icon={<SkipBack style={{ height: 14, width: 14 }} />}
                        onClick={skipBackward}
                        aria-label="快退 10 秒"
                        style={{ height: 28, width: 28, padding: 0 }}
                      />
                      <Button
                        type="primary"
                        theme="solid"
                        onClick={togglePlay}
                        aria-label={isPlaying ? '暂停播放' : '开始播放'}
                        icon={isPlaying
                          ? <Pause style={{ height: 15, width: 15 }} />
                          : <Play style={{ height: 15, width: 15, marginLeft: 1 }} />
                        }
                        style={{
                          height: 34,
                          width: 34,
                          borderRadius: '50%',
                          padding: 0,
                        }}
                      />
                      <Button
                        theme="borderless"
                        type="tertiary"
                        size="small"
                        icon={<SkipForward style={{ height: 14, width: 14 }} />}
                        onClick={skipForward}
                        aria-label="快进 10 秒"
                        style={{ height: 28, width: 28, padding: 0 }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Button
                        theme="borderless"
                        type="tertiary"
                        size="small"
                        onClick={cyclePlaybackRate}
                        aria-label={`当前倍速 ${playbackRate}x`}
                        style={{
                          height: 26,
                          padding: '0 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          borderRadius: 4,
                          color: playbackRate !== 1 ? 'var(--semi-color-primary)' : undefined,
                        }}
                      >
                        {playbackRate}x
                      </Button>
                      <Button
                        theme="borderless"
                        type="tertiary"
                        size="small"
                        icon={<RotateCcw style={{ height: 13, width: 13 }} />}
                        onClick={resetPlayback}
                        aria-label="还原到开头"
                        style={{ height: 26, padding: '0 6px', fontSize: 11 }}
                      >
                        还原
                      </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Button
                        theme="borderless"
                        type="tertiary"
                        size="small"
                        icon={
                          downloading
                            ? <Loader2 className="animate-spin" style={{ height: 13, width: 13 }} />
                            : <Download style={{ height: 13, width: 13 }} />
                        }
                        disabled={!voiceId || downloading}
                        onClick={handleDownloadRecord}
                        aria-label="下载录音"
                        style={{ height: 26, padding: '0 6px', fontSize: 11 }}
                      >
                        下载
                      </Button>
                      <div style={{ height: 14, width: 1, background: 'var(--semi-color-border)', margin: '0 4px' }} />
                      <Button
                        theme="borderless"
                        type="tertiary"
                        size="small"
                        icon={isMuted || volume === 0 ? <VolumeX style={{ height: 13, width: 13 }} /> : <Volume2 style={{ height: 13, width: 13 }} />}
                        onClick={toggleMute}
                        aria-label={isMuted || volume === 0 ? '取消静音' : '静音'}
                        style={{ height: 26, width: 26, padding: 0 }}
                      />
                      <Slider
                        value={isMuted ? 0 : volume}
                        max={1}
                        step={0.1}
                        onChange={(val) => handleVolumeChange(val as number)}
                        tipFormatter={null}
                        style={{ width: 60, flexShrink: 0 }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--semi-color-text-2)', fontSize: 12, padding: '6px 0' }}>
                  无法获取录音地址
                </div>
              )}
            </div>
          )}

          {/* 转写文本 */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            {isDetailLoading ? (
              <Skeleton loading active style={{ padding: '12px 16px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
                    <Skeleton.Avatar size="extra-small" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <Skeleton.Title style={{ width: i % 2 === 0 ? '85%' : '60%', height: 14, marginBottom: 6 }} />
                      {i % 3 === 0 && <Skeleton.Title style={{ width: '40%', height: 14 }} />}
                    </div>
                  </div>
                ))}
              </Skeleton>
            ) : hasFullTranscript ? (
              <TranscriptViewer
                transcript={fullTranscript || []}
                currentTime={currentTime}
                onSeek={handleTranscriptSeek}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: 'var(--semi-color-text-2)' }}>
                {hasRecording ? '暂无转写文本' : '此通话无录音'}
              </div>
            )}
          </div>
        </div>

        {/* ===== 右列：AI 分析（占 2/3） ===== */}
        <div style={{
          flex: 2,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* 右列标题栏 */}
          <div style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderBottom: `1px solid ${BRAND.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
              <BrainCircuit style={{ height: 14, width: 14 }} aria-hidden="true" />
              AI 分析
            </span>
            <Button
              theme="borderless"
              size="small"
              icon={analysisStatus === 'completed'
                ? <RefreshCw style={{ height: 12, width: 12 }} />
                : <BrainCircuit style={{ height: 12, width: 12 }} />
              }
              onClick={handleAnalyzeClick}
              disabled={isAnalyzePending || isPolling || isDetailLoading || !hasFullTranscript}
              style={{ height: 24, padding: '0 8px', fontSize: 11 }}
            >
              {isAnalyzePending || isPolling ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Spin size="small" />
                  分析中
                </span>
              ) : analysisStatus === 'completed' ? '重新分析' : 'AI 分析'}
            </Button>
          </div>

          {/* AI 分析内容 */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {isDetailLoading ? (
              <Skeleton loading active style={{ padding: '16px 20px' }}>
                <Skeleton.Title style={{ width: 120, height: 18, marginBottom: 16 }} />
                <Skeleton.Paragraph rows={3} style={{ width: '100%', marginBottom: 20 }} />
                <Skeleton.Title style={{ width: 100, height: 18, marginBottom: 16 }} />
                <Skeleton.Paragraph rows={4} style={{ width: '100%', marginBottom: 20 }} />
                <Skeleton.Title style={{ width: 140, height: 18, marginBottom: 16 }} />
                <Skeleton.Paragraph rows={2} style={{ width: '100%' }} />
              </Skeleton>
            ) : fullRecord ? (
              <AIAnalysisPanel
                record={fullRecord}
                isAnalyzing={isAnalyzePending || isPolling}
                onAnalyze={triggerAnalyze}
              />
            ) : record ? (
              <AIAnalysisPanel
                record={record}
                isAnalyzing={isAnalyzePending || isPolling}
                onAnalyze={triggerAnalyze}
              />
            ) : null}
          </div>
        </div>
        </div>
      </SideSheet>

      <Modal
        title="确认重新分析"
        visible={reanalyzeConfirmOpen}
        onCancel={() => setReanalyzeConfirmOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setReanalyzeConfirmOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={handleConfirmReanalyze}
              loading={isAnalyzePending}
            >
              确认重新分析
            </Button>
          </div>
        }
      >
        确定要重新分析当前通话记录吗？系统会基于当前转写内容重新生成 AI 分析结果，并覆盖当前展示内容。
      </Modal>
    </>
  )
}
