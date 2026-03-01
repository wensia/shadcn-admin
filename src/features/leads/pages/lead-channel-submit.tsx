/**
 * 渠道线索提交公开页 — 单条表单录入
 *
 * Design: Corporate Precision — clean, minimal, enterprise-grade
 * Palette: slate neutrals + single blue accent
 * Touch target ≥ 44 px, focus-visible, prefers-reduced-motion
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ChevronDown,
  Check,
  BarChart3,
  FileText,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SourceChannelExtraField } from '@/features/crm/leads/types'
import {
  validateChannelToken,
  submitSingleLead,
  fetchChannelStats,
  type SingleLeadResponse,
  type ValidateTokenResponse,
  type ChannelStatsResponse,
} from '../api/channel-submit'

/* ─── Phase ─── */
type Phase = 'loading' | 'invalid' | 'form' | 'submitting' | 'result'

/* ─── Palette — corporate slate + blue accent ─── */
const c = {
  bg: '#f7f8fa',
  card: '#ffffff',
  text: '#18181b',
  sub: '#52525b',
  muted: '#a1a1aa',
  border: '#e4e4e7',
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  success: '#16a34a',
  successBg: '#f0fdf4',
  warn: '#d97706',
  warnBg: '#fffbeb',
  error: '#dc2626',
  errorBg: '#fef2f2',
  neutralBg: '#f4f4f5',
} as const

/* ─── Status config for result card ─── */
const STATUS_CONFIG: Record<
  SingleLeadResponse['status'],
  { label: string; bg: string; color: string; borderColor: string; icon: typeof CheckCircle2 }
> = {
  created: { label: '新线索，已录入', bg: c.successBg, color: c.success, borderColor: '#bbf7d0', icon: CheckCircle2 },
  collision_taken: { label: '撞量，已接管', bg: c.warnBg, color: c.warn, borderColor: '#fde68a', icon: AlertTriangle },
  collision_active: { label: '撞量，线索跟进中', bg: c.warnBg, color: c.warn, borderColor: '#fde68a', icon: AlertTriangle },
  duplicate: { label: '本渠道已提交过', bg: c.neutralBg, color: c.sub, borderColor: c.border, icon: XCircle },
  invalid: { label: '手机号格式错误', bg: c.errorBg, color: c.error, borderColor: '#fecaca', icon: XCircle },
  error: { label: '提交出错', bg: c.errorBg, color: c.error, borderColor: '#fecaca', icon: AlertCircle },
}

/* ─── Shared input class ─── */
const inputCls =
  'w-full h-11 rounded-lg bg-white px-3.5 text-[14px] text-[#18181b] outline-none border border-[#e4e4e7] transition-all placeholder:text-[#a1a1aa] hover:border-[#a1a1aa] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10'

/* ─── Shared textarea class ─── */
const textareaCls =
  'w-full rounded-lg bg-white px-3.5 py-2.5 text-[14px] text-[#18181b] leading-relaxed outline-none border border-[#e4e4e7] resize-none transition-all placeholder:text-[#a1a1aa] hover:border-[#a1a1aa] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10'

/* ─── Tab type ─── */
type TabType = 'form' | 'stats'

/* ─── FormSelect ─── */
function FormSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-[14px] outline-none transition-all',
          open
            ? 'border-[#2563eb] ring-2 ring-[#2563eb]/10'
            : 'border-[#e4e4e7] hover:border-[#a1a1aa]',
        )}
      >
        <span className={cn('truncate', value ? 'text-[#18181b]' : 'text-[#a1a1aa]')}>
          {selectedLabel || placeholder || '请选择'}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[#a1a1aa] transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[220px] overflow-y-auto rounded-lg border border-[#e4e4e7] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] transition-colors',
                    isSelected
                      ? 'bg-[#eff6ff] text-[#2563eb]'
                      : 'text-[#18181b] hover:bg-[#f4f4f5]',
                  )}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#2563eb]" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Render a single dynamic field ─── */
function DynamicField({
  field,
  value,
  onChange,
}: {
  field: SourceChannelExtraField
  value: string
  onChange: (v: string) => void
}) {
  const label = field.field_label || field.field_name

  if (field.field_type === 'select' && field.options?.length) {
    return (
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#18181b]">
          {label}
          {field.required && <span className="text-[#dc2626]"> *</span>}
        </label>
        <FormSelect
          options={field.options.map((o) => ({ label: o.label, value: o.value }))}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder || `请选择${label}`}
        />
      </div>
    )
  }

  if (field.field_type === 'textarea') {
    return (
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[#18181b]">
          {label}
          {field.required && <span className="text-[#dc2626]"> *</span>}
        </label>
        <textarea
          className={textareaCls}
          style={{ minHeight: '80px' }}
          placeholder={field.placeholder || `请输入${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }

  const inputType =
    field.field_type === 'number' ? 'number' :
    field.field_type === 'date' ? 'date' :
    field.field_type === 'datetime' ? 'datetime-local' :
    'text'

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[#18181b]">
        {label}
        {field.required && <span className="text-[#dc2626]"> *</span>}
      </label>
      <input
        type={inputType}
        className={inputCls}
        placeholder={field.placeholder || `请输入${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/* ─── Stats Panel ─── */
function StatsPanel({ token }: { token: string }) {
  const [stats, setStats] = useState<ChannelStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchChannelStats(token)
      .then((res) => {
        setStats(res)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#a1a1aa]" />
        <p className="mt-3 text-[13px] text-[#a1a1aa]">加载统计数据...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="mb-2 h-6 w-6 text-[#dc2626]" />
        <p className="text-[13px] text-[#dc2626]">{error}</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#e4e4e7] bg-[#f7f8fa] p-4">
          <p className="text-[12px] font-medium text-[#a1a1aa]">今日录入</p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-[#2563eb]">
            {stats.today_count}
          </p>
        </div>
        <div className="rounded-lg border border-[#e4e4e7] bg-[#f7f8fa] p-4">
          <p className="text-[12px] font-medium text-[#a1a1aa]">近30天</p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-[#18181b]">
            {stats.total_count}
          </p>
        </div>
      </div>

      {/* Daily breakdown */}
      <div className="rounded-lg border border-[#e4e4e7]">
        <div className="border-b border-[#e4e4e7] px-4 py-2.5">
          <p className="text-[13px] font-medium text-[#52525b]">每日明细</p>
        </div>
        {stats.daily_stats.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[#a1a1aa]">暂无提交记录</p>
        ) : (
          <div className="divide-y divide-[#f4f4f5]">
            {stats.daily_stats.map((item, idx) => {
              const isToday = item.date === new Date().toISOString().slice(0, 10)
              const maxCount = Math.max(...stats.daily_stats.map((d) => d.count), 1)
              const barWidth = Math.max((item.count / maxCount) * 100, 4)
              return (
                <div
                  key={item.date}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5',
                    isToday && 'bg-[#eff6ff]',
                  )}
                >
                  <span
                    className={cn(
                      'w-16 shrink-0 text-[13px] tabular-nums',
                      isToday ? 'font-medium text-[#2563eb]' : 'text-[#52525b]',
                    )}
                  >
                    {isToday ? '今天' : item.date.slice(5)}
                  </span>
                  <div className="flex-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.35, delay: idx * 0.02 }}
                      className="h-4 rounded"
                      style={{
                        backgroundColor: isToday ? c.accent : '#dbeafe',
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      'w-7 shrink-0 text-right text-[13px] font-medium tabular-nums',
                      isToday ? 'text-[#2563eb]' : 'text-[#18181b]',
                    )}
                  >
                    {item.count}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Main Component ─── */
export function LeadChannelSubmit() {
  const search = useSearch({ from: '/lead-submit' })
  const token = search.token ?? ''

  const [phase, setPhase] = useState<Phase>('loading')
  const [activeTab, setActiveTab] = useState<TabType>('form')
  const [channelName, setChannelName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [requireCampusSelection, setRequireCampusSelection] = useState(false)
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([])
  const [selectedCampusId, setSelectedCampusId] = useState('')
  const [extraFields, setExtraFields] = useState<SourceChannelExtraField[]>([])

  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({})

  const [singleResult, setSingleResult] = useState<SingleLeadResponse | null>(null)

  /* ─── Token validation ─── */
  useEffect(() => {
    if (!token) {
      setPhase('invalid')
      return
    }
    validateChannelToken(token)
      .then((res: ValidateTokenResponse) => {
        const name = res.channel_name || '渠道提交'
        setChannelName(name)
        document.title = `${name} - 线索录入`
        if (res.require_campus_selection && res.campuses?.length) {
          setRequireCampusSelection(true)
          setCampuses(res.campuses)
        }
        if (res.extra_fields?.length) {
          setExtraFields(res.extra_fields)
        }
        setPhase('form')
      })
      .catch(() => {
        document.title = '线索录入'
        setPhase('invalid')
      })
  }, [token])

  const setExtraFieldValue = useCallback((fieldName: string, value: string) => {
    setExtraFieldValues((prev) => ({ ...prev, [fieldName]: value }))
  }, [])

  const canSubmit = (() => {
    if (!parentPhone.trim()) return false
    if (requireCampusSelection && !selectedCampusId) return false
    return true
  })()

  const handleSubmit = useCallback(async () => {
    const phone = parentPhone.replace(/\D/g, '').trim()
    if (!phone) {
      setErrorMsg('请输入联系电话')
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setErrorMsg('手机号格式不正确，请输入11位手机号')
      return
    }
    if (requireCampusSelection && !selectedCampusId) {
      setErrorMsg('请先选择归属校区')
      return
    }
    for (const field of extraFields) {
      if (field.required) {
        const val = extraFieldValues[field.field_name]?.trim()
        if (!val) {
          setErrorMsg(`请填写${field.field_label || field.field_name}`)
          return
        }
      }
    }

    setErrorMsg('')
    setPhase('submitting')
    try {
      const res = await submitSingleLead({
        token,
        parent_phone: phone,
        parent_name: parentName.trim() || undefined,
        notes: notes.trim() || undefined,
        campus_id: selectedCampusId || undefined,
        extra_fields: Object.keys(extraFieldValues).length > 0 ? extraFieldValues : undefined,
      })
      setSingleResult(res)
      setPhase('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '提交失败，请稍后重试')
      setPhase('form')
    }
  }, [token, parentPhone, parentName, notes, selectedCampusId, extraFieldValues, requireCampusSelection, extraFields])

  const handleReset = useCallback(() => {
    setParentName('')
    setParentPhone('')
    setNotes('')
    setExtraFieldValues({})
    setSingleResult(null)
    setErrorMsg('')
    setPhase('form')
  }, [])

  return (
    <div className="min-h-svh" style={{ backgroundColor: c.bg }}>
      <div className="mx-auto max-w-[440px] px-4 py-5 sm:px-5">
        <AnimatePresence mode="wait" initial={false}>
          {/* ═══ loading ═══ */}
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[80svh] flex-col items-center justify-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
              <p className="mt-4 text-[13px] text-[#a1a1aa]">正在验证链接...</p>
            </motion.div>
          )}

          {/* ═══ invalid ═══ */}
          {phase === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-[80svh] flex-col items-center justify-center text-center"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#fef2f2]">
                <AlertCircle className="h-7 w-7 text-[#dc2626]" />
              </div>
              <h2 className="mb-1.5 text-lg font-semibold text-[#18181b]">
                链接无效
              </h2>
              <p className="max-w-[240px] text-[14px] leading-relaxed text-[#a1a1aa]">
                该提交链接无效或已失效，请联系管理员获取正确的链接
              </p>
            </motion.div>
          )}

          {/* ═══ form / stats ═══ */}
          {phase === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              {/* Card */}
              <div className="overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {/* Header */}
                <div className="border-b border-[#e4e4e7] px-5 pb-0 pt-5">
                  <h1 className="text-center text-[17px] font-semibold text-[#18181b]">
                    {channelName}
                  </h1>
                  <p className="mt-1 text-center text-[13px] text-[#a1a1aa]">
                    {activeTab === 'form' ? '填写客户信息，提交后自动录入系统' : '录入统计（近30天）'}
                  </p>

                  {/* Tabs — underline style */}
                  <div className="-mb-px mt-4 flex">
                    {([
                      { key: 'form' as TabType, label: '录入', icon: FileText },
                      { key: 'stats' as TabType, label: '统计', icon: BarChart3 },
                    ]).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={cn(
                          'flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition-colors',
                          activeTab === key
                            ? 'border-[#2563eb] text-[#2563eb]'
                            : 'border-transparent text-[#a1a1aa] hover:text-[#52525b]',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-5">
                  {activeTab === 'stats' && (
                    <StatsPanel token={token} />
                  )}

                  {activeTab === 'form' && (
                    <div className="space-y-4">
                      {/* Campus selector */}
                      {requireCampusSelection && (
                        <div>
                          <label className="mb-1.5 block text-[13px] font-medium text-[#18181b]">
                            归属校区 <span className="text-[#dc2626]">*</span>
                          </label>
                          <FormSelect
                            options={campuses.map((cp) => ({ label: cp.name, value: cp.id }))}
                            value={selectedCampusId}
                            onChange={setSelectedCampusId}
                            placeholder="请选择归属校区"
                          />
                        </div>
                      )}

                      {/* Dynamic extra fields */}
                      {extraFields.map((field) => (
                        <DynamicField
                          key={field.field_name}
                          field={field}
                          value={extraFieldValues[field.field_name] || ''}
                          onChange={(v) => setExtraFieldValue(field.field_name, v)}
                        />
                      ))}

                      {/* 客户名字 */}
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#18181b]">
                          客户名字
                        </label>
                        <input
                          type="text"
                          className={inputCls}
                          placeholder="选填"
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                        />
                      </div>

                      {/* 联系电话 */}
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#18181b]">
                          联系电话 <span className="text-[#dc2626]">*</span>
                        </label>
                        <input
                          type="tel"
                          className={inputCls}
                          placeholder="11位手机号"
                          maxLength={11}
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>

                      {/* 备注 */}
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#18181b]">
                          备注
                        </label>
                        <textarea
                          className={textareaCls}
                          style={{ minHeight: '72px' }}
                          placeholder="选填"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>

                      {/* Error */}
                      <AnimatePresence>
                        {errorMsg && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-start gap-2 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-[#dc2626]"
                          >
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {errorMsg}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit */}
                      <button
                        type="button"
                        disabled={!canSubmit}
                        className={cn(
                          'flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[14px] font-medium text-white transition-all active:scale-[0.98] motion-reduce:active:scale-100',
                          canSubmit
                            ? 'bg-[#2563eb] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#1d4ed8]'
                            : 'cursor-not-allowed bg-[#e4e4e7] text-[#a1a1aa]',
                        )}
                        onClick={handleSubmit}
                      >
                        {requireCampusSelection && !selectedCampusId
                          ? '请先选择校区'
                          : (
                            <>
                              提交
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <p className="mt-3 text-center text-[11px] text-[#a1a1aa]">
                提交即表示线索将录入 CRM 系统
              </p>
            </motion.div>
          )}

          {/* ═══ submitting ═══ */}
          {phase === 'submitting' && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[80svh] flex-col items-center justify-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
              <p className="mt-4 text-[14px] font-medium text-[#52525b]">
                正在提交...
              </p>
            </motion.div>
          )}

          {/* ═══ result ═══ */}
          {phase === 'result' && singleResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-[80svh] flex-col items-center justify-center"
            >
              {(() => {
                const cfg = STATUS_CONFIG[singleResult.status]
                const Icon = cfg.icon
                const isSuccess = singleResult.status === 'created' || singleResult.status === 'collision_taken'

                return (
                  <div className="w-full max-w-sm">
                    {/* Result card */}
                    <div
                      className="overflow-hidden rounded-xl border bg-white"
                      style={{ borderColor: cfg.borderColor }}
                    >
                      {/* Status header */}
                      <div
                        className="flex items-center gap-3 px-5 py-4"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 16 }}
                        >
                          <Icon className="h-6 w-6" style={{ color: cfg.color }} />
                        </motion.div>
                        <div>
                          <p className="text-[15px] font-semibold text-[#18181b]">
                            {isSuccess ? '提交成功' : '提交结果'}
                          </p>
                          <p className="text-[13px]" style={{ color: cfg.color }}>
                            {cfg.label}
                          </p>
                        </div>
                      </div>

                      {/* Detail */}
                      <div className="px-5 py-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-[#a1a1aa]">手机号</span>
                          <span className="font-mono text-[15px] tabular-nums text-[#18181b]">
                            {singleResult.phone}
                          </span>
                        </div>
                        {singleResult.message && (
                          <p className="mt-2 text-[13px] text-[#a1a1aa]">
                            {singleResult.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Continue button */}
                    <button
                      type="button"
                      className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2563eb] text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:bg-[#1d4ed8] active:scale-[0.98] motion-reduce:active:scale-100"
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-4 w-4" />
                      继续录入
                    </button>
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
