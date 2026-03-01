/**
 * DISC 测评报告 —— 单页编辑式排版
 * 面向管理者的专业性格分析报告，支持 AI 辅助分析
 */

import { useRef, useState, useCallback } from 'react'
import { toBlob, toPng } from 'html-to-image'
import { Briefcase, ChevronRight, Copy, Download, Image, Loader2, Sparkles, User, Zap } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SideSheet, Dropdown, Skeleton } from '@douyinfe/semi-ui-19'
import { Tag } from '@douyinfe/semi-ui-19'
import { Button as SemiButton } from '@douyinfe/semi-ui-19'
import { Progress as SemiProgress } from '@douyinfe/semi-ui-19'
import { Collapsible } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'
import {
  DISC_TYPE_CONFIG,
  type TempDISCRecordDetail,
  type DISCDimension,
  type DISCResult,
  type DISCAIAnalysis,
} from '../types'
import { triggerDiscAIAnalysis } from '../api'
import { DiscJobFitCard, renderMarkedText } from './disc-job-fit-card'

// ─── 辅助类型与常量 ───────────────────────────────────────────

interface DiscDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: TempDISCRecordDetail | null
  loading: boolean
  /** 当 AI 分析完成后回调，用于更新父组件缓存的 detail */
  onDetailUpdate?: (updated: TempDISCRecordDetail) => void
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

// ─── 三图行为模式分析配置 ────────────────────────────────

const GRAPH_SCENARIOS = [
  {
    key: 'external' as const,
    label: '日常工作中',
    subtitle: '工作环境中表现出来的行为风格',
    Icon: Briefcase,
  },
  {
    key: 'internal' as const,
    label: '压力情境下',
    subtitle: '面对压力时本能的行为反应',
    Icon: Zap,
  },
  {
    key: 'selfImage' as const,
    label: '自我认知中',
    subtitle: '认为自己是什么样的人',
    Icon: User,
  },
]

/** 每个维度的一句话通俗行为描述 */
const DIMENSION_NARRATIVE: Record<DISCDimension, string> = {
  D: '习惯以结果为导向，快速决策、主动推进',
  I: '善于沟通协调，用热情和感染力影响他人',
  S: '注重稳定和谐，耐心倾听、踏实配合',
  C: '追求精准规范，注重数据和细节的把控',
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

/** 分析三图行为一致性 */
function analyzeConsistency(
  extTop: DISCDimension,
  intTop: DISCDimension,
  siTop: DISCDimension,
  graphs: NonNullable<DISCResult['graphs']>,
) {
  const allSame = extTop === intTop && intTop === siTop
  const twoSame = extTop === intTop || intTop === siTop || extTop === siTop

  // 得分波动仅在主导类型一致时作为辅助参考
  const maxShifts = DIMENSIONS.map((dim) => {
    const vals = [graphs.external[dim], graphs.internal[dim], graphs.selfImage[dim]]
    return Math.max(...vals) - Math.min(...vals)
  })
  const avgShift = Math.round(maxShifts.reduce((a, b) => a + b, 0) / maxShifts.length)

  // ── 第一层：三个情境主导类型完全相同 ──
  if (allSame) {
    if (avgShift < 15) {
      return {
        label: '高度一致',
        description: `在日常工作、压力情境和自我认知中，都以${DISC_TYPE_CONFIG[extTop].label}风格为主。行为表现稳定，内外一致性强，别人看到的样子和真实的自己差别不大。`,
      }
    }
    return {
      label: '基本一致',
      description: `三种情境下的核心风格都是${DISC_TYPE_CONFIG[extTop].label}，行为类型保持一致。不过各维度的强弱在不同情境下有一定波动，说明虽然主导风格不变，表现的力度会随环境做出自然调整。`,
    }
  }

  // ── 第二层：两个情境主导类型相同 ──
  if (twoSame) {
    let hint = '整体行为风格基本一致，在个别情境下会有轻微调整，属于正常的自我调节。'
    if (extTop !== intTop && extTop === siTop) {
      hint = `日常工作和自我认知一致（偏${DISC_TYPE_CONFIG[extTop].label}），但压力下行为会转向${DISC_TYPE_CONFIG[intTop].label}风格——这很常见，人在紧张时往往会切换到更本能的反应模式。`
    } else if (intTop !== extTop && intTop === siTop) {
      hint = `内心认同和压力反应一致（偏${DISC_TYPE_CONFIG[intTop].label}），但日常工作中会调整为${DISC_TYPE_CONFIG[extTop].label}风格——可能是为了适应当前的工作环境要求。`
    } else if (extTop === intTop && siTop !== extTop) {
      hint = `日常行为和压力反应一致（偏${DISC_TYPE_CONFIG[extTop].label}），但内心对自己的定位偏${DISC_TYPE_CONFIG[siTop].label}——自我觉察和实际表现有一定偏差。`
    }
    return {
      label: '基本一致',
      description: hint,
    }
  }

  // ── 第三层：三个情境主导类型完全不同 ──
  return {
    label: '差异较大',
    description: `不同情境下的行为风格有明显差异：日常偏${DISC_TYPE_CONFIG[extTop].label}、压力下偏${DISC_TYPE_CONFIG[intTop].label}、自我认知偏${DISC_TYPE_CONFIG[siTop].label}。这可能意味着工作中有较强的角色适应，需要关注这种调整是否带来了额外的内在消耗。`,
  }
}

/** 提取显著偏移洞察 */
function extractSignificantShifts(graphs: NonNullable<DISCResult['graphs']>) {
  return DIMENSIONS
    .map((dim) => {
      const ext = Math.round(graphs.external[dim])
      const int_ = Math.round(graphs.internal[dim])
      const delta = ext - int_
      if (Math.abs(delta) < 20) return null
      const label = DISC_TYPE_CONFIG[dim].label
      const narrative =
        delta > 0
          ? `${label}（${dim}）在日常工作中的表现明显高于压力下（${ext} vs ${int_}），说明有意识地加强了这方面的表现，但压力下会收敛。`
          : `${label}（${dim}）在压力下明显增强（${int_} vs ${ext}），说明压力激发了这方面的本能反应，而日常中有所收敛。`
      return { dim, delta, narrative }
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b!.delta) - Math.abs(a!.delta)) as Array<{
    dim: DISCDimension
    delta: number
    narrative: string
  }>
}

function getPressureLabel(pi: number): string {
  if (pi >= 25) return '高适应压力'
  if (pi >= 15) return '中等适应压力'
  return '低适应压力'
}

function getPressureColor(pi: number): string {
  if (pi >= 25) return 'text-foreground font-semibold'
  if (pi >= 15) return 'text-foreground'
  return 'text-muted-foreground'
}

// ─── 子组件 ──────────────────────────────────────────────

/** 编号章节标题 */
function SectionHeading({ number, title, aiEnhanced }: { number: string; title: string; aiEnhanced?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 pt-5 pb-3">
      <span className="text-xs font-mono text-muted-foreground/60 tabular-nums tracking-tight">{number}</span>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {aiEnhanced && <AITag />}
    </div>
  )
}

/** AI 生成标记 */
function AITag() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium">
      <Sparkles className="h-3 w-3" />
      AI
    </span>
  )
}

/** DISC 类型标签 - 使用 Semi Tag */
function DiscTypeBadge({ type, size = 'sm' }: { type?: string; size?: 'sm' | 'lg' }) {
  if (!type) return <span className="text-muted-foreground">—</span>
  const dim = type as DISCDimension
  const config = DISC_TYPE_CONFIG[dim]
  if (!config) return <Tag type="ghost">{type}</Tag>
  return (
    <Tag
      size={size === 'lg' ? 'large' : 'small'}
      style={{ backgroundColor: config.bgColor, color: config.color, borderColor: config.color }}
    >
      {dim} — {config.label}
    </Tag>
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

export function DiscDetailDrawer({ open, onOpenChange, detail, loading, onDetailUpdate }: DiscDetailDrawerProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [detailDataOpen, setDetailDataOpen] = useState(false)

  // AI 分析结果：优先从 detail.result.aiAnalysis 读取（缓存）
  const cachedAI = detail?.result?.aiAnalysis
  const [localAI, setLocalAI] = useState<DISCAIAnalysis | null>(null)
  const aiAnalysis: DISCAIAnalysis | undefined = localAI ?? cachedAI
  const hasAI = aiAnalysis?.status === 'completed'

  const handleAIAnalyze = useCallback(async () => {
    if (!detail?.id || analyzing) return
    setAnalyzing(true)
    try {
      const resp = await triggerDiscAIAnalysis(detail.id, hasAI)
      if (resp.code === 0 && resp.data?.aiAnalysis) {
        const ai = resp.data.aiAnalysis as DISCAIAnalysis
        setLocalAI(ai)
        // 通知父组件更新缓存
        if (onDetailUpdate && detail) {
          onDetailUpdate({
            ...detail,
            result: { ...detail.result, aiAnalysis: ai },
          })
        }
        toast.success('AI 分析完成')
      } else {
        toast.error(resp.message || 'AI 分析失败')
      }
    } catch {
      toast.error('AI 分析请求失败，请稍后重试')
    } finally {
      setAnalyzing(false)
    }
  }, [detail, analyzing, onDetailUpdate])

  if (!open) return null

  const result = detail?.result
  const primaryCode = result?.primaryType?.code
  const secondaryCode = result?.secondaryType?.code
  const primaryGuide = primaryCode ? DISC_PERSONALITY_GUIDE[primaryCode] : null
  const scoreRanking = result ? buildDimensionRanking(result.scores) : []
  const resolvedConfidence = result?.confidence || null
  const resolvedMixedType = result?.mixedType || null
  const graphInsight = result ? buildGraphInsight(result.graphs) : null

  // 动态章节编号
  let sectionNum = 0
  const nextSection = () => String(++sectionNum).padStart(2, '0')

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
    <SideSheet
      visible={open}
      onCancel={() => onOpenChange(false)}
      placement="right"
      width={780}
      title={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm font-semibold tracking-tight">
            DISC 测评报告
          </span>
          <div className="flex items-center gap-1">
            {/* AI 分析按钮 */}
            {result && (
              hasAI ? (
                <SemiButton
                  theme="light"
                  size="small"
                  onClick={handleAIAnalyze}
                  disabled={analyzing}
                  loading={analyzing}
                  icon={!analyzing ? <Sparkles className="h-3.5 w-3.5 text-primary" /> : undefined}
                  style={{ fontSize: 12, height: 28, gap: 4 }}
                >
                  {analyzing ? '分析中...' : '重新分析'}
                </SemiButton>
              ) : aiAnalysis?.status === 'processing' || aiAnalysis?.status === 'pending' ? (
                <Tag type="ghost" style={{ fontSize: 12, height: 28, gap: 4 }} className="animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI 分析中...
                </Tag>
              ) : aiAnalysis?.status === 'failed' ? (
                <SemiButton
                  theme="light"
                  size="small"
                  onClick={handleAIAnalyze}
                  disabled={analyzing}
                  loading={analyzing}
                  icon={!analyzing ? <Sparkles className="h-3.5 w-3.5" /> : undefined}
                  style={{ fontSize: 12, height: 28, gap: 4 }}
                >
                  {analyzing ? '分析中...' : '重新分析'}
                </SemiButton>
              ) : (
                <SemiButton
                  theme="light"
                  size="small"
                  onClick={handleAIAnalyze}
                  disabled={analyzing}
                  loading={analyzing}
                  icon={!analyzing ? <Sparkles className="h-3.5 w-3.5 text-primary" /> : undefined}
                  style={{ fontSize: 12, height: 28, gap: 4 }}
                >
                  {analyzing ? '分析中...' : 'AI 分析'}
                </SemiButton>
              )
            )}
            <Dropdown
              trigger="click"
              position="bottomRight"
              clickToHide
              render={
                <Dropdown.Menu>
                  <Dropdown.Item
                    icon={<Copy className="h-3.5 w-3.5" />}
                    onClick={handleCopy}
                    disabled={copying || !result}
                  >
                    复制到剪贴板
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={<Download className="h-3.5 w-3.5" />}
                    onClick={handleDownload}
                    disabled={exporting || !result}
                  >
                    下载为图片
                  </Dropdown.Item>
                </Dropdown.Menu>
              }
            >
              <span style={{ display: 'inline-flex' }}>
                <SemiButton
                  theme="borderless"
                  size="small"
                  disabled={(copying || exporting) || !result}
                  loading={copying || exporting}
                  icon={!(copying || exporting) ? <Image className="h-3.5 w-3.5" /> : undefined}
                  style={{ fontSize: 12, height: 28, gap: 4, color: 'var(--semi-color-text-2)' }}
                >
                  {copying ? '复制中...' : exporting ? '导出中...' : '导出图片'}
                </SemiButton>
              </span>
            </Dropdown>
          </div>
        </div>
      }
      headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
      bodyStyle={{ padding: 0, overflow: 'hidden' }}
      closable={true}
    >
      {/* ─── Body ─── */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
        {loading ? (
          <div className="px-8 pb-12">
            {/* 骨架屏：候选人档案头 */}
            <div className="pt-4 pb-4 border-b">
              <div className="flex items-baseline gap-3 mb-1.5">
                <Skeleton.Title style={{ width: 80, height: 24 }} loading />
                <Skeleton.Paragraph rows={1} style={{ width: 200, height: 14 }} loading />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Skeleton.Paragraph rows={1} style={{ width: 100, height: 28 }} loading />
                <Skeleton.Paragraph rows={1} style={{ width: 80, height: 28 }} loading />
              </div>
            </div>

            {/* 骨架屏：四维分数 */}
            <div className="pt-6 pb-4">
              <Skeleton.Title style={{ width: 120, height: 18, marginBottom: 16 }} loading />
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <Skeleton.Paragraph rows={1} style={{ width: '40%', height: 14 }} loading />
                    <Skeleton.Title style={{ width: '60%', height: 24 }} loading />
                    <Skeleton.Paragraph rows={1} style={{ width: '100%', height: 8 }} loading />
                  </div>
                ))}
              </div>
            </div>

            {/* 骨架屏：性格解读 */}
            <div className="pt-4 pb-4 border-t">
              <Skeleton.Title style={{ width: 140, height: 18, marginBottom: 12 }} loading />
              <Skeleton.Paragraph rows={3} style={{ width: '100%' }} loading />
            </div>

            {/* 骨架屏：优势 & 沟通建议 */}
            <div className="pt-4 pb-4 border-t">
              <Skeleton.Title style={{ width: 100, height: 18, marginBottom: 12 }} loading />
              <div className="space-y-2">
                <Skeleton.Paragraph rows={1} style={{ width: '90%', height: 14 }} loading />
                <Skeleton.Paragraph rows={1} style={{ width: '75%', height: 14 }} loading />
                <Skeleton.Paragraph rows={1} style={{ width: '85%', height: 14 }} loading />
              </div>
            </div>

            {/* 骨架屏：AI 分析区 */}
            <div className="pt-4 pb-4 border-t">
              <Skeleton.Title style={{ width: 120, height: 18, marginBottom: 12 }} loading />
              <Skeleton.Paragraph rows={4} style={{ width: '100%' }} loading />
            </div>
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
                        resolvedConfidence.level === 'high' && 'text-foreground font-medium',
                        resolvedConfidence.level === 'medium' && 'text-muted-foreground',
                        resolvedConfidence.level === 'low' && 'text-muted-foreground/70',
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
                  <Tag type="ghost" className="ml-1" style={{ fontSize: 12 }}>
                    {resolvedMixedType.code} · {resolvedMixedType.tendencyLabel}
                  </Tag>
                )}
              </div>
              {/* 性格画像：AI 版本 or 模板版本 */}
              {hasAI ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {renderMarkedText(aiAnalysis.personalityProfile)}
                  <AITag />
                </p>
              ) : primaryGuide ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {renderMarkedText(primaryGuide.summary)}
                </p>
              ) : null}
            </div>

            {/* ═══ 01 四维分析 ═══ */}
            <SectionHeading number={nextSection()} title="四维分析" aiEnhanced={hasAI} />

            {/* 特征标签 */}
            {result.characteristics && (
              <div className="flex flex-wrap gap-2 mb-4">
                {(result.characteristics.primary || []).map((item, i) => (
                  <Tag key={i} color="blue" type="light">{item}</Tag>
                ))}
                {(result.characteristics.secondary || []).map((item, i) => (
                  <Tag key={`s-${i}`} type="ghost">{item}</Tag>
                ))}
              </div>
            )}

            {/* 四维分数 + 解读 */}
            <div className="space-y-4">
              {scoreRanking.map((item, idx) => {
                const aiText = hasAI ? aiAnalysis.dimensionInsights?.[item.dim] : undefined
                const interpretText = aiText || result.interpretation?.[item.dim]
                return (
                  <div key={item.dim}>
                    <ScoreBar dim={item.dim} score={item.score} isTop={idx === 0} />
                    {interpretText && (
                      <p className="text-xs leading-relaxed text-muted-foreground mt-1.5 ml-[5.75rem]">
                        {renderMarkedText(interpretText)}
                        {aiText && <>{' '}<AITag /></>}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-b mt-6" />

            {/* ═══ 02 行为模式分析 ═══ */}
            {graphInsight && result.graphs && (() => {
              const consistency = analyzeConsistency(
                graphInsight.externalTop,
                graphInsight.internalTop,
                graphInsight.selfImageTop,
                result.graphs!,
              )
              const shifts = extractSignificantShifts(result.graphs!)

              return (
                <>
                  <SectionHeading number={nextSection()} title="行为模式分析" />

                  {/* ── 三场景卡片 ── */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {GRAPH_SCENARIOS.map((s) => {
                      const g = result.graphs![s.key]
                      const top = getTopDimension({ D: g.D, I: g.I, S: g.S, C: g.C })
                      const cfg = DISC_TYPE_CONFIG[top]
                      return (
                        <div key={s.key} className="rounded-lg border bg-card p-3.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <s.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                            <span className="text-sm font-semibold">{top} — {cfg.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {DIMENSION_NARRATIVE[top]}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* ── 行为一致性分析 ── */}
                  <div className="rounded-lg border bg-secondary/40 p-4 mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">行为一致性</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border bg-card">
                        {consistency.label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80">{consistency.description}</p>
                  </div>

                  {/* ── 关键发现 ── */}
                  {shifts.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">关键发现</p>
                      <div className="space-y-2">
                        {shifts.map((s) => (
                          <div key={s.dim} className="flex items-start gap-2.5 text-sm leading-relaxed">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                              style={{ backgroundColor: DISC_TYPE_CONFIG[s.dim].color }}
                            />
                            <span>{s.narrative}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 适应压力指数 ── */}
                  <div className="flex items-center gap-3 text-xs mb-5 px-1">
                    <span className="text-muted-foreground">环境适应压力：</span>
                    <span className={cn(getPressureColor(graphInsight.pressureIndex))}>
                      {getPressureLabel(graphInsight.pressureIndex)}
                    </span>
                    <span className="text-muted-foreground">
                      — 分数越高，说明不同情境下行为调整幅度越大
                    </span>
                  </div>

                  {/* ── 详细对比数据（可折叠） ── */}
                  <Collapsible isOpen={detailDataOpen}>
                    <div className="rounded-lg border overflow-hidden">
                      <div className="grid grid-cols-[3.5rem_1fr_1fr_1fr_3.5rem] bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                        <span>维度</span>
                        <span className="text-center">日常工作</span>
                        <span className="text-center">压力情境</span>
                        <span className="text-center">自我认知</span>
                        <span className="text-right">偏移</span>
                      </div>
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
                            <div className="flex items-center gap-2 px-2">
                              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full opacity-40" style={{ width: `${ext}%`, backgroundColor: config.color }} />
                              </div>
                              <span className="text-xs tabular-nums w-8 text-right">{ext}</span>
                            </div>
                            <div className="flex items-center gap-2 px-2">
                              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full opacity-40" style={{ width: `${int_}%`, backgroundColor: config.color }} />
                              </div>
                              <span className="text-xs tabular-nums w-8 text-right">{int_}</span>
                            </div>
                            <div className="flex items-center gap-2 px-2">
                              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full opacity-40" style={{ width: `${self}%`, backgroundColor: config.color }} />
                              </div>
                              <span className="text-xs tabular-nums w-8 text-right">{self}</span>
                            </div>
                            <span className={cn(
                              'text-xs tabular-nums text-right font-medium',
                              Math.abs(delta) >= 20 ? 'text-foreground font-bold' : 'text-muted-foreground',
                            )}>
                              {delta > 0 ? '+' : ''}{delta}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </Collapsible>
                  <button
                    onClick={() => setDetailDataOpen(!detailDataOpen)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group mb-2 mt-2"
                  >
                    <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", detailDataOpen && "rotate-90")} />
                    <span>{detailDataOpen ? '收起详细对比数据' : '查看详细对比数据'}</span>
                  </button>

                  <div className="border-b mt-6" />
                </>
              )
            })()}

            {/* ═══ 03 行为风格特征 ═══ */}
            {primaryCode && primaryGuide && (
              <>
                <SectionHeading number={nextSection()} title="行为风格特征" aiEnhanced={hasAI} />

                {/* 核心优势 */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">核心优势</p>
                  <div className="flex flex-wrap gap-2">
                    {primaryGuide.strengths.map((item, idx) => (
                      <Tag key={idx} color="blue" type="light">{item}</Tag>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border px-5 py-1">
                  <GuideRow label="工作方式">{renderMarkedText(primaryGuide.workStyle)}</GuideRow>
                  <GuideRow label="沟通风格">
                    {renderMarkedText(primaryGuide.communication)}
                    {secondaryCode && (
                      <span className="text-muted-foreground block mt-1 text-xs">
                        {renderMarkedText(DISC_SECONDARY_BLEND_HINT[secondaryCode])}
                      </span>
                    )}
                  </GuideRow>
                </div>

                {/* 沟通要点：AI 版本 or 模板版本 */}
                {(() => {
                  const aiComm = hasAI ? aiAnalysis.communicationStrategy : undefined
                  const templateComm = result.communicationAdvice
                  const items = aiComm || templateComm
                  if (!items || items.length === 0) return null
                  return (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        沟通要点
                        {aiComm && <>{' '}<AITag /></>}
                      </p>
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li key={i} className="text-sm leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-muted-foreground/40">
                            {renderMarkedText(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}

                <div className="border-b mt-6" />
              </>
            )}

            {/* ═══ 04 风险与挑战 ═══ */}
            {(() => {
              const aiRisks = hasAI ? aiAnalysis.riskAnalysis : undefined
              const hasRiskSignals = primaryGuide?.riskSignals && primaryGuide.riskSignals.length > 0
              const hasChallenges = aiRisks || (result.potentialChallenges && result.potentialChallenges.length > 0)
              if (!hasRiskSignals && !hasChallenges) return null
              return (
                <>
                  <SectionHeading number={nextSection()} title="风险与挑战" aiEnhanced={!!aiRisks} />

                  {primaryGuide && primaryGuide.riskSignals.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">需要注意的行为倾向</p>
                      <ul className="space-y-2">
                        {primaryGuide.riskSignals.map((item, i) => (
                          <li key={i} className="text-sm leading-relaxed pl-4 relative before:content-['·'] before:absolute before:left-1 before:text-muted-foreground before:font-bold">
                            {renderMarkedText(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(() => {
                    const challenges = aiRisks || result.potentialChallenges
                    if (!challenges || challenges.length === 0) return null
                    return (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {aiRisks ? '深度风险分析' : '潜在挑战'}
                          {aiRisks && <>{' '}<AITag /></>}
                        </p>
                        <ul className="space-y-2">
                          {challenges.map((item, i) => (
                            <li key={i} className="text-sm leading-relaxed pl-4 relative before:content-['·'] before:absolute before:left-1 before:text-muted-foreground/60 before:font-bold">
                              {renderMarkedText(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })()}

                  <div className="border-b mt-6" />
                </>
              )
            })()}

            {/* ═══ 个人发展建议 ═══ */}
            {(() => {
              const aiDev = hasAI ? aiAnalysis.developmentPlan : undefined
              const templateDev = primaryGuide?.developmentAdvice
              const items = aiDev || templateDev
              if (!items || items.length === 0) return null
              return (
                <>
                  <SectionHeading number={nextSection()} title="个人发展建议" aiEnhanced={!!aiDev} />
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm leading-relaxed pt-0.5">{renderMarkedText(item)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-b mt-6" />
                </>
              )
            })()}

            {/* ═══ 岗位适配度（AI 生成） ═══ */}
            <>
              <SectionHeading number={nextSection()} title="岗位适配度" aiEnhanced={hasAI} />
              <DiscJobFitCard
                aiJobFitAnalysis={hasAI ? aiAnalysis?.jobFitAnalysis : undefined}
                hasAI={hasAI}
                jobFit={result.jobFit}
              />
              <div className="border-b mt-6" />
            </>

            {/* ═══ 团队协作建议（仅 AI） ═══ */}
            {hasAI && aiAnalysis.teamCollaboration && aiAnalysis.teamCollaboration !== '暂不可用' && (
              <>
                <SectionHeading number={nextSection()} title="团队协作建议" aiEnhanced />
                <div className="rounded-lg border p-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {renderMarkedText(aiAnalysis.teamCollaboration)}
                  </p>
                </div>
                <div className="border-b mt-6" />
              </>
            )}

            {/* ═══ K12 行业适配分析（仅 AI） ═══ */}
            {hasAI && aiAnalysis.industryInsights && aiAnalysis.industryInsights !== '暂不可用' && (
              <>
                <SectionHeading number={nextSection()} title="K12 行业适配分析" aiEnhanced />
                <div className="rounded-lg border p-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {renderMarkedText(aiAnalysis.industryInsights)}
                  </p>
                </div>
                <div className="border-b mt-6" />
              </>
            )}

            {/* ═══ 数据附录 ═══ */}
            <SectionHeading number={nextSection()} title="数据附录" />

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
                    <Tag
                      color={
                        resolvedConfidence.level === 'high' ? 'green'
                          : resolvedConfidence.level === 'medium' ? 'blue'
                            : 'grey'
                      }
                      type={resolvedConfidence.level === 'low' ? 'ghost' : 'light'}
                    >
                      {CONFIDENCE_LABEL[resolvedConfidence.level] || resolvedConfidence.level}
                    </Tag>
                    <span className="tabular-nums">
                      置信分 {resolvedConfidence.score}/100
                    </span>
                    <span className="text-xs text-muted-foreground">
                      主次分差 {resolvedConfidence.gap}
                    </span>
                  </div>
                  <SemiProgress
                    percent={resolvedConfidence.score}
                    showInfo={false}
                    style={{ height: 6 }}
                    aria-label="置信度"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {renderMarkedText(resolvedConfidence.reason)}
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
                    <Tag type="ghost">{resolvedMixedType.code}</Tag>
                    <Tag color="blue" type="light">{resolvedMixedType.tendencyLabel}</Tag>
                    <span className="text-xs text-muted-foreground">分差 {resolvedMixedType.gap}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{renderMarkedText(resolvedMixedType.description)}</p>
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
                {hasAI && aiAnalysis.analyzedAt && (
                  <>
                    <span className="text-muted-foreground">AI 分析时间</span>
                    <span>{formatTime(aiAnalysis.analyzedAt)}</span>
                  </>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            无数据
          </div>
        )}
      </div>
    </SideSheet>
  )
}
