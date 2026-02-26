/**
 * DISC 岗位适配度可视化组件
 */

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { DISCJobFit } from '../types'

interface DiscJobFitCardProps {
  jobFit: DISCJobFit
}

function getMatchLevel(score: number): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (score >= 80) return { label: '优秀', variant: 'default' }
  if (score >= 65) return { label: '良好', variant: 'secondary' }
  if (score >= 50) return { label: '一般', variant: 'outline' }
  return { label: '偏低', variant: 'destructive' }
}

const JOB_NAME_MAP: Record<string, string> = {
  course_consultant: '课程顾问',
  instructor: '讲师',
  study_manager: '学管师',
  admin: '行政',
}

export function DiscJobFitCard({ jobFit }: DiscJobFitCardProps) {
  const { items, bestMatch } = jobFit

  if (!items || items.length === 0) return null

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isBest = item.jobKey === bestMatch
        const level = getMatchLevel(item.matchScore)
        const displayName = JOB_NAME_MAP[item.jobKey] || item.jobName

        return (
          <div
            key={item.jobKey}
            className={`rounded-lg border p-3 transition-colors ${
              isBest ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{displayName}</span>
                {isBest && (
                  <Badge variant="default" className="text-xs">
                    最佳匹配
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={level.variant} className="text-xs">
                  {level.label}
                </Badge>
                <span className="text-sm font-bold tabular-nums">
                  {item.matchScore}分
                </span>
              </div>
            </div>
            <Progress value={item.matchScore} className="h-2" />
          </div>
        )
      })}
    </div>
  )
}
