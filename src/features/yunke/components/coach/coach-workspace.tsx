import { useCallback, useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { Button, SideSheet, Toast } from '@douyinfe/semi-ui-19'
import { useIsMobile } from '@/hooks/use-mobile'
import { coachApi } from './coach-api'
import { CoachReviewDrawer } from './coach-review-drawer'
import { CoachSessionSidebar } from './coach-session-sidebar'
import { CoachSetupCard } from './coach-setup-card'
import { CoachTextPanel } from './coach-text-panel'
import { CoachVoicePanel } from './coach-voice-panel'
import { useCoachSessions } from './use-coach-sessions'
import { useCoachTextChat } from './use-coach-text-chat'
import { useCoachVoice } from './use-coach-voice'
import type { CoachMode, TrainingSetupForm } from './coach-types'

const DEFAULT_SETUP: TrainingSetupForm = {
  mode: 'text',
  scene_key: 'parent_consulting',
  persona_key: 'friendly_parent',
  difficulty: 'L1',
  subject: '数学',
  student_grade: '初二',
  goal: '完成首次邀约',
}

function mapSessionToSetup(session: {
  mode: CoachMode
  scene_key: string
  persona_key: string
  difficulty: string
  subject?: string | null
  student_grade?: string | null
  goal?: string | null
}): TrainingSetupForm {
  return {
    mode: session.mode,
    scene_key: session.scene_key,
    persona_key: session.persona_key,
    difficulty: session.difficulty,
    subject: session.subject || '',
    student_grade: session.student_grade || '',
    goal: session.goal || '',
  }
}

export function CoachWorkspace() {
  const isMobile = useIsMobile()
  const [setup, setSetup] = useState<TrainingSetupForm>(DEFAULT_SETUP)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const {
    catalog,
    sessions,
    currentSessionId,
    currentDetail,
    currentSession,
    catalogError,
    sessionListError,
    detailError,
    isSessionListLoading,
    isCreating,
    createSession,
    selectSession,
    renameSession,
    deleteSession,
    refreshCurrentSession,
    setCurrentMessages,
    patchCurrentSession,
    setCurrentReview,
    setCurrentVoiceStatus,
  } = useCoachSessions()

  const { isLoading: isTextLoading, currentStage, setCurrentStage, sendMessage, stopGeneration } = useCoachTextChat({
    sessionId: currentSessionId,
    setMessages: setCurrentMessages,
    onStageChange: (stage) => patchCurrentSession({ current_stage: stage, status: 'active' }),
    onAfterDone: async () => {
      await refreshCurrentSession()
    },
  })

  const {
    isStarting,
    isStopping,
    isMuted,
    rtcError,
    startCall,
    stopCall,
    toggleMute,
  } = useCoachVoice({
    sessionId: currentSessionId,
    onVoiceStatusChange: (status) => {
      setCurrentVoiceStatus(status)
      if (status) {
        patchCurrentSession({
          status: status.status,
          current_stage: status.phase,
        })
      }
    },
    onReviewReady: (review) => {
      setCurrentReview(review)
      setReviewOpen(true)
    },
    onSessionRefresh: refreshCurrentSession,
  })

  useEffect(() => {
    setCurrentStage(currentDetail?.session.current_stage || null)
  }, [currentDetail?.session.current_stage, setCurrentStage])

  const activeMode = useMemo<CoachMode>(() => currentSession?.mode || setup.mode, [currentSession?.mode, setup.mode])
  const review = currentDetail?.review || null
  const voiceStatus = currentDetail?.voice_status || null
  const messages = currentDetail?.messages || []
  const bootstrapError = sessionListError || catalogError || detailError

  const handleSetupChange = useCallback((patch: Partial<TrainingSetupForm>) => {
    setSetup((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleCreateSession = useCallback(async (mode: CoachMode, override?: Partial<TrainingSetupForm>) => {
    try {
      const seed = { ...setup, ...override, mode }
      await createSession({
        mode,
        scene_key: seed.scene_key,
        persona_key: seed.persona_key,
        difficulty: seed.difficulty,
        subject: seed.subject,
        student_grade: seed.student_grade,
        goal: seed.goal,
      })
      setSetup(seed)
      if (isMobile) setSidebarOpen(false)
    } catch (error) {
      Toast.error((error as Error).message || '创建陪练失败')
    }
  }, [createSession, isMobile, setup])

  const handleGenerateReview = useCallback(async () => {
    if (!currentSessionId) return
    try {
      const reviewPayload = await coachApi.generateReview(currentSessionId)
      setCurrentReview(reviewPayload)
      setReviewOpen(true)
      await refreshCurrentSession()
    } catch (error) {
      Toast.error((error as Error).message || '生成评分失败')
    }
  }, [currentSessionId, refreshCurrentSession, setCurrentReview])

  const sidebar = (
    <CoachSessionSidebar
      sessions={sessions}
      currentSessionId={currentSessionId}
      isLoading={isSessionListLoading}
      onSelectSession={(sessionId) => {
        const nextSession = sessions.find((item) => item.id === sessionId)
        if (nextSession) {
          setSetup(mapSessionToSetup(nextSession))
        }
        selectSession(sessionId)
        if (isMobile) setSidebarOpen(false)
      }}
      onRenameSession={renameSession}
      onDeleteSession={deleteSession}
    />
  )

  return (
    <div
      className="flex h-[calc(100dvh-theme(spacing.16))]"
      style={{ background: 'linear-gradient(180deg, rgba(255,252,248,0.92), rgba(248,250,252,0.96))' }}
    >
      {!isMobile ? sidebar : null}

      {isMobile ? (
        <SideSheet
          visible={sidebarOpen}
          placement="left"
          width={296}
          bodyStyle={{ padding: 0 }}
          title="陪练记录"
          onCancel={() => setSidebarOpen(false)}
        >
          {sidebar}
        </SideSheet>
      ) : null}

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full min-w-0 flex-col gap-4 px-4 py-4 lg:px-5">
          {bootstrapError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              陪练数据加载失败：{bootstrapError}。如果你刚更新了后端，请重启 `9876` 服务后刷新页面。
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">课程顾问陪练</div>
              <div className="mt-1 text-sm text-slate-500">同一页支持文字对练和电话式语音陪练，会后统一输出结构化评分。</div>
            </div>
            <div className="flex items-center gap-2">
              {isMobile ? (
                <Button theme="light" onClick={() => setSidebarOpen(true)}>
                  打开会话
                </Button>
              ) : null}
              <Button theme="light" icon={<Star className="h-4 w-4" />} onClick={() => setReviewOpen(true)}>
                评分区
              </Button>
            </div>
          </div>

          <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_360px]'}`}>
            <div className="flex min-h-0 flex-col gap-4">
              <CoachSetupCard
                catalog={catalog}
                draft={currentSession ? mapSessionToSetup(currentSession) : setup}
                currentSession={currentSession}
                isCreating={isCreating}
                onChange={handleSetupChange}
                onCreateTextSession={() => handleCreateSession('text')}
                onCreateVoiceSession={() => handleCreateSession('voice')}
              />

              <div className="min-h-0 flex-1">
                {activeMode === 'voice' ? (
                  <CoachVoicePanel
                    session={currentSession}
                    voiceStatus={voiceStatus}
                    isStarting={isStarting}
                    isStopping={isStopping}
                    isMuted={isMuted}
                    rtcError={rtcError}
                    onStart={startCall}
                    onStop={stopCall}
                    onToggleMute={toggleMute}
                    onSwitchToText={() => handleCreateSession('text', currentSession ? {
                      scene_key: currentSession.scene_key,
                      persona_key: currentSession.persona_key,
                      difficulty: currentSession.difficulty,
                      subject: currentSession.subject || '',
                      student_grade: currentSession.student_grade || '',
                      goal: currentSession.goal || '',
                    } : undefined)}
                    onOpenSidebar={isMobile ? () => setSidebarOpen(true) : undefined}
                    onOpenReview={isMobile ? () => setReviewOpen(true) : undefined}
                    hasReview={Boolean(review)}
                  />
                ) : (
                  <CoachTextPanel
                    session={currentSession}
                    messages={messages}
                    currentStage={currentStage}
                    isLoading={isTextLoading}
                    onSend={sendMessage}
                    onStop={stopGeneration}
                    onGenerateReview={handleGenerateReview}
                    onOpenSidebar={isMobile ? () => setSidebarOpen(true) : undefined}
                    onOpenReview={isMobile ? () => setReviewOpen(true) : undefined}
                    hasReview={Boolean(review)}
                  />
                )}
              </div>
            </div>

            {!isMobile ? (
              <CoachReviewDrawer review={review} isMobile={false} />
            ) : null}
          </div>
        </div>
      </div>

      {isMobile ? (
        <CoachReviewDrawer
          review={review}
          isMobile
          visible={reviewOpen}
          onVisibleChange={setReviewOpen}
        />
      ) : null}
    </div>
  )
}
