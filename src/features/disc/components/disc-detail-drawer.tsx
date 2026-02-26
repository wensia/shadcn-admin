/**
 * DISC 测评报告 —— 单页编辑式排版
 * 面向管理者的专业性格分析报告，无 Tab、无图标
 */

import { useRef, useState } from 'react'
import { toBlob, toPng } from 'html-to-image'
import { Copy, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  DISC_TYPE_CONFIG,
  type TempDISCRecordDetail,
  type DISCDimension,
  type DISCResult,
} from '../types'

// ─── 辅助类型与常量 ───────────────────────────────────────────

interface DiscDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: TempDISCRecordDetail | null
  loading: boolean
}

const DIMENSIONS: DISCDimension[] = ['D', 'I', 'S', 'C']

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '高置信',
  medium: '中置信',
  low: '低置信',
}

type DiscPersonalityGuide = {
  summary: string
  strengths: string[]
  workStyle: string
  communication: string
  riskSignals: string[]
  developmentAdvice: string[]
}

const DISC_PERSONALITY_GUIDE: Record<DISCDimension, DiscPersonalityGuide> = {
  D: {
    summary: '目标驱动、决策果断，善于快速推进工作、解决问题，具有很强的执行力和领导力。',
    strengths: ['果断决策，行动迅速', '目标明确，结果导向', '善于应对挑战和压力', '高效推动项目进展'],
    workStyle: '偏好直接高效的工作方式，注重结果而非过程，倾向于主动掌控局面。',
    communication: '先结论后依据，聚焦关键数据和时间节点，不宜绕圈描述。',
    riskSignals: ['可能忽视他人感受，压缩团队讨论空间', '容易在细节上出现疏漏', '面对需要耐心等待的场景时容易急躁'],
    developmentAdvice: ['在推进目标时多倾听团队成员的想法', '关注过程质量，避免只看结果', '培养耐心，给他人留出思考和表达的空间'],
  },
  I: {
    summary: '热情开朗、善于沟通，具有很强的人际影响力和感染力，擅长激发团队热情和建立信任关系。',
    strengths: ['出色的沟通和表达能力', '善于建立人际关系和信任', '富有创意和感染力', '能够活跃团队气氛'],
    workStyle: '偏好互动式的工作环境，喜欢通过讨论和协作完成任务，注重人际关系的维护。',
    communication: '先建立情感连接再谈任务，适合互动式、反馈式沟通方式。',
    riskSignals: ['可能高估进展、低估细节准备', '在重复性工作中容易失去耐心', '有时过于乐观，缺乏对风险的评估'],
    developmentAdvice: ['将热情转化为可量化的成果', '提升对细节和流程的关注度', '学会在需要时独立完成工作而不依赖他人互动'],
  },
  S: {
    summary: '耐心稳重、可靠踏实，善于倾听和支持他人，是团队稳定性和协作氛围的重要保障。',
    strengths: ['耐心倾听，善于支持他人', '工作稳定，值得信赖', '善于维护团队和谐', '细致周到，服务意识强'],
    workStyle: '偏好稳定可预期的工作节奏，注重团队协作和人际和谐，善于在幕后提供支持。',
    communication: '以尊重和倾听为前提，给足思考时间与背景信息，避免突然施压。',
    riskSignals: ['可能回避正面冲突和高压决策', '在快速变化的场景中反应偏慢', '有时过于迁就他人，忽略自身需求'],
    developmentAdvice: ['在关键时刻学会主动表达自己的观点', '逐步适应变化节奏，提升灵活应变能力', '学会适当拒绝不合理的要求'],
  },
  C: {
    summary: '严谨务实、注重质量，擅长数据分析和流程优化，具有很强的逻辑思维和标准意识。',
    strengths: ['逻辑清晰，分析能力强', '注重质量和准确性', '善于制定标准和优化流程', '做事有条理，计划性强'],
    workStyle: '偏好有明确标准和数据支持的工作方式，注重细节和质量，追求精确和完美。',
    communication: '用数据和事实对齐，减少模糊指令，给予充分的信息和依据。',
    riskSignals: ['可能在信息不充分时延迟决策', '对非标准化的创新尝试容忍度较低', '过度追求完美可能影响交付效率'],
    developmentAdvice: ['学会在信息不完整时做出合理判断', '平衡质量追求与效率要求', '更多关注人际沟通，不要只依赖数据和逻辑'],
  },
}

const DISC_SECONDARY_BLEND_HINT: Record<DISCDimension, string> = {
  D: '次要维度偏 D，说明在关键节点更倾向主动推动和拍板。',
  I: '次要维度偏 I，说明在推进目标时更依赖影响力和关系协调。',
  S: '次要维度偏 S，说明在高压下仍会强调稳定协作与风险缓冲。',
  C: '次要维度偏 C，说明在执行中会更关注方法、标准和质量控制。',
}

// ─── 辅助函数 ───────────────────────────────────────────

function formatTime(time: string) {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

type DiscDimensionScore = { dim: DISCDimension; score: number }
type DiscDimensionValues = Record<DISCDimension, number>

function buildDimensionRanking(scores: Record<DISCDimension, number>): DiscDimensionScore[] {
  return DIMENSIONS
    .map((dim) => ({ dim, score: Math.round(scores[dim] ?? 0) }))
    .sort((a, b) => b.score - a.score)
}

function getTopDimension(values: DiscDimensionValues): DISCDimension {
  return DIMENSIONS.reduce((prev, current) =>
    values[current] > values[prev] ? current : prev
  )
}

function buildGraphInsight(graphs?: DISCResult['graphs']) {
  if (!graphs) return null
  const external: DiscDimensionValues = { D: graphs.external.D, I: graphs.external.I, S: graphs.external.S, C: graphs.external.C }
  const internal: DiscDimensionValues = { D: graphs.internal.D, I: graphs.internal.I, S: graphs.internal.S, C: graphs.internal.C }
  const selfImage: DiscDimensionValues = { D: graphs.selfImage.D, I: graphs.selfImage.I, S: graphs.selfImage.S, C: graphs.selfImage.C }

  const shifts = DIMENSIONS.map((dim) => ({
    dim,
    delta: external[dim] - internal[dim],
  }))
  const strongestShift = shifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
  const pressureIndex = Math.round(
    shifts.reduce((sum, item) => sum + Math.abs(item.delta), 0) / shifts.length
  )

  return {
    externalTop: getTopDimension(external),
    internalTop: getTopDimension(internal),
    selfImageTop: getTopDimension(selfImage),
    strongestShift,
    pressureIndex,
  }
}

function getPressureLabel(pi: number): string {
  if (pi >= 25) return '高适应压力'
  if (pi >= 15) return '中等适应压力'
  return '低适应压力'
}

function getPressureColor(pi: number): string {
  if (pi >= 25) return 'text-red-600'
  if (pi >= 15) return 'text-amber-600'
  return 'text-emerald-600'
}

// ─── 子组件 ──────────────────────────────────────────────

/** 编号章节标题 */
function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 pt-5 pb-3">
      <span className="text-xs font-mono text-muted-foreground/60 tabular-nums tracking-tight">{number}</span>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
    </div>
  )
}

/** DISC 类型标签 */
function DiscTypeBadge({ type, size = 'sm' }: { type?: string; size?: 'sm' | 'lg' }) {
  if (!type) return <span className="text-muted-foreground">—</span>
  const dim = type as DISCDimension
  const config = DISC_TYPE_CONFIG[dim]
  if (!config) return <Badge variant="outline">{type}</Badge>
  return (
    <Badge
      className={cn(size === 'lg' && 'text-sm px-3 py-1')}
      style={{ backgroundColor: config.bgColor, color: config.color, borderColor: config.color }}
    >
      {dim} — {config.label}
    </Badge>
  )
}

/** 四维分数条 */
function ScoreBar({ dim, score, isTop }: { dim: DISCDimension; score: number; isTop: boolean }) {
  const config = DISC_TYPE_CONFIG[dim]
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 flex items-center gap-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
        <span className="text-sm font-medium">{dim}</span>
        <span className="text-xs text-muted-foreground">{config.label}</span>
      </div>
      <div className="flex-1 relative">
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              backgroundColor: config.color,
              opacity: isTop ? 1 : 0.6,
            }}
          />
        </div>
      </div>
      <span className={cn(
        'text-sm font-bold tabular-nums w-12 text-right',
        isTop && 'text-base'
      )}>
        {score}%
      </span>
    </div>
  )
}

/** 管理建议行 */
function GuideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-3 border-b border-dashed last:border-0">
      <span className="text-xs font-medium text-muted-foreground pt-0.5">{label}</span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}

// ─── 主组件 ──────────────────────────────────────────────

/** 临时扩展容器以捕获完整内容，截图后恢复 */
async function captureFullContent<T>(
  el: HTMLElement,
  fn: (el: HTMLElement) => Promise<T>,
): Promise<T> {
  const prev = { overflow: el.style.overflow, height: el.style.height }
  el.style.overflow = 'visible'
  el.style.height = `${el.scrollHeight}px`
  try {
    return await fn(el)
  } finally {
    el.style.overflow = prev.overflow
    el.style.height = prev.height
  }
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

export function DiscDetailDrawer({ open, onOpenChange, detail, loading }: DiscDetailDrawerProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)

  if (!open) return null

  const result = detail?.result
  const primaryCode = result?.primaryType?.code
  const secondaryCode = result?.secondaryType?.code
  const primaryGuide = primaryCode ? DISC_PERSONALITY_GUIDE[primaryCode] : null
  const scoreRanking = result ? buildDimensionRanking(result.scores) : []
  const resolvedConfidence = result?.confidence || null
  const resolvedMixedType = result?.mixedType || null
  const graphInsight = result ? buildGraphInsight(result.graphs) : null

  const filename = `DISC报告_${detail?.name || '未知'}_${new Date().toISOString().slice(0, 10)}.png`

  async function handleDownload() {
    if (!bodyRef.current) return
    setExporting(true)
    try {
      const url = await captureFullContent(bodyRef.current, (el) =>
        toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2 }),
      )
      triggerDownload(url, filename)
      toast.success('图片已下载')
    } catch {
      toast.error('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  async function handleCopy() {
    if (!bodyRef.current) return
    setCopying(true)
    try {
      const blob = await captureFullContent(bodyRef.current, (el) =>
        toBlob(el, { backgroundColor: '#ffffff', pixelRatio: 2 }),
      )
      if (!blob) throw new Error('生成图片失败')

      // HTTPS 环境：直接写入剪贴板
      if (navigator.clipboard?.write && window.isSecureContext) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        toast.success('已复制到剪贴板')
      } else {
        // HTTP 降级：自动下载
        const url = URL.createObjectURL(blob)
        triggerDownload(url, filename)
        URL.revokeObjectURL(url)
        toast.info('当前环境不支持复制图片，已自动下载')
      }
    } catch {
      toast.error('复制失败，请重试')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[780px] p-0 [&>button:last-child]:hidden overflow-hidden flex flex-col">
        {/* ─── Header ─── */}
        <SheetHeader className="px-6 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold tracking-tight">
              DISC 测评报告
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={copying || !result}
                className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1"
              >
                {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                复制为图片
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={exporting || !result}
                className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1"
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                下载为图片
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs text-muted-foreground hover:text-foreground h-7"
              >
                关闭
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* ─── Body ─── */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              加载中...
            </div>
          ) : detail && result ? (
            <div className="px-8 pb-12">

              {/* ═══ 候选人档案头 ═══ */}
              <div className="pt-4 pb-4 border-b">
                <div className="flex items-baseline gap-3 mb-1.5">
                  <h2 className="text-xl font-bold tracking-tight">{detail.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {detail.phone || '未填写手机号'}
                    <span className="mx-1.5 text-muted-foreground/30">·</span>
                    {formatTime(detail.submitted_at)}
                    {resolvedConfidence && (
                      <>
                        <span className="mx-1.5 text-muted-foreground/30">·</span>
                        <span className={cn(
                          resolvedConfidence.level === 'high' && 'text-emerald-600',
                          resolvedConfidence.level === 'medium' && 'text-amber-600',
                          resolvedConfidence.level === 'low' && 'text-red-600',
                        )}>
                          {CONFIDENCE_LABEL[resolvedConfidence.level] || resolvedConfidence.level}
                          {' '}{resolvedConfidence.score}分
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {/* 类型标签 + 一句话总结 */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <DiscTypeBadge type={primaryCode} size="lg" />
                  {secondaryCode && (
                    <>
                      <span className="text-muted-foreground/40 text-sm">/</span>
                      <DiscTypeBadge type={secondaryCode} />
                    </>
                  )}
                  {resolvedMixedType && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      {resolvedMixedType.code} · {resolvedMixedType.tendencyLabel}
                    </Badge>
                  )}
                </div>
                {primaryGuide && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {primaryGuide.summary}
                  </p>
                )}
              </div>

              {/* ═══ 01 四维分析 ═══ */}
              <SectionHeading number="01" title="四维分析" />

              {/* 特征标签 */}
              {result.characteristics && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(result.characteristics.primary || []).map((item, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">{item}</Badge>
                  ))}
                  {(result.characteristics.secondary || []).map((item, i) => (
                    <Badge key={`s-${i}`} variant="outline" className="font-normal">{item}</Badge>
                  ))}
                </div>
              )}

              {/* 四维分数 + 解读 */}
              <div className="space-y-4">
                {scoreRanking.map((item, idx) => {
                  const interpretText = result.interpretation?.[item.dim]
                  return (
                    <div key={item.dim}>
                      <ScoreBar dim={item.dim} score={item.score} isTop={idx === 0} />
                      {interpretText && (
                        <p className="text-xs leading-relaxed text-muted-foreground mt-1.5 ml-[5.75rem]">
                          {interpretText}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              <Separator className="mt-6" />

              {/* ═══ 02 三图差异解读 ═══ */}
              {graphInsight && result.graphs && (
                <>
                  <SectionHeading number="02" title="三图差异解读" />

                  {/* 主维度总结 */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {([
                      { label: '外在行为', top: graphInsight.externalTop, bg: 'bg-emerald-50/60' },
                      { label: '内在核心', top: graphInsight.internalTop, bg: 'bg-blue-50/60' },
                      { label: '自我形象', top: graphInsight.selfImageTop, bg: 'bg-amber-50/60' },
                    ] as const).map((g) => (
                      <div key={g.label} className={cn('rounded-lg p-3 text-center', g.bg)}>
                        <p className="text-xs text-muted-foreground mb-0.5">{g.label}</p>
                        <p className="text-sm font-semibold" style={{ color: DISC_TYPE_CONFIG[g.top].color }}>
                          {g.top} · {DISC_TYPE_CONFIG[g.top].label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 四维对比表格 */}
                  <div className="rounded-lg border overflow-hidden mb-4">
                    {/* 表头 */}
                    <div className="grid grid-cols-[3.5rem_1fr_1fr_1fr_3.5rem] bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                      <span>维度</span>
                      <span className="text-center">外在行为</span>
                      <span className="text-center">内在核心</span>
                      <span className="text-center">自我形象</span>
                      <span className="text-right">偏移</span>
                    </div>
                    {/* 数据行 */}
                    {DIMENSIONS.map((dim) => {
                      const config = DISC_TYPE_CONFIG[dim]
                      const ext = Math.round(result.graphs!.external[dim])
                      const int_ = Math.round(result.graphs!.internal[dim])
                      const self = Math.round(result.graphs!.selfImage[dim])
                      const delta = ext - int_
                      return (
                        <div key={dim} className="grid grid-cols-[3.5rem_1fr_1fr_1fr_3.5rem] items-center border-t px-4 py-2.5">
                          <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                            <span className="text-sm font-medium">{dim}</span>
                          </span>
                          {/* 外在 */}
                          <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${ext}%` }} />
                            </div>
                            <span className="text-xs tabular-nums w-8 text-right">{ext}</span>
                          </div>
                          {/* 内在 */}
                          <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${int_}%` }} />
                            </div>
                            <span className="text-xs tabular-nums w-8 text-right">{int_}</span>
                          </div>
                          {/* 自我 */}
                          <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-amber-500" style={{ width: `${self}%` }} />
                            </div>
                            <span className="text-xs tabular-nums w-8 text-right">{self}</span>
                          </div>
                          {/* 偏移 */}
                          <span className={cn(
                            'text-xs tabular-nums text-right font-medium',
                            Math.abs(delta) >= 20 ? 'text-red-500' : 'text-muted-foreground'
                          )}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* 压力指数 */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-muted-foreground">
                      最大偏移：
                      <span className="font-medium text-foreground">{graphInsight.strongestShift.dim}</span>
                      （{graphInsight.strongestShift.delta >= 0 ? '外显高于内在' : '内在高于外显'} {Math.abs(graphInsight.strongestShift.delta).toFixed(0)} 分）
                    </span>
                    <span className={cn('font-medium', getPressureColor(graphInsight.pressureIndex))}>
                      {getPressureLabel(graphInsight.pressureIndex)}（{graphInsight.pressureIndex}）
                    </span>
                  </div>

                  <Separator className="mt-6" />
                </>
              )}

              {/* ═══ 03 行为风格特征 ═══ */}
              {primaryCode && primaryGuide && (
                <>
                  <SectionHeading number="03" title="行为风格特征" />

                  {/* 核心优势 */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">核心优势</p>
                    <div className="flex flex-wrap gap-2">
                      {primaryGuide.strengths.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="font-normal">{item}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border px-5 py-1">
                    <GuideRow label="工作方式">{primaryGuide.workStyle}</GuideRow>
                    <GuideRow label="沟通风格">
                      {primaryGuide.communication}
                      {secondaryCode && (
                        <span className="text-muted-foreground block mt-1 text-xs">
                          {DISC_SECONDARY_BLEND_HINT[secondaryCode]}
                        </span>
                      )}
                    </GuideRow>
                  </div>

                  {/* 沟通建议 */}
                  {result.communicationAdvice && result.communicationAdvice.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">沟通要点</p>
                      <ul className="space-y-1.5">
                        {result.communicationAdvice.map((item, i) => (
                          <li key={i} className="text-sm leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-muted-foreground/40">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Separator className="mt-6" />
                </>
              )}

              {/* ═══ 04 风险与挑战 ═══ */}
              {((primaryGuide?.riskSignals && primaryGuide.riskSignals.length > 0) ||
                (result.potentialChallenges && result.potentialChallenges.length > 0)) && (
                <>
                  <SectionHeading number="04" title="风险与挑战" />

                  {primaryGuide && primaryGuide.riskSignals.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">需要注意的行为倾向</p>
                      <ul className="space-y-2">
                        {primaryGuide.riskSignals.map((item, i) => (
                          <li key={i} className="text-sm leading-relaxed pl-4 relative before:content-['·'] before:absolute before:left-1 before:text-amber-500 before:font-bold">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.potentialChallenges && result.potentialChallenges.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">潜在挑战</p>
                      <ul className="space-y-2">
                        {result.potentialChallenges.map((item, i) => (
                          <li key={i} className="text-sm leading-relaxed pl-4 relative before:content-['·'] before:absolute before:left-1 before:text-muted-foreground/60 before:font-bold">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Separator className="mt-6" />
                </>
              )}

              {/* ═══ 个人发展建议 ═══ */}
              {primaryGuide && (
                <>
                  <SectionHeading number="05" title="个人发展建议" />
                  <div className="space-y-3">
                    {primaryGuide.developmentAdvice.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm leading-relaxed pt-0.5">{item}</p>
                      </div>
                    ))}
                  </div>

                  <Separator className="mt-6" />
                </>
              )}

              {/* ═══ 06 数据附录 ═══ */}
              <SectionHeading number="06" title="数据附录" />

              {/* 原始计分 */}
              {result.rawData && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">原始计分明细</p>
                  <div className="rounded-lg border overflow-hidden text-sm">
                    <div className="grid grid-cols-5 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                      <span>维度</span>
                      <span className="text-center">Most</span>
                      <span className="text-center">Least</span>
                      <span className="text-center">Raw</span>
                      <span className="text-center">Percentile</span>
                    </div>
                    {DIMENSIONS.map((dim) => {
                      const config = DISC_TYPE_CONFIG[dim]
                      return (
                        <div key={dim} className="grid grid-cols-5 border-t px-4 py-2">
                          <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                            <span className="font-medium">{dim}</span>
                            <span className="text-xs text-muted-foreground">{config.label}</span>
                          </span>
                          <span className="text-center tabular-nums">{result.rawData?.mostCounts?.[dim] ?? '—'}</span>
                          <span className="text-center tabular-nums">{result.rawData?.leastCounts?.[dim] ?? '—'}</span>
                          <span className="text-center tabular-nums">{result.rawData?.rawScores?.[dim] ?? '—'}</span>
                          <span className="text-center tabular-nums font-medium">{result.scores?.[dim] ?? '—'}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 置信度详情 */}
              {resolvedConfidence && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">判定置信度</p>
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant={
                        resolvedConfidence.level === 'high' ? 'default'
                          : resolvedConfidence.level === 'medium' ? 'secondary'
                            : 'outline'
                      }>
                        {CONFIDENCE_LABEL[resolvedConfidence.level] || resolvedConfidence.level}
                      </Badge>
                      <span className="tabular-nums">
                        置信分 {resolvedConfidence.score}/100
                      </span>
                      <span className="text-xs text-muted-foreground">
                        主次分差 {resolvedConfidence.gap}
                      </span>
                    </div>
                    <Progress value={resolvedConfidence.score} className="h-1.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {resolvedConfidence.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* 复合倾向 */}
              {resolvedMixedType && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">复合倾向分析</p>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{resolvedMixedType.code}</Badge>
                      <Badge variant="secondary">{resolvedMixedType.tendencyLabel}</Badge>
                      <span className="text-xs text-muted-foreground">分差 {resolvedMixedType.gap}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{resolvedMixedType.description}</p>
                  </div>
                </div>
              )}

              {/* 测试元数据 */}
              <div className="mb-5">
                <p className="text-xs font-medium text-muted-foreground mb-2">测试信息</p>
                <div className="grid grid-cols-[7rem_1fr] gap-y-2 gap-x-4 text-sm rounded-lg border p-4">
                  <span className="text-muted-foreground">测试记录ID</span>
                  <span className="font-mono text-xs break-all">{detail.test_record_id}</span>
                  <span className="text-muted-foreground">计算方法</span>
                  <span className="font-mono text-xs">{result.calculationMethod || '—'}</span>
                  <span className="text-muted-foreground">提交时间</span>
                  <span>{formatTime(detail.submitted_at)}</span>
                  <span className="text-muted-foreground">测评生成时间</span>
                  <span>{result.testDate ? formatTime(result.testDate) : '—'}</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              无数据
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
