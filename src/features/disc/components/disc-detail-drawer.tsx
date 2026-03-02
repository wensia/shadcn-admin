/**
 * DISC 测评报告抽屉
 * AI 分析返回 Markdown 格式，用 DiscReportMarkdown 精简组件渲染
 * 旧版 JSON 格式和未分析状态有降级展示
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { toBlob, toPng } from 'html-to-image'
import { Copy, Download, Image, Loader2, Sparkles } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SideSheet, Dropdown, Skeleton, Tag, Button as SemiButton } from '@douyinfe/semi-ui-19'
import { DiscReportMarkdown } from './disc-report-markdown'
import {
  DISC_TYPE_CONFIG,
  type TempDISCRecordDetail,
  type DISCDimension,
  type DISCAIAnalysis,
} from '../types'
import { triggerDiscAIAnalysis } from '../api'

// ─── 类型 ────────────────────────────────────────────────

interface DiscDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: TempDISCRecordDetail | null
  loading: boolean
  onDetailUpdate?: (updated: TempDISCRecordDetail) => void
}

const DIMENSIONS: DISCDimension[] = ['D', 'I', 'S', 'C']

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

export function DiscDetailDrawer({ open, onOpenChange, detail, loading, onDetailUpdate }: DiscDetailDrawerProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const analyzingRef = useRef(false) // 防重复点击（闭包安全）

  // AI 分析结果：从 detail.result.aiAnalysis 读取（通过 query 缓存 + 轮询自动更新）
  const cachedAI = detail?.result?.aiAnalysis
  const hasAI = cachedAI?.status === 'completed'
  const isCraftMd = hasAI && cachedAI?.format === 'craft-md' && typeof cachedAI?.content === 'string' && cachedAI.content.length > 0
  const isAnalyzing = cachedAI?.status === 'processing' || cachedAI?.status === 'pending' || analyzing

  // 切换记录时重置 analyzing 状态
  useEffect(() => {
    analyzingRef.current = false
    setAnalyzing(false)
  }, [detail?.id])

  // 一旦缓存 AI 状态反映了最新情况，清除本地 analyzing 标志
  useEffect(() => {
    if (analyzing && cachedAI?.status) {
      analyzingRef.current = false
      setAnalyzing(false)
    }
  }, [analyzing, cachedAI?.status])

  const handleAIAnalyze = useCallback(async () => {
    if (!detail?.id || analyzingRef.current) return

    analyzingRef.current = true
    const prevAI = cachedAI // 保存当前状态，出错时回滚
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
          analyzingRef.current = false
          setAnalyzing(false)
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
    }

    function rollback() {
      analyzingRef.current = false
      setAnalyzing(false)
      if (detail) {
        // 恢复到操作前的状态
        onDetailUpdate?.({ ...detail, result: { ...detail.result, aiAnalysis: prevAI } })
      }
    }
  }, [detail, hasAI, cachedAI, onDetailUpdate])

  if (!open) return null

  const result = detail?.result
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
              ) : isAnalyzing ? (
                <Tag type="ghost" style={{ fontSize: 12, height: 28, gap: 4 }} className="animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI 分析中...
                </Tag>
              ) : cachedAI?.status === 'failed' ? (
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
          <LoadingSkeleton />
        ) : isAnalyzing ? (
          <AnalyzingState />
        ) : isCraftMd ? (
          <div className="px-6 py-6 text-[14px]">
            <DiscReportMarkdown>
              {cachedAI?.content ?? ''}
            </DiscReportMarkdown>
          </div>
        ) : hasAI && !isCraftMd ? (
          <LegacyFormatPrompt
            name={detail?.name}
            analyzing={analyzing}
            onReanalyze={handleAIAnalyze}
          />
        ) : detail && result ? (
          <NoAnalysisState
            detail={detail}
            result={result}
            analyzing={analyzing}
            onTriggerAI={handleAIAnalyze}
          />
        ) : (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            无数据
          </div>
        )}
      </div>
    </SideSheet>
  )
}

// ─── 子组件 ──────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <Skeleton loading active>
      <div className="px-8 pb-12">
        <div className="pt-4 pb-4 border-b">
          <div className="flex items-baseline gap-3 mb-1.5">
            <Skeleton.Title style={{ width: 80, height: 24 }} />
            <Skeleton.Paragraph rows={1} style={{ width: 200, height: 14 }} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Skeleton.Paragraph rows={1} style={{ width: 100, height: 28 }} />
            <Skeleton.Paragraph rows={1} style={{ width: 80, height: 28 }} />
          </div>
        </div>
        <div className="pt-6 pb-4">
          <Skeleton.Title style={{ width: 120, height: 18, marginBottom: 16 }} />
          <Skeleton.Paragraph rows={4} style={{ width: '100%' }} />
        </div>
        <div className="pt-4 pb-4 border-t">
          <Skeleton.Title style={{ width: 140, height: 18, marginBottom: 12 }} />
          <Skeleton.Paragraph rows={3} style={{ width: '100%' }} />
        </div>
      </div>
    </Skeleton>
  )
}

function AnalyzingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-sm font-medium">AI 正在分析中...</p>
        <p className="text-xs text-muted-foreground mt-1">
          正在生成完整的 DISC 测评报告，请稍候
        </p>
      </div>
    </div>
  )
}

function LegacyFormatPrompt({
  name,
  analyzing,
  onReanalyze,
}: {
  name?: string
  analyzing: boolean
  onReanalyze: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5">
      <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
        <Sparkles className="h-6 w-6 text-amber-500" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-medium mb-1">
          {name ? `${name} 的报告` : '此报告'}使用旧版格式生成
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          点击下方按钮重新分析，将生成全新的富文本报告，包含图表、数据表格等可视化内容
        </p>
      </div>
      <SemiButton
        theme="solid"
        size="default"
        onClick={onReanalyze}
        disabled={analyzing}
        loading={analyzing}
        icon={!analyzing ? <Sparkles className="h-4 w-4" /> : undefined}
      >
        {analyzing ? '分析中...' : '重新生成报告'}
      </SemiButton>
    </div>
  )
}

function NoAnalysisState({
  detail,
  result,
  analyzing,
  onTriggerAI,
}: {
  detail: TempDISCRecordDetail
  result: NonNullable<TempDISCRecordDetail['result']>
  analyzing: boolean
  onTriggerAI: () => void
}) {
  return (
    <div className="px-8 pb-12">
      {/* 提示卡片 */}
      <div className="flex flex-col items-center justify-center py-16 gap-5 border-b">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-sm font-medium mb-1">尚未进行 AI 分析</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            点击右上角 "AI 分析" 按钮或下方按钮，AI 将生成包含图表、深度洞察的完整报告
          </p>
        </div>
        <SemiButton
          theme="solid"
          size="default"
          onClick={onTriggerAI}
          disabled={analyzing}
          loading={analyzing}
          icon={!analyzing ? <Sparkles className="h-4 w-4" /> : undefined}
        >
          {analyzing ? '分析中...' : '开始 AI 分析'}
        </SemiButton>
      </div>

      {/* 原始数据附录 */}
      <div className="pt-6">
        <h3 className="text-sm font-semibold mb-4">原始数据</h3>

        {/* 候选人信息 */}
        <div className="mb-5 text-sm">
          <span className="font-medium">{detail.name}</span>
          <span className="text-muted-foreground ml-2">{detail.phone || ''}</span>
          <span className="text-muted-foreground ml-2">{formatTime(detail.submitted_at)}</span>
        </div>

        {/* 四维分数 */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted-foreground mb-2">四维百分位分数</p>
          <div className="rounded-lg border overflow-hidden text-sm">
            <div className="grid grid-cols-4 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
              {DIMENSIONS.map((dim) => (
                <span key={dim} className="text-center">{dim} - {DISC_TYPE_CONFIG[dim].label}</span>
              ))}
            </div>
            <div className="grid grid-cols-4 px-4 py-3 border-t">
              {DIMENSIONS.map((dim) => (
                <span key={dim} className="text-center tabular-nums font-medium">
                  {Math.round(result.scores?.[dim] ?? 0)}%
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 主要类型 */}
        {result.primaryType && (
          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground mb-2">判定类型</p>
            <div className="flex items-center gap-2">
              <Tag
                size="large"
                style={{
                  backgroundColor: DISC_TYPE_CONFIG[result.primaryType.code]?.bgColor,
                  color: DISC_TYPE_CONFIG[result.primaryType.code]?.color,
                  borderColor: DISC_TYPE_CONFIG[result.primaryType.code]?.color,
                }}
              >
                {result.primaryType.code} - {DISC_TYPE_CONFIG[result.primaryType.code]?.label}
              </Tag>
              {result.secondaryType && (
                <>
                  <span className="text-muted-foreground/40">/</span>
                  <Tag
                    style={{
                      backgroundColor: DISC_TYPE_CONFIG[result.secondaryType.code]?.bgColor,
                      color: DISC_TYPE_CONFIG[result.secondaryType.code]?.color,
                      borderColor: DISC_TYPE_CONFIG[result.secondaryType.code]?.color,
                    }}
                  >
                    {result.secondaryType.code} - {DISC_TYPE_CONFIG[result.secondaryType.code]?.label}
                  </Tag>
                </>
              )}
            </div>
          </div>
        )}

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

        {/* 置信度 */}
        {result.confidence && (
          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground mb-2">判定置信度</p>
            <div className="rounded-lg border p-4 text-sm">
              <div className="flex items-center gap-3">
                <Tag
                  color={
                    result.confidence.level === 'high' ? 'green'
                      : result.confidence.level === 'medium' ? 'blue'
                        : 'grey'
                  }
                  type={result.confidence.level === 'low' ? 'ghost' : 'light'}
                >
                  {result.confidence.level === 'high' ? '高置信' : result.confidence.level === 'medium' ? '中置信' : '低置信'}
                </Tag>
                <span className="tabular-nums">
                  {result.confidence.score}/100
                </span>
                <span className="text-xs text-muted-foreground">
                  主次分差 {result.confidence.gap}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                {result.confidence.reason}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
