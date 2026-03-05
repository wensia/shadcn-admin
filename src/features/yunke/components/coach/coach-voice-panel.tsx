import { Mic, MicOff, PanelLeft, Phone, PhoneOff, Star } from 'lucide-react'
import { Avatar, Button, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { TrainingSession, TrainingVoiceStatus } from './coach-types'

const { Text } = Typography

const PHASE_LABELS: Record<string, string> = {
  connecting: '呼叫中...',
  listening: '通话中',
  agent_speaking: '对方说话中',
  closing: '挂断中...',
  completed: '通话结束',
  failed: '通话异常',
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
  const isActive = ['active', 'ending'].includes(voiceStatus?.status || '')
  const phaseLabel = PHASE_LABELS[voiceStatus?.phase || ''] || '待拨号'

  return (
    <section className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* 顶栏 */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {onOpenSidebar ? (
            <Button
              theme="borderless"
              type="tertiary"
              icon={<PanelLeft className="h-4 w-4" />}
              onClick={onOpenSidebar}
            />
          ) : null}
          <span className="text-sm font-medium text-slate-700">
            {session ? session.title : '语音陪练'}
          </span>
          {session ? <Tag color="blue">语音</Tag> : null}
        </div>
        <div className="flex items-center gap-2">
          {onOpenReview ? (
            <Button theme="borderless" type="tertiary" icon={<Star className="h-4 w-4" />} onClick={onOpenReview}>
              {hasReview ? '查看评分' : '评分'}
            </Button>
          ) : null}
          <Button theme="light" onClick={onSwitchToText}>切到文字</Button>
        </div>
      </div>

      {/* 主体 - 电话界面 */}
      <div className="flex flex-1 flex-col items-center justify-center">
        {!session ? (
          <div className="max-w-sm px-6 text-center">
            <Avatar size="large" style={{ backgroundColor: '#e2e8f0', color: '#64748b' }}>
              <Phone className="h-5 w-5" />
            </Avatar>
            <div className="mt-4 text-lg font-medium text-slate-800">先创建一场语音陪练</div>
            <Text type="tertiary" className="mt-2 block">
              建议从 L1 开始，先练清晰开场和基础摸底，再逐步切到更高难度。
            </Text>
          </div>
        ) : (
          <>
            {/* 头像 + 身份 */}
            <Avatar
              size="large"
              style={{
                backgroundColor: isActive ? '#dcfce7' : '#f1f5f9',
                color: isActive ? '#16a34a' : '#64748b',
              }}
            >
              <Phone className="h-5 w-5" />
            </Avatar>
            <div className="mt-3 text-base font-medium text-slate-800">模拟家长</div>
            <Tag className="mt-1.5" color={isActive ? 'green' : 'grey'}>{phaseLabel}</Tag>

            {/* 计时 */}
            <div className="mt-4 font-mono text-3xl tabular-nums text-slate-700">
              {formatElapsed(voiceStatus?.elapsed_seconds || 0)}
            </div>

            {/* 错误提示 */}
            {rtcError || voiceStatus?.last_error ? (
              <div className="mt-3 max-w-sm rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
                {rtcError || voiceStatus?.last_error}
              </div>
            ) : null}

            {/* 操作按钮 */}
            <div className="mt-8 flex items-center gap-5">
              {/* 静音 */}
              <button
                type="button"
                disabled={!isActive}
                onClick={onToggleMute}
                className="flex h-14 w-14 items-center justify-center rounded-full border transition-colors disabled:opacity-40"
                style={{
                  borderColor: isMuted ? '#fca5a5' : '#e2e8f0',
                  backgroundColor: isMuted ? '#fef2f2' : '#f8fafc',
                }}
              >
                {isMuted
                  ? <MicOff className="h-5 w-5 text-red-500" />
                  : <Mic className="h-5 w-5 text-slate-600" />}
              </button>

              {/* 拨通 / 挂断 */}
              {!isActive ? (
                <button
                  type="button"
                  disabled={isStarting}
                  onClick={onStart}
                  className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: '#22c55e' }}
                >
                  <Phone className="h-6 w-6" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isStopping}
                  onClick={onStop}
                  className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
              )}

              {/* 占位，保持居中 */}
              <div className="h-14 w-14" />
            </div>

            {/* 底部提示 */}
            <Text type="tertiary" size="small" className="mt-6 block">
              {isActive ? 'Shift + M 切换静音' : '点击绿色按钮开始通话'}
            </Text>
          </>
        )}
      </div>
    </section>
  )
}
