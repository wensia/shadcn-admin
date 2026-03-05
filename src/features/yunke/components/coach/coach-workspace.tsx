import { useCallback, useEffect, useState } from 'react'
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
  scene_key: 'S1',
  persona_key: 'anxious_father',
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

  const activeMode = setup.mode
  const modeMatches = currentSession?.mode === activeMode
  const activeSession = modeMatches ? currentSession : null
  const review = currentDetail?.review || null
  const voiceStatus = modeMatches ? (currentDetail?.voice_status || null) : null
  const messages = modeMatches ? (currentDetail?.messages || []) : []
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
        <div className="flex h-full min-w-0 flex-col gap-3 px-4 py-3 lg:px-5">
          {bootstrapError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              数据加载失败：{bootstrapError}
            </div>
          ) : null}

          {/* 页面标题行 */}
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-slate-900">课程顾问陪练</div>
            <div className="flex items-center gap-2">
              {isMobile ? (
                <Button theme="light" onClick={() => setSidebarOpen(true)}>
                  会话
                </Button>
              ) : null}
              <Button
                theme="light"
                icon={<Star className="h-4 w-4" />}
                onClick={() => setReviewOpen(true)}
              >
                评分
              </Button>
            </div>
          </div>

          {/* 设置栏 */}
          <CoachSetupCard
            catalog={catalog}
            draft={currentSession ? { ...mapSessionToSetup(currentSession), mode: setup.mode } : setup}
            currentSession={currentSession}
            isCreating={isCreating}
            onChange={handleSetupChange}
            onCreateSession={() => handleCreateSession(setup.mode)}
          />

          {/* 对话区（填满剩余高度） */}
          <div className="min-h-0 flex-1">
            {activeMode === 'voice' ? (
              <CoachVoicePanel
                session={activeSession}
                voiceStatus={voiceStatus}
                isStarting={isStarting}
                isStopping={isStopping}
                isMuted={isMuted}
                rtcError={rtcError}
                onStart={startCall}
                onStop={stopCall}
                onToggleMute={toggleMute}
                onSwitchToText={() => handleCreateSession('text', activeSession ? {
                  scene_key: activeSession.scene_key,
                  persona_key: activeSession.persona_key,
                  difficulty: activeSession.difficulty,
                  subject: activeSession.subject || '',
                  student_grade: activeSession.student_grade || '',
                  goal: activeSession.goal || '',
                } : undefined)}
                onOpenSidebar={isMobile ? () => setSidebarOpen(true) : undefined}
                onOpenReview={() => setReviewOpen(true)}
                hasReview={Boolean(review)}
              />
            ) : (
              <CoachTextPanel
                session={activeSession}
                messages={messages}
                currentStage={currentStage}
                isLoading={isTextLoading}
                onSend={sendMessage}
                onStop={stopGeneration}
                onGenerateReview={handleGenerateReview}
                onOpenSidebar={isMobile ? () => setSidebarOpen(true) : undefined}
                onOpenReview={() => setReviewOpen(true)}
                hasReview={Boolean(review)}
              />
            )}
          </div>
        </div>
      </div>

      {/* 评分抽屉（始终 SideSheet） */}
      <CoachReviewDrawer
        review={review}
        visible={reviewOpen}
        onVisibleChange={setReviewOpen}
      />
    </div>
  )
}
