import { useCallback, useEffect, useRef, useState } from 'react'
import { coachApi } from './coach-api'
import type { TrainingReview, TrainingVoiceStatus } from './coach-types'

type RtcModuleLike = {
  default: {
    createEngine: (appId: string) => RtcEngineLike
    enableDevices: (options: { audio: boolean; video: boolean }) => Promise<unknown>
    destroyEngine?: (engine: RtcEngineLike) => void
  }
  MediaType: {
    AUDIO: number
  }
}

type RtcEngineLike = {
  joinRoom: (
    token: string | null,
    roomId: string,
    userInfo: { userId: string },
    roomConfig?: {
      isAutoPublish?: boolean
      isAutoSubscribeAudio?: boolean
      isAutoSubscribeVideo?: boolean
    }
  ) => Promise<void>
  startAudioCapture: () => Promise<unknown>
  publishStream: (mediaType: number) => Promise<void>
  unpublishStream: (mediaType: number) => Promise<void>
  stopAudioCapture: () => Promise<unknown>
  leaveRoom: () => Promise<void>
  destroy?: () => void
}

interface UseCoachVoiceOptions {
  sessionId: string | null
  onVoiceStatusChange: (status: TrainingVoiceStatus | null) => void
  onReviewReady?: (review: TrainingReview) => void
  onSessionRefresh?: () => Promise<unknown>
}

export function useCoachVoice({
  sessionId,
  onVoiceStatusChange,
  onReviewReady,
  onSessionRefresh,
}: UseCoachVoiceOptions) {
  const engineRef = useRef<RtcEngineLike | null>(null)
  const rtcModuleRef = useRef<RtcModuleLike | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const activeSessionRef = useRef<string | null>(null)
  const isPublishedRef = useRef(false)

  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [rtcError, setRtcError] = useState<string | null>(null)

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const teardownRtc = useCallback(async (clearPoller = false) => {
    if (clearPoller) clearPolling()

    const engine = engineRef.current
    const rtcModule = rtcModuleRef.current
    if (!engine) return

    try {
      if (isPublishedRef.current) {
        await engine.unpublishStream(rtcModule?.MediaType?.AUDIO ?? 1)
      }
    } catch {
      // 结束通话阶段忽略 RTC 清理错误
    }

    try {
      await engine.stopAudioCapture()
    } catch {
      // ignore
    }

    try {
      await engine.leaveRoom()
    } catch {
      // ignore
    }

    try {
      engine.destroy?.()
    } catch {
      rtcModule?.default?.destroyEngine?.(engine)
    }

    engineRef.current = null
    rtcModuleRef.current = null
    isPublishedRef.current = false
    setIsMuted(false)
  }, [clearPolling])

  const pollVoiceStatus = useCallback(async (targetSessionId: string) => {
    try {
      const nextStatus = await coachApi.getVoiceStatus(targetSessionId)
      onVoiceStatusChange(nextStatus)

      if (nextStatus.last_error) {
        setRtcError(nextStatus.last_error)
      }

      if (nextStatus.status === 'failed') {
        clearPolling()
        await teardownRtc(false)
        return
      }

      if (nextStatus.status === 'completed' && nextStatus.transcript_ready) {
        clearPolling()
        await onSessionRefresh?.()
        const review = await coachApi.generateReview(targetSessionId)
        onReviewReady?.(review)
        await onSessionRefresh?.()
      }
    } catch (error) {
      setRtcError((error as Error).message || '语音状态查询失败')
    }
  }, [clearPolling, onReviewReady, onSessionRefresh, onVoiceStatusChange, teardownRtc])

  const startPolling = useCallback((targetSessionId: string) => {
    clearPolling()
    void pollVoiceStatus(targetSessionId)
    pollTimerRef.current = window.setInterval(() => {
      void pollVoiceStatus(targetSessionId)
    }, 2000)
  }, [clearPolling, pollVoiceStatus])

  const startCall = useCallback(async () => {
    if (!sessionId || isStarting) return

    setIsStarting(true)
    setRtcError(null)

    try {
      const startPayload = await coachApi.startVoice(sessionId)
      const rtcModule = await import('@volcengine/rtc') as unknown as RtcModuleLike
      const RTC = rtcModule.default
      const engine = RTC.createEngine(startPayload.rtc_app_id)

      rtcModuleRef.current = rtcModule
      engineRef.current = engine
      activeSessionRef.current = sessionId

      await RTC.enableDevices({ audio: true, video: false })
      await engine.joinRoom(
        startPayload.rtc_token,
        startPayload.rtc_room_id,
        { userId: startPayload.rtc_user_id },
        {
          isAutoPublish: false,
          isAutoSubscribeAudio: true,
          isAutoSubscribeVideo: false,
        }
      )
      await engine.startAudioCapture()
      await engine.publishStream(rtcModule.MediaType.AUDIO)
      isPublishedRef.current = true
      onVoiceStatusChange({
        status: 'active',
        phase: 'connecting',
        elapsed_seconds: 0,
        transcript_ready: false,
        last_error: null,
      })
      startPolling(sessionId)
    } catch (error) {
      setRtcError((error as Error).message || '语音陪练启动失败')
      onVoiceStatusChange({
        status: 'failed',
        phase: 'failed',
        elapsed_seconds: 0,
        transcript_ready: false,
        last_error: (error as Error).message || '语音陪练启动失败',
      })
      await teardownRtc(true)
      if (sessionId) {
        void coachApi.stopVoice(sessionId).catch(() => undefined)
      }
    } finally {
      setIsStarting(false)
    }
  }, [isStarting, onVoiceStatusChange, sessionId, startPolling, teardownRtc])

  const stopCall = useCallback(async () => {
    if (!sessionId || isStopping) return

    setIsStopping(true)
    try {
      await coachApi.stopVoice(sessionId)
      onVoiceStatusChange({
        status: 'ending',
        phase: 'closing',
        elapsed_seconds: 0,
        transcript_ready: false,
        last_error: null,
      })
      await teardownRtc(false)
      startPolling(sessionId)
    } finally {
      setIsStopping(false)
    }
  }, [isStopping, onVoiceStatusChange, sessionId, startPolling, teardownRtc])

  const toggleMute = useCallback(async () => {
    const engine = engineRef.current
    const rtcModule = rtcModuleRef.current
    if (!engine || !rtcModule) return

    if (isMuted) {
      await engine.startAudioCapture()
      await engine.publishStream(rtcModule.MediaType.AUDIO)
      isPublishedRef.current = true
      setIsMuted(false)
      return
    }

    if (isPublishedRef.current) {
      await engine.unpublishStream(rtcModule.MediaType.AUDIO)
      isPublishedRef.current = false
    }
    await engine.stopAudioCapture()
    setIsMuted(true)
  }, [isMuted])

  useEffect(() => {
    return () => {
      void teardownRtc(true)
    }
  }, [teardownRtc])

  useEffect(() => {
    if (activeSessionRef.current && sessionId && activeSessionRef.current !== sessionId) {
      void teardownRtc(true)
      activeSessionRef.current = sessionId
    }
  }, [sessionId, teardownRtc])

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
