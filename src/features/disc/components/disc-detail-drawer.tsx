/**
 * DISC 测评报告抽屉
 *
 * AI 分析返回 craft-md Markdown，前端解析为结构化数据后用 Semi 组件渲染。
 * 旧版 JSON 格式和未分析状态有降级展示。
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { toBlob, toPng } from 'html-to-image'
import { Copy, Download, Image, Loader2, Sparkles, Map, History } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SideSheet, Dropdown, Skeleton, Tag, Button as SemiButton, Tabs, TabPane, Typography } from '@douyinfe/semi-ui-19'
import {
  DISC_TYPE_CONFIG,
  type DISCDimension,
  type TempDISCRecordDetail,
  type DISCAIAnalysis,
} from '../types'
import { triggerDiscAIAnalysis } from '../api'
import { DiscRawDataSection } from './disc-raw-data-section'
import {
  parseDiscReport,
  type ParsedDiscReport,
  SectionProfile,
  SectionDimensions,
  SectionBehavior,
  SectionJobFit,
  SectionBestMatch,
  SectionAdvice,
  SectionTeam,
} from './disc-report-sections'

// ─── 类型 ────────────────────────────────────────────────

interface DiscDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: TempDISCRecordDetail | null
  loading: boolean
  onDetailUpdate?: (updated: TempDISCRecordDetail) => void
  onReanalyzeStart?: (payload: { recordId: string; previousAnalyzedAt?: string | null }) => void
}

// ─── 辅助函数 ────────────────────────────────────────────

function formatTime(time: string) {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

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

// ─── 主组件 ──────────────────────────────────────────────

export function DiscDetailDrawer({ open, onOpenChange, detail, loading, onDetailUpdate, onReanalyzeStart }: DiscDetailDrawerProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('1')
  const analyzingRef = useRef(false) // 防重复点击（闭包安全）

  // AI 分析结果：从 detail.result.aiAnalysis 读取（通过 query 缓存 + 轮询自动更新）
  const cachedAI = detail?.result?.aiAnalysis
  const hasAI = cachedAI?.status === 'completed'
  const isCraftMd = hasAI && cachedAI?.format === 'craft-md' && typeof cachedAI?.content === 'string' && cachedAI.content.length > 0
  const isAnalyzing = cachedAI?.status === 'processing' || cachedAI?.status === 'pending' || analyzing

  // 解析 AI 报告 Markdown 为结构化数据
  const parsedReport = useMemo(() => {
    if (!isCraftMd || !cachedAI?.content) return null
    return parseDiscReport(cachedAI.content)
  }, [isCraftMd, cachedAI?.content])

  // 切换记录时重置状态
  useEffect(() => {
    analyzingRef.current = false
    setAnalyzing(false)
    setActiveTab('1')
  }, [detail?.id])

  // AI 报告完成时自动切回深度洞察页（仅在 hasAI 变为 true 时触发）
  useEffect(() => {
    if (hasAI) {
      setActiveTab('1')
    }
  }, [hasAI, detail?.id])

  const handleAIAnalyze = useCallback(async () => {
    if (!detail?.id || analyzingRef.current) return

    analyzingRef.current = true
    const prevAI = cachedAI // 保存当前状态，出错时回滚
    if (hasAI) {
      onReanalyzeStart?.({
        recordId: detail.id,
        previousAnalyzedAt: cachedAI?.analyzedAt ?? null,
      })
    }
    setAnalyzing(true)

    // 立即乐观更新：抽屉显示"分析中"，列表也同步刷新
    onDetailUpdate?.({
      ...detail,
      result: { ...detail.result, aiAnalysis: { status: 'processing' } as DISCAIAnalysis },
    })

    try {
      const resp = await triggerDiscAIAnalysis(detail.id, hasAI)
      if (resp.success && resp.data) {
        const status = resp.data.status
        if (status === 'processing') {
          toast.success('AI 分析任务已提交，请稍候')
        } else if (status === 'completed' && resp.data.aiAnalysis) {
          const ai = resp.data.aiAnalysis as DISCAIAnalysis
          onDetailUpdate?.({
            ...detail,
            result: { ...detail.result, aiAnalysis: ai },
          })
          toast.success('AI 分析完成')
        } else {
          rollback()
          toast.error(resp.message || 'AI 分析失败')
        }
      } else {
        rollback()
        toast.error(resp.message || 'AI 分析失败')
      }
    } catch {
      rollback()
      toast.error('AI 分析请求失败，请稍后重试')
    } finally {
      analyzingRef.current = false
      setAnalyzing(false)
    }

    function rollback() {
      if (detail) {
        onDetailUpdate?.({ ...detail, result: { ...detail.result, aiAnalysis: prevAI } })
      }
    }
  }, [detail, hasAI, cachedAI, onDetailUpdate, onReanalyzeStart])

  if (!open) return null

  const result = detail?.result
  const filename = `DISC报告_${detail?.name || '未知'}_${new Date().toISOString().slice(0, 10)}.png`

  // 置信度颜色 / 标签（提取避免 JSX 内三元嵌套）
  const confidenceColor = result?.confidence?.level === 'high' ? 'green'
    : result?.confidence?.level === 'medium' ? 'blue' : 'grey'
  const confidenceLabel = result?.confidence?.level === 'high' ? '高'
    : result?.confidence?.level === 'medium' ? '中' : '低'

  async function handleDownload() {
    if (!bodyRef.current) return
    setExporting(true)
    try {
      const url = await captureFullContent(bodyRef.current, (el) =>
        toPng(el, { backgroundColor: '#f8fafc', pixelRatio: 2 }),
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
        toBlob(el, { backgroundColor: '#f8fafc', pixelRatio: 2 }),
      )
      if (!blob) throw new Error('生成图片失败')

      if (navigator.clipboard?.write && window.isSecureContext) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        toast.success('已复制到剪贴板')
      } else {
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>DISC 测评报告</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 上次分析时间 */}
            {hasAI && cachedAI?.analyzedAt && (
              <Typography.Text type="tertiary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <History className="w-3 h-3" />
                {formatTime(cachedAI.analyzedAt)}
              </Typography.Text>
            )}
            {/* AI 分析按钮 */}
            {result && (
              isAnalyzing ? (
                <SemiButton
                  theme="light"
                  size="small"
                  disabled
                  loading
                  style={{ fontSize: 12 }}
                >
                  分析中...
                </SemiButton>
              ) : hasAI || cachedAI?.status === 'failed' ? (
                <SemiButton
                  theme="light"
                  size="small"
                  onClick={handleAIAnalyze}
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  style={{ fontSize: 12 }}
                >
                  重新分析
                </SemiButton>
              ) : (
                <SemiButton
                  theme="solid"
                  size="small"
                  onClick={handleAIAnalyze}
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  style={{ fontSize: 12 }}
                >
                  AI 分析
                </SemiButton>
              )
            )}
            {/* 导出 */}
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
                    复制报告
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={<Download className="h-3.5 w-3.5" />}
                    onClick={handleDownload}
                    disabled={exporting || !result}
                  >
                    下载图片
                  </Dropdown.Item>
                </Dropdown.Menu>
              }
            >
              <span style={{ display: 'inline-flex' }}>
                <SemiButton
                  theme="borderless"
                  type="tertiary"
                  size="small"
                  disabled={copying || exporting || !result}
                  loading={copying || exporting}
                  icon={!(copying || exporting) ? <Image className="h-3.5 w-3.5" /> : undefined}
                  style={{ fontSize: 12 }}
                >
                  {copying ? '复制中' : exporting ? '导出中' : '导出'}
                </SemiButton>
              </span>
            </Dropdown>
          </div>
        </div>
      }
      headerStyle={{ padding: '12px 24px', borderBottom: 'none' }}
      bodyStyle={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--semi-color-bg-0)' }}
      closable={true}
    >
      {/* ─── Body ─── */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto w-full bg-slate-50/50" style={{ height: 'calc(100vh - 60px)' }}>
        {loading ? (
          <LoadingSkeleton />
        ) : detail && result ? (
          <div className="flex flex-col min-h-full">
            {/* Hero 卡片：姓名 + DISC 类型 + 元信息 */}
            <div style={{
              padding: '14px 24px',
              borderBottom: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-bg-0)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}>
              {/* 第一行：姓名 + DISC 类型 Tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Typography.Title heading={5} style={{ margin: 0, fontSize: 15 }}>
                  {detail.name}
                </Typography.Title>
                {result.primaryType && (
                  <Tag size="small" style={{
                    backgroundColor: DISC_TYPE_CONFIG[result.primaryType.code]?.bgColor,
                    color: DISC_TYPE_CONFIG[result.primaryType.code]?.color,
                    borderColor: DISC_TYPE_CONFIG[result.primaryType.code]?.color,
                    borderWidth: 1,
                    borderStyle: 'solid',
                  }}>
                    {result.primaryType.code} - {DISC_TYPE_CONFIG[result.primaryType.code]?.label}
                  </Tag>
                )}
              </div>

              {/* 第二行：手机 · 时间 · 置信度 */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <Typography.Text type="tertiary" style={{ fontSize: 12 }}>
                  {detail.phone || '未留手机'}
                </Typography.Text>
                <Typography.Text type="quaternary" style={{ fontSize: 12 }}>·</Typography.Text>
                <Typography.Text type="tertiary" style={{ fontSize: 12 }}>
                  {formatTime(detail.submitted_at)}
                </Typography.Text>
                {result.confidence && (
                  <>
                    <Typography.Text type="quaternary" style={{ fontSize: 12 }}>·</Typography.Text>
                    <Tag size="small" color={confidenceColor} type="light" style={{ fontSize: 11 }}>
                      置信度 {result.confidence.score} ({confidenceLabel})
                    </Tag>
                  </>
                )}
              </div>
            </div>

            {/* Tabs 切换页面 */}
            <div className="flex-1 px-6 pt-4 pb-12">
              <Tabs
                type="line"
                activeKey={activeTab}
                onChange={setActiveTab}
                tabBarStyle={{ marginBottom: 16 }}
                className="disc-tabs-wrapper"
              >
                {/* 选项卡 1：深度解读（默认展示） */}
                <TabPane
                  tab={<span className="font-medium text-[14px]">深度洞察</span>}
                  itemKey="1"
                >
                  {isAnalyzing ? (
                    <AnalyzingState />
                  ) : parsedReport ? (
                    <DiscReportContent report={parsedReport} scores={result.scores} />
                  ) : hasAI && !isCraftMd ? (
                    <LegacyFormatPrompt
                      analyzing={analyzing}
                      onReanalyze={handleAIAnalyze}
                    />
                  ) : (
                    <NoAnalysisState
                      analyzing={analyzing}
                      onTriggerAI={handleAIAnalyze}
                    />
                  )}
                </TabPane>

                {/* 选项卡 2：原始数据明细 */}
                <TabPane
                  tab={<span className="font-medium text-[14px]">测评数据</span>}
                  itemKey="2"
                >
                  <DiscRawDataSection result={result} />
                </TabPane>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Map className="w-10 h-10 opacity-20" />
              <p className="text-sm">无法加载测评数据</p>
            </div>
          </div>
        )}
      </div>
    </SideSheet>
  )
}

// ─── AI 报告渲染组件 ─────────────────────────────────────

function DiscReportContent({ report, scores }: { report: ParsedDiscReport; scores?: Record<DISCDimension, number> }) {
  return (
    <div style={{ fontSize: 14 }}>
      <SectionProfile profile={report.profile} />
      <SectionDimensions dimensions={report.dimensions} scores={scores} />
      <SectionBehavior
        behaviorTable={report.behaviorTable}
        behaviorInsight={report.behaviorInsight}
      />
      <SectionJobFit jobFitTable={report.jobFitTable} />
      <SectionBestMatch bestMatchAnalysis={report.bestMatchAnalysis} />
      <SectionAdvice
        communicationStrategies={report.communicationStrategies}
        riskConcerns={report.riskConcerns}
        developmentDirections={report.developmentDirections}
      />
      <SectionTeam teamAdvice={report.teamAdvice} />
    </div>
  )
}

// ─── 子组件 ──────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <Skeleton loading active>
      <div className="px-6 py-8">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b">
          <Skeleton.Avatar style={{ width: 56, height: 56, borderRadius: '50%' }} />
          <div>
            <Skeleton.Title style={{ width: 120, height: 24, marginBottom: 8 }} />
            <Skeleton.Paragraph rows={1} style={{ width: 200, height: 16 }} />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton.Title style={{ width: 180, height: 20 }} />
          <Skeleton.Paragraph rows={6} style={{ width: '100%' }} />
          <div className="mt-8">
            <Skeleton.Title style={{ width: 140, height: 20, marginBottom: 12 }} />
            <Skeleton.Paragraph rows={4} style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </Skeleton>
  )
}

function AnalyzingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 h-full min-h-[300px]">
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
        <div className="w-16 h-16 rounded-full bg-white border shadow-sm flex items-center justify-center relative z-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-slate-800">神经脉络解析中</p>
        <p className="text-[13px] text-slate-500 mt-2 max-w-[280px] leading-relaxed">
          AI 正在对该参与者的四维数据进行深度模型推演，即将为您展现实时性格洞见结构图。
        </p>
      </div>
    </div>
  )
}

function LegacyFormatPrompt({
  analyzing,
  onReanalyze,
}: {
  analyzing: boolean
  onReanalyze: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5 h-full min-h-[300px]">
      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
        <Sparkles className="h-7 w-7 text-amber-500" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-base font-semibold text-slate-800 mb-2">
          发现旧版本数据
        </p>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          当前查看的是系统更早之前生成的降级数据格式。您可以让 AI 根据最新的 2.0 解析引擎重新生成更详尽、带有业务洞察的富文本报告。
        </p>
        <SemiButton
          theme="solid"
          size="default"
          onClick={onReanalyze}
          disabled={analyzing}
          loading={analyzing}
          icon={!analyzing ? <Sparkles className="h-4 w-4" /> : undefined}
          className="px-6"
        >
          {analyzing ? '转化中...' : '使用新引擎深度扫描'}
        </SemiButton>
      </div>
    </div>
  )
}

function NoAnalysisState({
  analyzing,
  onTriggerAI,
}: {
  analyzing: boolean
  onTriggerAI: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 h-full min-h-[300px]">
      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
        <Sparkles className="h-7 w-7 text-primary/60" />
      </div>
      <div className="text-center max-w-[320px]">
        <h3 className="text-base font-semibold text-slate-800 mb-2">报告尚未解析</h3>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          我们收集到了完整的性格画像雷达。点击解析按钮，立刻让大语言模型输出精细的特征解析报告。
        </p>
        <SemiButton
          theme="solid"
          type="primary"
          onClick={onTriggerAI}
          disabled={analyzing}
          loading={analyzing}
          icon={!analyzing ? <Sparkles className="h-4 w-4" /> : undefined}
          style={{ width: 140 }}
        >
          {analyzing ? '解析中...' : '开始解析报告'}
        </SemiButton>
      </div>
    </div>
  )
}
