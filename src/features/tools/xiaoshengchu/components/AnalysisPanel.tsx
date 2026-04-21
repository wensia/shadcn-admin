import { Card, CardContent, CardHeader, CardTitle } from '@/features/tools/xiaoshengchu/components/ui/card'
import { Badge } from '@/features/tools/xiaoshengchu/components/ui/badge'
import { Progress } from '@/features/tools/xiaoshengchu/components/ui/progress'
import { type VolunteerAnalysis } from '@/features/tools/xiaoshengchu/data/schools'
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BarChart3,
} from 'lucide-react'

interface AnalysisPanelProps {
  analysis: VolunteerAnalysis
  filledCount: number
}

export function AnalysisPanel({ analysis, filledCount }: AnalysisPanelProps) {
  const getRiskIcon = () => {
    switch (analysis.riskLevel) {
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      case 'high':
        return <AlertCircle className="h-4 w-4 text-rose-600" />
    }
  }

  const getRiskLabel = () => {
    switch (analysis.riskLevel) {
      case 'low':
        return { text: '风险较低', variant: 'success' as const }
      case 'medium':
        return { text: '风险中等', variant: 'warning' as const }
      case 'high':
        return { text: '风险较高', variant: 'destructive' as const }
    }
  }

  const riskInfo = getRiskLabel()

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-rose-600'
  }

  if (filledCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            志愿分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              填报志愿后，这里将显示录取概率分析和优化建议
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          志愿分析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 总体评分 */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">综合评分</p>
            <p className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}
              <span className="text-base font-normal text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {getRiskIcon()}
            <Badge variant={riskInfo.variant}>{riskInfo.text}</Badge>
          </div>
        </div>

        {/* 各志愿录取概率 */}
        {analysis.breakdown.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-medium">各志愿录取概率</h4>
            <div className="space-y-3">
              {analysis.breakdown.map((item) => (
                <div key={item.volunteerId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-14 shrink-0">
                        第{item.volunteerId}志愿
                      </span>
                      <span className="font-medium truncate">{item.schoolName}</span>
                    </span>
                    <span className="font-medium shrink-0 tabular-nums">{item.probability}%</span>
                  </div>
                  <Progress value={item.probability} />
                  <p className="text-xs text-muted-foreground">{item.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 优化建议 */}
        {analysis.suggestions.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              优化建议
            </h4>
            <ul className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-3 text-sm"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-xs text-primary-foreground font-medium">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 说明 */}
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            * 录取概率为参考值，基于历史数据估算，实际录取结果以摇号为准。
            <br />
            * 建议采用"冲-稳-保"策略，前几个志愿适当冲刺，中间志愿求稳，后面志愿保底。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
