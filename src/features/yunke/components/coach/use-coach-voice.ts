import { useCallback, useEffect, useRef, useState } from 'react'
import { coachApi } from './coach-api'
import type { TrainingReview, TrainingVoiceStatus } from './coach-types'

/** 火山 Realtime API TTS 输出采样率 */
const TTS_SAMPLE_RATE = 24000

interface UseCoachVoiceOptions {
  sessionId: string | null
  onVoiceStatusChange: (status: TrainingVoiceStatus | null) => void
  onReviewReady?: (review: TrainingReview) => void
  onSessionRefresh?: () => Promise<unknown>
}

/**
 * 端到端实时语音陪练 Hook。
 * 通过 WebSocket 连接后端代理，后端再直连火山 Realtime API。
 */
export function useCoachVoice({
  sessionId,
  onVoiceStatusChange,
  onReviewReady,
  onSessionRefresh,
}: UseCoachVoiceOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const recordCtxRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const activeSessionRef = useRef<string | null>(null)

  // ── 播放相关（独立 AudioContext，避免与录音互相干扰） ────
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const nextPlayTimeRef = useRef<number>(0)
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())

  // ── 计时器 ────────────────────────────────────────────────
  const callStartTimeRef = useRef<number>(0)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── TTS 播放期间自动静音（防回声打断） ───────────────────
  const isTtsPlayingRef = useRef(false)

  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [rtcError, setRtcError] = useState<string | null>(null)

  const onVoiceStatusChangeRef = useRef(onVoiceStatusChange)
  onVoiceStatusChangeRef.current = onVoiceStatusChange

  // ── 计时器辅助 ──────────────────────────────────────────
  const getElapsedSeconds = useCallback(() => {
    if (!callStartTimeRef.current) return 0
    return Math.floor((Date.now() - callStartTimeRef.current) / 1000)
  }, [])

  const startTimer = useCallback(() => {
    callStartTimeRef.current = Date.now()
    timerIntervalRef.current = setInterval(() => {
      onVoiceStatusChangeRef.current({
        status: 'active',
        phase: isTtsPlayingRef.current ? 'agent_speaking' : 'listening',
        elapsed_seconds: getElapsedSeconds(),
        transcript_ready: false,
        last_error: null,
      })
    }, 1000)
  }, [getElapsedSeconds])

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    callStartTimeRef.current = 0
  }, [])

  // ── 音频播放：PCM → Float32 → AudioBuffer 调度式播放 ──
  // 火山 Realtime API 配置 format=pcm 后输出 24kHz mono
  // 格式可能是 Int16 LE 或 Float32 LE，通过首块自动检测
  const pcmFormatRef = useRef<'int16' | 'float32' | null>(null)
  const audioChunkCountRef = useRef(0)

  const playPcmChunk = useCallback((pcmData: ArrayBuffer) => {
    let ctx = playbackCtxRef.current
    if (!ctx) {
      ctx = new AudioContext()
      playbackCtxRef.current = ctx
      nextPlayTimeRef.current = ctx.currentTime
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    if (pcmData.byteLength === 0) return

    // 检查是否为 OGG-Opus（默认未配置 audio_config 时的格式）
    const header = new Uint8Array(pcmData, 0, Math.min(4, pcmData.byteLength))
    if (header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
      // OggS magic → 无法直接播放，跳过
      console.warn('[TTS] received OGG-Opus data, cannot play as PCM')
      return
    }

    audioChunkCountRef.current++
    if (audioChunkCountRef.current <= 3) {
      const hex = Array.from(header, (b) => b.toString(16).padStart(2, '0')).join(' ')
      console.log(`[TTS] chunk #${audioChunkCountRef.current}: ${pcmData.byteLength} bytes, hex: ${hex}...`)
    }

    // 自动检测格式：检查首块数据的值范围
    if (!pcmFormatRef.current) {
      const testFloat = new Float32Array(pcmData.slice(0, Math.min(64, pcmData.byteLength)))
      const allInRange = testFloat.every((v) => v >= -1.5 && v <= 1.5)
      pcmFormatRef.current = allInRange && testFloat.length > 0 ? 'float32' : 'int16'
      console.log(`[TTS] detected PCM format: ${pcmFormatRef.current}`)
    }

    let float32: Float32Array
    if (pcmFormatRef.current === 'float32') {
      // Float32 LE: 直接使用
      float32 = new Float32Array(pcmData)
    } else {
      // Int16 LE: 转换为 Float32
      const int16 = new Int16Array(pcmData)
      float32 = new Float32Array(int16.length)
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768
      }
    }

    if (float32.length === 0) return

    const audioBuffer = ctx.createBuffer(1, float32.length, TTS_SAMPLE_RATE)
    audioBuffer.copyToChannel(float32, 0)

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)

    // 调度式播放：保证音频片段无缝衔接
    const startAt = Math.max(nextPlayTimeRef.current, ctx.currentTime)
    source.start(startAt)
    nextPlayTimeRef.current = startAt + audioBuffer.duration

    // 追踪活跃音频源，用于打断时停止
    activeSourcesRef.current.add(source)
    source.onended = () => {
      activeSourcesRef.current.delete(source)
    }
  }, [])

  /** 停止所有正在播放的音频（用户打断时调用） */
  const stopAllAudio = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try { source.stop() } catch { /* already stopped */ }
    })
    activeSourcesRef.current.clear()
    if (playbackCtxRef.current) {
      nextPlayTimeRef.current = playbackCtxRef.current.currentTime
    }
  }, [])

  // ── 清理资源 ────────────────────────────────────────────
  const teardown = useCallback(() => {
    stopTimer()
    isTtsPlayingRef.current = false
    pcmFormatRef.current = null
    audioChunkCountRef.current = 0
    stopAllAudio()
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (recordCtxRef.current) {
      recordCtxRef.current.close().catch(() => {})
      recordCtxRef.current = null
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {})
      playbackCtxRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsMuted(false)
  }, [stopTimer, stopAllAudio])

  // ── 启动通话 ────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (!sessionId || isStarting) return

    setIsStarting(true)
    setRtcError(null)

    try {
      // 1. 获取麦克风
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      // 2. 录音 AudioContext + Worklet（48kHz，worklet 内部下采样到 16kHz）
      const recordCtx = new AudioContext({ sampleRate: 48000 })
      recordCtxRef.current = recordCtx

      await recordCtx.audioWorklet.addModule('/pcm-processor.worklet.js')
      const workletNode = new AudioWorkletNode(recordCtx, 'pcm-processor')
      workletNodeRef.current = workletNode

      const micSource = recordCtx.createMediaStreamSource(stream)
      micSource.connect(workletNode)

      // 3. 建立 WebSocket
      const wsUrl = coachApi.getVoiceWsUrl(sessionId)
      const ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws
      activeSessionRef.current = sessionId

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject(new Error('WebSocket 连接失败'))
        setTimeout(() => reject(new Error('WebSocket 连接超时')), 10000)
      })

      // 4. 发送 start
      ws.send(JSON.stringify({ type: 'start' }))

      // 5. Worklet 音频 → WebSocket
      // 始终发送音频，依赖浏览器 echoCancellation + 火山 API VAD 处理回声
      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data)
        }
      }

      // 6. WebSocket 消息处理
      ws.onmessage = (e: MessageEvent) => {
        if (e.data instanceof ArrayBuffer) {
          // 二进制音频 → PCM 播放
          playPcmChunk(e.data)
          return
        }

        try {
          const msg = JSON.parse(e.data as string) as Record<string, unknown>
          const type = msg.type as string

          if (type === 'ready') {
            startTimer()
            onVoiceStatusChange({
              status: 'active',
              phase: 'agent_speaking', // 等待模型开场白
              elapsed_seconds: 0,
              transcript_ready: false,
              last_error: null,
            })
          } else if (type === 'asr') {
            // ASR 事件不重置 isTtsPlayingRef，只由 tts_end 控制
            onVoiceStatusChange({
              status: 'active',
              phase: isTtsPlayingRef.current ? 'agent_speaking' : 'listening',
              elapsed_seconds: getElapsedSeconds(),
              transcript_ready: false,
              last_error: null,
            })
          } else if (type === 'tts_start') {
            isTtsPlayingRef.current = true
            onVoiceStatusChange({
              status: 'active',
              phase: 'agent_speaking',
              elapsed_seconds: getElapsedSeconds(),
              transcript_ready: false,
              last_error: null,
            })
          } else if (type === 'tts_end') {
            isTtsPlayingRef.current = false
            onVoiceStatusChange({
              status: 'active',
              phase: 'listening',
              elapsed_seconds: getElapsedSeconds(),
              transcript_ready: false,
              last_error: null,
            })
          } else if (type === 'chat') {
            onVoiceStatusChange({
              status: 'active',
              phase: isTtsPlayingRef.current ? 'agent_speaking' : 'listening',
              elapsed_seconds: getElapsedSeconds(),
              transcript_ready: false,
              last_error: null,
            })
          } else if (type === 'error') {
            setRtcError(msg.message as string)
            onVoiceStatusChange({
              status: 'failed',
              phase: 'failed',
              elapsed_seconds: getElapsedSeconds(),
              transcript_ready: false,
              last_error: msg.message as string,
            })
          } else if (type === 'finished') {
            // 服务端主动结束（非用户挂断）时才处理
            // 用户主动 stopCall 时已经 teardown 了
            if (!isStopping) {
              stopTimer()
              onVoiceStatusChange({
                status: 'completed',
                phase: 'completed',
                elapsed_seconds: getElapsedSeconds(),
                transcript_ready: true,
                last_error: null,
              })
              teardown()
              void (async () => {
                await onSessionRefresh?.()
                if (sessionId) {
                  try {
                    const review = await coachApi.generateReview(sessionId)
                    onReviewReady?.(review)
                  } catch {
                    // 复盘生成失败不影响主流程
                  }
                  await onSessionRefresh?.()
                }
              })()
            }
          }
        } catch {
          // 忽略解析错误
        }
      }

      ws.onclose = () => {
        if (activeSessionRef.current === sessionId) {
          teardown()
        }
      }

      ws.onerror = () => {
        setRtcError('WebSocket 连接异常')
      }
    } catch (error) {
      const errorMsg = (error as Error).message || '语音陪练启动失败'
      setRtcError(errorMsg)
      onVoiceStatusChange({
        status: 'failed',
        phase: 'failed',
        elapsed_seconds: 0,
        transcript_ready: false,
        last_error: errorMsg,
      })
      teardown()
    } finally {
      setIsStarting(false)
    }
  }, [
    getElapsedSeconds,
    isStarting,
    onReviewReady,
    onSessionRefresh,
    onVoiceStatusChange,
    playPcmChunk,
    sessionId,
    startTimer,
    stopTimer,
    teardown,
  ])

  // ── 停止通话 ────────────────────────────────────────────
  const stopCall = useCallback(async () => {
    if (!sessionId || isStopping) return

    setIsStopping(true)
    try {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        // 发送 stop 命令，后端会 finish_session 并返回 finished
        ws.send(JSON.stringify({ type: 'stop' }))
      } else {
        // WebSocket 已断开，用 REST 备用端点
        await coachApi.stopVoice(sessionId).catch(() => undefined)
      }

      // 直接清理，不等待 finished 事件（避免竞态）
      onVoiceStatusChange({
        status: 'completed',
        phase: 'completed',
        elapsed_seconds: getElapsedSeconds(),
        transcript_ready: true,
        last_error: null,
      })
      teardown()

      // 刷新会话状态 + 生成复盘
      void (async () => {
        await onSessionRefresh?.()
        try {
          const review = await coachApi.generateReview(sessionId)
          onReviewReady?.(review)
        } catch {
          // 复盘生成失败不影响主流程
        }
        await onSessionRefresh?.()
      })()
    } finally {
      setIsStopping(false)
    }
  }, [getElapsedSeconds, isStopping, onReviewReady, onSessionRefresh, onVoiceStatusChange, sessionId, teardown])

  // ── 静音切换 ────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const ws = wsRef.current
    const newMuted = !isMuted

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'mute', muted: newMuted }))
    }

    const stream = streamRef.current
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted
      })
    }

    setIsMuted(newMuted)
  }, [isMuted])

  // ── 清理 ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      teardown()
    }
  }, [teardown])

  useEffect(() => {
    if (activeSessionRef.current && sessionId && activeSessionRef.current !== sessionId) {
      teardown()
      activeSessionRef.current = sessionId
    }
  }, [sessionId, teardown])

  return {
    isStarting,
    isStopping,
    isMuted,
    rtcError,
    startCall,
    stopCall,
    toggleMute,
  }
}
