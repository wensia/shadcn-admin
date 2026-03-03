import { Mic, MicOff, PanelLeft, PhoneCall, PhoneOff, Star } from 'lucide-react'
import { Button, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { TrainingSession, TrainingVoiceStatus } from './coach-types'

const { Text } = Typography

const PHASE_LABELS: Record<string, string> = {
  connecting: '连接中',
  listening: '正在倾听',
  agent_speaking: 'AI 回复中',
  closing: '结束中',
  completed: '已完成',
  failed: '异常结束',
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
}

interface CoachVoicePanelProps {
  session: TrainingSession | null
  voiceStatus: TrainingVoiceStatus | null
  isStarting: boolean
  isStopping: boolean
  isMuted: boolean
  rtcError?: string | null
  onStart: () => void
  onStop: () => void
  onToggleMute: () => void
  onSwitchToText: () => void
  onOpenSidebar?: () => void
  onOpenReview?: () => void
  hasReview: boolean
}

export function CoachVoicePanel({
  session,
  voiceStatus,
  isStarting,
  isStopping,
  isMuted,
  rtcError,
  onStart,
  onStop,
  onToggleMute,
  onSwitchToText,
  onOpenSidebar,
  onOpenReview,
  hasReview,
}: CoachVoicePanelProps) {
  const phaseLabel = PHASE_LABELS[voiceStatus?.phase || 'connecting'] || '待开始'
  const isActive = ['active', 'ending'].includes(voiceStatus?.status || '')

  return (
    <section
      className="relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[28px] border"
      style={{
        borderColor: 'rgba(148, 163, 184, 0.18)',
        background:
          'radial-gradient(circle at top, rgba(251,113,133,0.14), transparent 28%), linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.94))',
        color: 'white',
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {onOpenSidebar ? (
              <Button
                theme="borderless"
                type="tertiary"
                icon={<PanelLeft className="h-4 w-4" />}
                onClick={onOpenSidebar}
              />
            ) : null}
            <div className="truncate text-sm font-semibold text-white">
              {session ? session.title : '先创建一场语音陪练'}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tag color="red">电话式语音</Tag>
            <Tag type="solid">{phaseLabel}</Tag>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenReview ? (
            <Button theme="borderless" type="tertiary" icon={<Star className="h-4 w-4" />} onClick={onOpenReview}>
              {hasReview ? '查看评分' : '评分区'}
            </Button>
          ) : null}
          <Button theme="light" onClick={onSwitchToText}>切到文字</Button>
        </div>
      </div>

      {!session ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="text-2xl font-semibold">先建一场语音陪练</div>
            <Text className="mt-3 block text-slate-300">
              建议从 L1 开始，先练清晰开场和基础摸底，再逐步切到忙碌型或价格敏感型家长。
            </Text>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
          <div className="relative flex h-56 w-56 items-center justify-center">
            <div className={`absolute h-56 w-56 rounded-full border ${isActive ? 'animate-pulse' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
            <div className={`absolute h-44 w-44 rounded-full border ${isActive ? 'animate-pulse' : ''}`} style={{ borderColor: 'rgba(251,113,133,0.34)' }} />
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(145deg, rgba(251,113,133,0.94), rgba(244,114,182,0.84))',
                boxShadow: '0 24px 60px rgba(244, 63, 94, 0.32)',
              }}
            >
              <PhoneCall className="h-10 w-10" />
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">通话状态</div>
            <div className="mt-3 text-4xl font-semibold">{phaseLabel}</div>
            <div className="mt-3 text-sm text-slate-300">
              {voiceStatus?.elapsed_seconds ? `已通话 ${formatElapsed(voiceStatus.elapsed_seconds)}` : '准备开始一场 3-5 分钟的顾问电话陪练'}
            </div>
            {rtcError || voiceStatus?.last_error ? (
              <div className="mt-4 text-sm text-rose-200">{rtcError || voiceStatus?.last_error}</div>
            ) : null}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              theme="light"
              icon={isMuted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              disabled={!isActive}
              onClick={onToggleMute}
            >
              {isMuted ? '恢复麦克风' : '静音'}
            </Button>
            {!isActive ? (
              <Button
                type="primary"
                icon={<PhoneCall className="h-4 w-4" />}
                loading={isStarting}
                onClick={onStart}
                style={{ background: '#FB7185', borderColor: '#FB7185' }}
              >
                开始通话
              </Button>
            ) : (
              <Button
                type="danger"
                icon={<PhoneOff className="h-4 w-4" />}
                loading={isStopping}
                onClick={onStop}
              >
                挂断
              </Button>
            )}
          </div>

          <div className="mt-10 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              开场要短
              <div className="mt-1 text-xs text-slate-400">先确认身份和孩子情况，不要一上来就讲课程。</div>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              多追问细节
              <div className="mt-1 text-xs text-slate-400">学习困扰、时间安排、决策人和预算都要问到。</div>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              结尾要收口
              <div className="mt-1 text-xs text-slate-400">试听、到访、加微信或回访，至少推进一个明确动作。</div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

