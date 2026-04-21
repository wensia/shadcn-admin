/**
 * DISC 渠道公开结果查看页
 *
 * Design: Nature Distilled + Flat hybrid, mobile-first（与 disc-public-test 保持一致）
 * Palette: warm earth tones — dark #2c2c2a, cream #faf9f5, sand #e8e6dc, blue #0064FA
 *
 * 人事无需登录查看该渠道下的候选人 DISC 测试结果
 * 路由: /disc-results?token=TOKEN 或 /disc-results?channel=渠道名MD5
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Input } from '@douyinfe/semi-ui-19'
import { IconSearch } from '@douyinfe/semi-icons'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Eye, FileText, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getChannelDiscRecords, getChannelDiscRecordDetail } from '../api'
import { DISC_TYPE_CONFIG, type DISCDimension, type DISCResult } from '../types'
import {
  parseDiscReport,
  SectionProfile,
  SectionDimensions,
  SectionBehavior,
  SectionJobFit,
  SectionBestMatch,
  SectionAdvice,
  SectionTeam,
} from '../components/disc-report-sections'

/* ─── Palette（与 disc-public-test 完全一致） ─── */
const c = {
  dark: '#2c2c2a',
  text: '#3d3d3a',
  cream: '#faf9f5',
  sand: '#e8e6dc',
  muted: '#b0aea5',
  accent: '#0064FA',
  green: '#788c5d',
  red: '#c9554a',
} as const

/* ─── DISC 四维 Logo（与 disc-public-test 完全一致） ─── */
const DISC_BADGES = [
  { letter: 'D', bg: '#dc2626', label: '支配' },
  { letter: 'I', bg: '#6a9bcc', label: '影响' },
  { letter: 'S', bg: '#788c5d', label: '稳健' },
  { letter: 'C', bg: '#3d3d3a', label: '谨慎' },
] as const

function DiscLogo({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('flex justify-center', compact ? 'mb-4 gap-2' : 'mb-6 gap-3')}>
      {DISC_BADGES.map((b, i) => (
        <motion.div
          key={b.letter}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + i * 0.06, type: 'spring', stiffness: 320, damping: 22 }}
          className="flex flex-col items-center gap-1.5"
        >
          <div
            className={cn(
              'flex items-center justify-center rounded-[14px] font-bold text-white shadow-md',
              compact ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base',
            )}
            style={{ backgroundColor: b.bg }}
          >
            {b.letter}
          </div>
          <span className="text-[10px] font-medium" style={{ color: c.muted }}>
            {b.label}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── 类型定义 ─── */

interface RecordItem {
  id: string
  name: string
  phone: string
  submitted_at: string | null
  source_channel: string | null
  d_score?: number
  i_score?: number
  s_score?: number
  c_score?: number
  primary_type?: string
  primary_type_label?: string
  confidence_level?: string
  mixed_type_code?: string
  ai_analysis_status?: string
}

interface RecordDetail {
  id: string
  name: string
  phone: string
  result: DISCResult
  submitted_at: string | null
  source_channel: string | null
}

type Phase = 'loading' | 'invalid' | 'list' | 'detail'

/* ─── 主组件 ─── */

export function DiscChannelResults() {
  const search = useSearch({ from: '/disc-results' })
  const token = search.token ?? ''
  const channel = search.channel ?? ''

  const authParams = token
    ? { token }
    : { channel: channel || undefined }

  useDocumentTitle('DISC 测评结果')

  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [channelName, setChannelName] = useState('')

  const [records, setRecords] = useState<RecordItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [searchName, setSearchName] = useState('')
  const [listLoading, setListLoading] = useState(false)

  const [detail, setDetail] = useState<RecordDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchRecords = useCallback(async (p: number, name?: string) => {
    if (!token && !channel) return
    setListLoading(true)
    try {
      const res = await getChannelDiscRecords({
        ...authParams,
        page: p,
        size: 20,
        name: name || undefined,
      })
      if (res.success === false) {
        setErrorMsg(res.message || '加载失败')
        setPhase('invalid')
        return
      }
      setChannelName(res.data.channel_name)
      setRecords(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.total_pages)
      setPage(p)
      setPhase('list')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '网络错误，请稍后重试')
      setPhase('invalid')
    } finally {
      setListLoading(false)
    }
  }, [token, channel])

  useEffect(() => {
    if (!token && !channel) { setErrorMsg('缺少渠道链接参数'); setPhase('invalid'); return }
    fetchRecords(1)
  }, [token, channel, fetchRecords])

  const handleSearch = () => fetchRecords(1, searchName)

  const handleViewDetail = async (recordId: string) => {
    setDetailLoading(true)
    setPhase('detail')
    try {
      const res = await getChannelDiscRecordDetail({
        record_id: recordId,
        ...authParams,
      })
      if (res.success === false) {
        setDetail(null)
        setErrorMsg(res.message || '加载详情失败')
        setPhase('invalid')
        return
      }
      setDetail(res.data)
    } catch (err) {
      setDetail(null)
      setErrorMsg(err instanceof Error ? err.message : '加载详情失败')
      setPhase('invalid')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleBackToList = () => {
    setDetail(null)
    setPhase('list')
  }

  return (
    <div
      className="min-h-svh"
      style={{ background: `linear-gradient(170deg, ${c.cream} 0%, #f0ede6 55%, ${c.sand} 100%)` }}
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[80svh] flex-col items-center justify-center"
            >
              <DiscLogo />
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: c.accent }} />
              <p className="mt-4 text-sm" style={{ color: c.muted }}>正在加载...</p>
            </motion.div>
          )}

          {/* Invalid */}
          {phase === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[80svh] flex-col items-center justify-center text-center"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${c.red}14` }}>
                <AlertCircle className="h-8 w-8" style={{ color: c.red }} />
              </div>
              <h2 className="mb-2 text-xl font-bold" style={{ color: c.dark }}>无法访问</h2>
              <p className="text-sm" style={{ color: c.muted }}>
                {errorMsg || '该链接无效或渠道已关闭'}
              </p>
            </motion.div>
          )}

          {/* List */}
          {phase === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              {/* Header */}
              <motion.div
                className="mb-8 flex items-center gap-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* DISC Logo 横排紧凑 */}
                <div className="flex shrink-0 gap-1.5">
                  {DISC_BADGES.map((b) => (
                    <div
                      key={b.letter}
                      className="flex h-9 w-9 items-center justify-center rounded-[12px] text-sm font-bold text-white shadow-md"
                      style={{ backgroundColor: b.bg }}
                    >
                      {b.letter}
                    </div>
                  ))}
                </div>

                {/* 标题 */}
                <h1 className="min-w-0 text-xl font-bold" style={{ color: c.dark }}>
                  DISC 测评结果
                </h1>

                {/* 右侧标签（与左侧 DISC 圆标等高） */}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span
                    className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 text-xs font-medium"
                    style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: c.text }}
                  >
                    <Users className="h-3.5 w-3.5" style={{ color: c.muted }} />
                    {channelName}
                  </span>
                  <span
                    className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 text-xs font-medium"
                    style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: c.text }}
                  >
                    <FileText className="h-3.5 w-3.5" style={{ color: c.muted }} />
                    共 {total} 条
                  </span>
                </div>
              </motion.div>

              {/* Search */}
              <motion.div
                className="mb-5 flex gap-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <div
                  className="flex flex-1 items-center gap-2 rounded-2xl bg-white/70 px-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] backdrop-blur-sm"
                >
                  <IconSearch style={{ color: c.muted, fontSize: 16 }} />
                  <Input
                    placeholder="搜索姓名"
                    value={searchName}
                    onChange={setSearchName}
                    onEnterPress={handleSearch}
                    style={{ flex: 1, border: 'none', background: 'transparent' }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="shrink-0 cursor-pointer rounded-2xl px-5 py-2.5 text-sm font-medium text-white shadow-md transition-transform active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${c.accent}, #0050C8)` }}
                >
                  搜索
                </button>
              </motion.div>

              {/* Records */}
              {listLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: c.accent }} />
                </div>
              ) : records.length === 0 ? (
                <motion.div
                  className="rounded-2xl bg-white/60 px-6 py-20 text-center shadow-sm backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${c.sand}80` }}>
                    <FileText className="h-6 w-6" style={{ color: c.muted }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: c.muted }}>暂无测试记录</p>
                  <p className="mt-1 text-xs" style={{ color: c.muted }}>候选人完成测试后会显示在这里</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {records.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300, damping: 26 }}
                    >
                      <RecordCard record={r} onView={() => handleViewDetail(r.id)} />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  className="mt-8 flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <button
                    disabled={page <= 1}
                    onClick={() => fetchRecords(page - 1, searchName)}
                    className={cn(
                      'flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                      page <= 1 ? 'opacity-30' : 'cursor-pointer bg-white/60 shadow-sm hover:bg-white/80 active:scale-95',
                    )}
                    style={{ color: c.text }}
                  >
                    <ChevronLeft className="h-4 w-4" /> 上一页
                  </button>
                  <div
                    className="flex items-center rounded-xl px-4 py-2 text-sm font-semibold tabular-nums"
                    style={{ color: c.accent, backgroundColor: `${c.accent}0a` }}
                  >
                    {page} / {totalPages}
                  </div>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => fetchRecords(page + 1, searchName)}
                    className={cn(
                      'flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                      page >= totalPages ? 'opacity-30' : 'cursor-pointer bg-white/60 shadow-sm hover:bg-white/80 active:scale-95',
                    )}
                    style={{ color: c.text }}
                  >
                    下一页 <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Detail */}
          {phase === 'detail' && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <button
                onClick={handleBackToList}
                className="mb-5 flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/60 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 active:scale-95"
                style={{ color: c.accent }}
              >
                <ChevronLeft className="h-4 w-4" /> 返回列表
              </button>

              {detailLoading ? (
                <div className="flex min-h-[60svh] items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: c.accent }} />
                    <p className="text-sm" style={{ color: c.muted }}>加载报告中...</p>
                  </div>
                </div>
              ) : detail ? (
                <DetailView detail={detail} />
              ) : (
                <div className="rounded-2xl bg-white/60 px-6 py-20 text-center shadow-sm backdrop-blur-sm">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8" style={{ color: c.muted }} />
                  <p className="text-sm" style={{ color: c.muted }}>加载失败，请返回重试</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── 记录卡片 ─── */

function RecordCard({ record, onView }: { record: RecordItem; onView: () => void }) {
  const dim = record.primary_type as DISCDimension | undefined
  const config = dim ? DISC_TYPE_CONFIG[dim] : null

  return (
    <div
      onClick={onView}
      className="group flex cursor-pointer items-center gap-4 rounded-2xl bg-white/70 px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all hover:bg-white/90 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-[0.99]"
    >
      {/* 类型标识 */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] text-lg font-bold text-white shadow-md"
        style={{ backgroundColor: config?.color ?? c.muted }}
      >
        {dim ?? '?'}
      </div>

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold" style={{ color: c.dark }}>
            {record.name}
          </span>
          {config && (
            <span
              className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: config.bgColor, color: config.color }}
            >
              {config.label}
            </span>
          )}
          {record.mixed_type_code && (
            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-600">
              复合 {record.mixed_type_code}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: c.muted }}>
          <span>{record.phone}</span>
          {record.submitted_at && (
            <span>{new Date(record.submitted_at).toLocaleDateString('zh-CN')}</span>
          )}
          {record.ai_analysis_status === 'completed' && (
            <span className="inline-flex items-center gap-0.5 text-emerald-500">
              <span className="text-[10px]">✦</span> AI
            </span>
          )}
        </div>
        {/* DISC 分数条 */}
        {record.d_score != null && (
          <div className="mt-2 flex gap-2.5">
            {(['D', 'I', 'S', 'C'] as const).map((d) => {
              const score = record[`${d.toLowerCase()}_score` as keyof RecordItem] as number | undefined
              const cfg = DISC_TYPE_CONFIG[d]
              return (
                <div key={d} className="flex items-center gap-1 text-[11px]">
                  <span className="font-bold" style={{ color: cfg.color }}>{d}</span>
                  <div className="h-[5px] w-10 overflow-hidden rounded-full" style={{ backgroundColor: `${cfg.color}18` }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((score ?? 0) / 28) * 100)}%`,
                        backgroundColor: cfg.color,
                      }}
                    />
                  </div>
                  <span className="tabular-nums" style={{ color: c.muted }}>{score ?? 0}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 箭头 */}
      <div className="flex shrink-0 items-center transition-transform group-hover:translate-x-0.5">
        <Eye className="h-4 w-4" style={{ color: c.muted }} />
      </div>
    </div>
  )
}

/* ─── 详情视图 ─── */

function DetailView({ detail }: { detail: RecordDetail }) {
  const result = detail.result ?? {} as DISCResult
  const scores = result.scores ?? {} as Record<DISCDimension, number>
  const primaryType = result.primaryType
  const secondaryType = result.secondaryType
  const confidence = result.confidence
  const mixedType = result.mixedType
  const characteristics = result.characteristics
  const aiAnalysis = result.aiAnalysis

  const dim = primaryType?.code as DISCDimension | undefined
  const config = dim ? DISC_TYPE_CONFIG[dim] : null

  const isCraftMd = aiAnalysis?.status === 'completed'
    && aiAnalysis?.format === 'craft-md'
    && typeof aiAnalysis?.content === 'string'
    && aiAnalysis.content.length > 0

  const parsedReport = useMemo(() => {
    if (!isCraftMd || !aiAnalysis?.content) return null
    return parseDiscReport(aiAnalysis.content)
  }, [isCraftMd, aiAnalysis?.content])

  return (
    <div className="space-y-4">
      {/* Hero 卡片 */}
      <motion.div
        className="overflow-hidden rounded-2xl bg-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* 顶部色带 */}
        <div className="h-1.5" style={{ background: config ? `linear-gradient(90deg, ${config.color}, ${config.color}88)` : c.sand }} />

        <div className="p-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg"
              style={{ backgroundColor: config?.color ?? c.muted }}
            >
              {dim ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold" style={{ color: c.dark }}>{detail.name}</h2>
              <p className="mt-0.5 text-sm" style={{ color: c.muted }}>
                {detail.phone}
                {detail.submitted_at && ` · ${new Date(detail.submitted_at).toLocaleString('zh-CN')}`}
              </p>
            </div>
          </div>

          {primaryType && (
            <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: config ? `${config.color}08` : '#f5f5f5' }}>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold" style={{ color: config?.color }}>
                  {primaryType.code} - {config?.label ?? primaryType.label}
                </span>
                {secondaryType && (
                  <span className="text-sm" style={{ color: c.muted }}>
                    / 副型 {secondaryType.code} - {DISC_TYPE_CONFIG[secondaryType.code as DISCDimension]?.label ?? secondaryType.label}
                  </span>
                )}
              </div>
              {primaryType.description && (
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: c.text }}>
                  {primaryType.description}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* DISC 维度得分 */}
      <motion.div
        className="rounded-2xl bg-white/80 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] backdrop-blur-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h3 className="mb-4 text-sm font-semibold" style={{ color: c.dark }}>DISC 维度得分</h3>
        <div className="space-y-3">
          {(['D', 'I', 'S', 'C'] as const).map((d) => {
            const score = scores[d] ?? 0
            const cfg = DISC_TYPE_CONFIG[d]
            return (
              <div key={d} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: cfg.color }}
                >
                  {d}
                </div>
                <span className="w-12 text-sm font-medium" style={{ color: c.text }}>{cfg.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: `${cfg.color}14` }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: cfg.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (score / 28) * 100)}%` }}
                    transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-bold tabular-nums" style={{ color: cfg.color }}>
                  {score}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* 置信度 & 复合类型 */}
      {(confidence || mixedType) && (
        <motion.div
          className="rounded-2xl bg-white/80 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] backdrop-blur-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {confidence && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium" style={{ color: c.dark }}>置信度</span>
              <span className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold',
                confidence.level === 'high' ? 'bg-emerald-50 text-emerald-600' :
                confidence.level === 'medium' ? 'bg-blue-50 text-blue-600' :
                'bg-gray-100 text-gray-500'
              )}>
                {confidence.level === 'high' ? '高' : confidence.level === 'medium' ? '中' : '低'}
                {confidence.score != null && ` · ${confidence.score}分`}
              </span>
              {confidence.reason && (
                <p className="mt-1 w-full text-xs leading-relaxed" style={{ color: c.muted }}>{confidence.reason}</p>
              )}
            </div>
          )}
          {mixedType && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium" style={{ color: c.dark }}>复合倾向</span>
              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                {mixedType.code} {mixedType.label}
              </span>
              {mixedType.tendencyLabel && (
                <span className="text-xs" style={{ color: c.muted }}>({mixedType.tendencyLabel})</span>
              )}
              {mixedType.description && (
                <p className="mt-1 w-full text-xs leading-relaxed" style={{ color: c.muted }}>{mixedType.description}</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* 性格特质 */}
      {characteristics && (characteristics.primary?.length || characteristics.secondary?.length) ? (
        <motion.div
          className="rounded-2xl bg-white/80 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] backdrop-blur-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: c.dark }}>性格特质</h3>
          {characteristics.primary?.length ? (
            <div className="mb-3">
              <span className="text-xs font-medium" style={{ color: c.muted }}>主要特质</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {characteristics.primary.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-sm"
                    style={{ color: c.text, border: `1px solid ${c.sand}` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {characteristics.secondary?.length ? (
            <div>
              <span className="text-xs font-medium" style={{ color: c.muted }}>辅助特质</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {characteristics.secondary.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{ color: c.muted, backgroundColor: `${c.sand}60`, border: `1px solid ${c.sand}` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </motion.div>
      ) : null}

      {/* AI 深度分析（使用专业 Section 组件） */}
      {aiAnalysis?.status === 'completed' && (
        <motion.div
          className="overflow-hidden rounded-2xl bg-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.04)] backdrop-blur-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* AI 标题栏 */}
          <div className="flex items-center gap-2 border-b px-6 py-4" style={{ borderColor: c.sand }}>
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
            >
              ✦
            </span>
            <h3 className="text-sm font-semibold" style={{ color: c.dark }}>AI 深度分析</h3>
          </div>

          <div className="p-6" style={{ fontSize: 14 }}>
            {parsedReport ? (
              <>
                <SectionProfile profile={parsedReport.profile} />
                <SectionDimensions dimensions={parsedReport.dimensions} scores={scores as Record<DISCDimension, number>} />
                <SectionBehavior
                  behaviorTable={parsedReport.behaviorTable}
                  behaviorInsight={parsedReport.behaviorInsight}
                />
                <SectionJobFit jobFitTable={parsedReport.jobFitTable} />
                <SectionBestMatch bestMatchAnalysis={parsedReport.bestMatchAnalysis} />
                <SectionAdvice
                  communicationStrategies={parsedReport.communicationStrategies}
                  riskConcerns={parsedReport.riskConcerns}
                  developmentDirections={parsedReport.developmentDirections}
                />
                <SectionTeam teamAdvice={parsedReport.teamAdvice} />
              </>
            ) : aiAnalysis.personalityProfile ? (
              <p className="text-sm leading-relaxed" style={{ color: c.text }}>
                {aiAnalysis.personalityProfile}
              </p>
            ) : null}
          </div>
        </motion.div>
      )}
    </div>
  )
}
