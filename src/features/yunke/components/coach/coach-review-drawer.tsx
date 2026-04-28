import { SideSheet, Tag, Typography } from '@douyinfe/semi-ui-19'
import { useIsMobile } from '@/hooks/use-mobile'
import type { SemiTagColor } from '@/lib/semi-types'
import type { TrainingReview } from './coach-types'

const { Text } = Typography

const SCORE_LABELS: Record<string, { label: string; weight: string }> = {
  opening: { label: '开场破冰', weight: '10%' },
  discovery: { label: '需求挖掘', weight: '20%' },
  pitch: { label: '方案匹配', weight: '15%' },
  objection: { label: '异议处理', weight: '25%' },
  closing: { label: '促成邀约', weight: '15%' },
  communication: { label: '沟通素养', weight: '10%' },
  rhythm: { label: '整体节奏', weight: '5%' },
}

const GRADE_COLORS: Record<string, SemiTagColor> = {
  S: 'red',
  A: 'orange',
  B: 'blue',
  C: 'grey',
  D: 'grey',
}

function ReviewBody({ review }: { review: TrainingReview | null }) {
  if (!review) {
    return (
      <div
        className="rounded-2xl border px-4 py-5"
        style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
      >
        <div className="text-sm font-semibold text-slate-900">会后评分</div>
        <Text type="tertiary" size="small" className="mt-2 block">
          文字模式点击"结束并评分"，语音模式挂断后会自动生成结构化建议。
        </Text>
      </div>
    )
  }

  const hasNewDimensions = review.dimension_scores.communication !== undefined

  return (
    <div className="space-y-4">
      {/* 总分卡 */}
      <div
        className="rounded-2xl border px-5 py-5"
        style={{
          borderColor: 'rgba(148, 163, 184, 0.18)',
          background: 'linear-gradient(160deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))',
          color: 'white',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
            {hasNewDimensions ? '加权总分' : '总分'}
          </div>
          {review.grade ? (
            <Tag color={GRADE_COLORS[review.grade] || 'grey'} size="large" type="solid">
              {review.grade} 级
            </Tag>
          ) : null}
        </div>
        <div className="mt-3 text-5xl font-semibold">{review.overall_score}</div>
        <div className="mt-3 text-sm text-slate-300">{review.next_recommendation}</div>
      </div>

      {/* 维度评分 */}
      <div
        className="rounded-2xl border px-4 py-4"
        style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
      >
        <div className="text-sm font-semibold text-slate-900">维度评分</div>
        <div className="mt-4 space-y-4">
          {Object.entries(review.dimension_scores).map(([key, value]) => {
            if (value === undefined || value === null) return null
            const meta = SCORE_LABELS[key]
            if (!meta) return null
            const maxScore = hasNewDimensions ? 10 : 20
            return (
              <div key={key}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
                  <span>
                    {meta.label}
                    {hasNewDimensions ? (
                      <span className="ml-1.5 text-xs text-slate-400">{meta.weight}</span>
                    ) : null}
                  </span>
                  <span>{value} / {maxScore}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (value / maxScore) * 100)}%`,
                      background: 'linear-gradient(90deg, #fb7185, #f59e0b)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 亮点话术 */}
      {review.highlight_quotes && review.highlight_quotes.length > 0 ? (
        <div
          className="rounded-2xl border px-4 py-4"
          style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
        >
          <div className="text-sm font-semibold text-slate-900">亮点话术</div>
          <div className="mt-3 space-y-3">
            {review.highlight_quotes.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border-l-2 border-amber-400 bg-amber-50/60 px-3 py-2.5"
              >
                <div className="text-sm font-medium text-slate-800">"{item.quote}"</div>
                <div className="mt-1 text-xs text-slate-500">{item.comment}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 做得好的地方 */}
      <div
        className="rounded-2xl border px-4 py-4"
        style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
      >
        <div className="text-sm font-semibold text-slate-900">做得好的地方</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {review.strengths.map((item) => (
            <Tag key={item} color="green" type="light">{item}</Tag>
          ))}
        </div>
      </div>

      {/* 优先改进 */}
      <div
        className="rounded-2xl border px-4 py-4"
        style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
      >
        <div className="text-sm font-semibold text-slate-900">优先改进</div>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
          {review.improvements.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

interface CoachReviewDrawerProps {
  review: TrainingReview | null
  visible: boolean
  onVisibleChange: (visible: boolean) => void
}

export function CoachReviewDrawer({
  review,
  visible,
  onVisibleChange,
}: CoachReviewDrawerProps) {
  const isMobile = useIsMobile()

  return (
    <SideSheet
      visible={visible}
      placement="right"
      width={isMobile ? '92vw' : 400}
      title="会后评分"
      onCancel={() => onVisibleChange(false)}
      bodyStyle={{ background: '#F8FAFC' }}
    >
      <ReviewBody review={review} />
    </SideSheet>
  )
}
