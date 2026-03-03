import { SideSheet, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { TrainingReview } from './coach-types'

const { Text } = Typography

const SCORE_LABELS: Record<string, string> = {
  opening: '开场建立联系',
  discovery: '需求摸底',
  pitch: '价值呈现',
  objection: '异议处理',
  closing: '收口邀约',
}

function ReviewBody({ review }: { review: TrainingReview | null }) {
  if (!review) {
    return (
      <div
        className="rounded-[24px] border px-4 py-5"
        style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
      >
        <div className="text-sm font-semibold text-slate-900">会后评分</div>
        <Text type="tertiary" size="small" className="mt-2 block">
          文字模式点击“结束并评分”，语音模式挂断后会自动生成结构化建议。
        </Text>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-[26px] border px-5 py-5"
        style={{
          borderColor: 'rgba(148, 163, 184, 0.18)',
          background: 'linear-gradient(160deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))',
          color: 'white',
        }}
      >
        <div className="text-xs uppercase tracking-[0.2em] text-slate-300">总分</div>
        <div className="mt-3 text-5xl font-semibold">{review.overall_score}</div>
        <div className="mt-3 text-sm text-slate-300">{review.next_recommendation}</div>
      </div>

      <div
        className="rounded-[24px] border px-4 py-4"
        style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
      >
        <div className="text-sm font-semibold text-slate-900">维度评分</div>
        <div className="mt-4 space-y-4">
          {Object.entries(review.dimension_scores).map(([key, value]) => (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
                <span>{SCORE_LABELS[key] || key}</span>
                <span>{value} / 20</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (value / 20) * 100)}%`,
                    background: 'linear-gradient(90deg, #fb7185, #f59e0b)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-[24px] border px-4 py-4"
        style={{ borderColor: 'rgba(148, 163, 184, 0.18)', background: 'rgba(255,255,255,0.82)' }}
      >
        <div className="text-sm font-semibold text-slate-900">做得好的地方</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {review.strengths.map((item) => (
            <Tag key={item} color="green" type="light">{item}</Tag>
          ))}
        </div>
      </div>

      <div
        className="rounded-[24px] border px-4 py-4"
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
  isMobile: boolean
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
}

export function CoachReviewDrawer({
  review,
  isMobile,
  visible = false,
  onVisibleChange,
}: CoachReviewDrawerProps) {
  if (isMobile) {
    return (
      <SideSheet
        visible={visible}
        placement="right"
        width={360}
        title="会后评分"
        onCancel={() => onVisibleChange?.(false)}
        bodyStyle={{ background: '#F8FAFC' }}
      >
        <ReviewBody review={review} />
      </SideSheet>
    )
  }

  return (
    <aside className="h-full overflow-y-auto px-1 py-1">
      <div className="mb-3 px-2 text-sm font-semibold text-slate-900">会后评分</div>
      <ReviewBody review={review} />
    </aside>
  )
}

