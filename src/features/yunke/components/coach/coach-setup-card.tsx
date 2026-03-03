import { BookText, Headphones, Sparkles } from 'lucide-react'
import { Button, Input, Select, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { TrainingCatalog, TrainingSession, TrainingSetupForm } from './coach-types'

const { Text } = Typography

interface CoachSetupCardProps {
  catalog: TrainingCatalog | null
  draft: TrainingSetupForm
  currentSession: TrainingSession | null
  isCreating: boolean
  onChange: (patch: Partial<TrainingSetupForm>) => void
  onCreateTextSession: () => void
  onCreateVoiceSession: () => void
}

function modeButtonStyle(active: boolean) {
  return {
    borderColor: active ? 'rgba(15, 23, 42, 0.18)' : 'rgba(148, 163, 184, 0.18)',
    background: active
      ? 'linear-gradient(145deg, rgba(255,247,237,0.96), rgba(255,255,255,0.98))'
      : 'rgba(255,255,255,0.78)',
    boxShadow: active ? '0 12px 24px rgba(15, 23, 42, 0.08)' : 'none',
  }
}

export function CoachSetupCard({
  catalog,
  draft,
  currentSession,
  isCreating,
  onChange,
  onCreateTextSession,
  onCreateVoiceSession,
}: CoachSetupCardProps) {
  const sceneLabel = catalog?.scenes[0]?.label || '家长咨询课外辅导'

  return (
    <section
      className="overflow-hidden rounded-[28px] border"
      style={{
        borderColor: 'rgba(148, 163, 184, 0.18)',
        background:
          'radial-gradient(circle at top right, rgba(251,191,36,0.16), transparent 34%), linear-gradient(135deg, rgba(255,252,248,0.98), rgba(248,250,252,0.94))',
      }}
    >
      <div className="grid gap-4 px-5 py-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-900">训练设置</span>
              </div>
              <Text type="tertiary" size="small" className="mt-2 block">
                固定场景围绕家长咨询课外辅导，重点训练顾问的需求摸底、价值表达和收口推进。
              </Text>
            </div>
            {currentSession ? (
              <Tag color="orange" size="large">
                当前会话：{currentSession.mode === 'voice' ? '语音陪练' : '文字陪练'}
              </Tag>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              className="rounded-2xl border px-4 py-3 text-left transition-all"
              style={modeButtonStyle(draft.mode === 'text')}
              onClick={() => onChange({ mode: 'text' })}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookText className="h-4 w-4 text-blue-600" />
                文字陪练
              </div>
              <Text type="tertiary" size="small" className="mt-2 block">
                适合练习开场话术、问诊路径和异议拆解。
              </Text>
            </button>

            <button
              type="button"
              className="rounded-2xl border px-4 py-3 text-left transition-all"
              style={modeButtonStyle(draft.mode === 'voice')}
              onClick={() => onChange({ mode: 'voice' })}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Headphones className="h-4 w-4 text-rose-600" />
                电话式语音陪练
              </div>
              <Text type="tertiary" size="small" className="mt-2 block">
                更接近真实电话节奏，适合练临场反应、打断和收口动作。
              </Text>
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">场景</div>
              <div
                className="rounded-2xl border px-3 py-2.5 text-sm text-slate-700"
                style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.78)' }}
              >
                {sceneLabel}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">家长人设</div>
              <Select
                value={draft.persona_key}
                onChange={(value) => onChange({ persona_key: String(value) })}
                optionList={(catalog?.personas || []).map((item) => ({ value: item.key, label: item.label }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">难度</div>
              <Select
                value={draft.difficulty}
                onChange={(value) => onChange({ difficulty: String(value) })}
                optionList={(catalog?.difficulties || []).map((item) => ({ value: item.key, label: item.label }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">目标</div>
              <Input
                value={draft.goal}
                onChange={(value) => onChange({ goal: value })}
                placeholder="完成首次邀约"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">学科</div>
              <Input value={draft.subject} onChange={(value) => onChange({ subject: value })} placeholder="数学" />
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">年级</div>
              <Input value={draft.student_grade} onChange={(value) => onChange({ student_grade: value })} placeholder="初二" />
            </div>
          </div>
        </div>

        <div
          className="flex flex-col justify-between rounded-[26px] border px-5 py-5"
          style={{
            borderColor: 'rgba(148, 163, 184, 0.18)',
            background: 'linear-gradient(160deg, rgba(15,23,42,0.94), rgba(30,41,59,0.92))',
            color: 'white',
          }}
        >
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">本次训练焦点</div>
            <div className="mt-3 text-2xl font-semibold leading-tight">
              {draft.mode === 'voice' ? '先把“像电话”的节奏练出来。' : '先把“像顾问”的提问与推进练出来。'}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-300">
              这一版重点不是长报告，而是把顾问最真实的开场、摸底、异议和收口动作训练成肌肉记忆。
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              block
              size="large"
              loading={isCreating}
              onClick={onCreateTextSession}
              style={{
                height: 46,
                borderRadius: 14,
                background: draft.mode === 'text' ? '#0F172A' : '#ffffff',
                color: draft.mode === 'text' ? '#ffffff' : '#0F172A',
              }}
            >
              新建文字陪练
            </Button>
            <Button
              block
              size="large"
              loading={isCreating}
              onClick={onCreateVoiceSession}
              style={{
                height: 46,
                borderRadius: 14,
                background: draft.mode === 'voice' ? '#FB7185' : 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              新建语音陪练
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

