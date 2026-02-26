/**
 * 渠道线索提交公开页 — 单条表单录入
 *
 * Design: Nature Distilled + Flat hybrid, mobile-first
 * Palette: warm earth tones — dark #2c2c2a, cream #faf9f5, sand #e8e6dc, terracotta #d97757
 * Touch target ≥ 44 px, focus-visible, prefers-reduced-motion
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ChevronDown,
  MapPin,
  Check,
  User,
  Phone,
  MessageSquare,
  BarChart3,
  FileEdit,
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

/* ─── Palette ─── */
const c = {
  dark: '#2c2c2a',
  text: '#3d3d3a',
  cream: '#faf9f5',
  sand: '#e8e6dc',
  muted: '#b0aea5',
  terracotta: '#d97757',
  green: '#788c5d',
  red: '#c9554a',
} as const

/* ─── CTA button styles ─── */
const cta = {
  background: `linear-gradient(135deg, ${c.terracotta}, #c4654a)`,
  color: '#fff',
  boxShadow: '0 4px 14px rgba(217,119,87,0.22)',
}

/* ─── Status config for result card ─── */
const STATUS_CONFIG: Record<
  SingleLeadResponse['status'],
  { label: string; bg: string; color: string; icon: typeof CheckCircle2 }
> = {
  created: { label: '新线索，已录入', bg: '#788c5d1a', color: '#788c5d', icon: CheckCircle2 },
  collision_taken: { label: '撞量，已接管', bg: '#d977571a', color: '#d97757', icon: AlertTriangle },
  collision_active: { label: '撞量，线索跟进中', bg: '#d9775720', color: '#c4654a', icon: AlertTriangle },
  duplicate: { label: '本渠道已提交过', bg: '#b0aea51a', color: '#b0aea5', icon: XCircle },
  invalid: { label: '手机号格式错误', bg: '#c9554a12', color: '#c9554a', icon: XCircle },
  error: { label: '提交出错', bg: '#c9554a1a', color: '#c9554a', icon: AlertCircle },
}

/* ─── Shared input class ─── */
const inputCls =
  'w-full h-12 rounded-xl bg-white px-4 text-[15px] outline-none ring-1 ring-inset ring-black/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition-shadow placeholder:text-[#b0aea5] focus:ring-[#d97757]/50 focus:shadow-[0_0_0_3px_rgba(217,119,87,0.08)]'

/* ─── FormSelect — generic custom select ─── */
function FormSelect({
  options,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  icon?: typeof MapPin
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
          'flex h-12 w-full items-center justify-between rounded-xl bg-white px-4 text-[15px] outline-none ring-1 ring-inset transition-all',
          'shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]',
          open
            ? 'ring-[#d97757]/50 shadow-[0_0_0_3px_rgba(217,119,87,0.08)]'
            : 'ring-black/[0.06] hover:ring-black/[0.12]',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && (
            <Icon
              className="h-4 w-4 shrink-0"
              style={{ color: value ? c.terracotta : c.muted }}
            />
          )}
          <span style={{ color: value ? c.text : c.muted }}>
            {selectedLabel || placeholder || '请选择'}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            open && 'rotate-180',
          )}
          style={{ color: c.muted }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[240px] overflow-y-auto rounded-xl bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.04)]"
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
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] transition-colors',
                    isSelected
                      ? 'bg-[#d97757]/[0.06]'
                      : 'hover:bg-black/[0.03] active:bg-black/[0.05]',
                  )}
                  style={{ color: isSelected ? c.terracotta : c.text }}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0" style={{ color: c.terracotta }} />
                  )}
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
        <label className="mb-1.5 block text-[13px] font-medium" style={{ color: c.text }}>
          {label}
          {field.required && <span style={{ color: c.red }}> *</span>}
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
        <label className="mb-1.5 block text-[13px] font-medium" style={{ color: c.text }}>
          {label}
          {field.required && <span style={{ color: c.red }}> *</span>}
        </label>
        <textarea
          className="w-full resize-none rounded-xl bg-white px-4 py-3 text-[15px] leading-relaxed shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none ring-1 ring-inset ring-black/[0.06] transition-shadow placeholder:text-[#b0aea5] focus:ring-[#d97757]/50 focus:shadow-[0_0_0_3px_rgba(217,119,87,0.08)]"
          style={{ color: c.text, minHeight: '80px' }}
          placeholder={field.placeholder || `请输入${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }

  // text / number / date → input
  const inputType =
    field.field_type === 'number' ? 'number' :
    field.field_type === 'date' ? 'date' :
    field.field_type === 'datetime' ? 'datetime-local' :
    'text'

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium" style={{ color: c.text }}>
        {label}
        {field.required && <span style={{ color: c.red }}> *</span>}
      </label>
      <input
        type={inputType}
        className={inputCls}
        style={{ color: c.text }}
        placeholder={field.placeholder || `请输入${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/* ─── Tab type ─── */
type TabType = 'form' | 'stats'

/* ─── Stats Panel ─── */
function StatsPanel({
  token,
  channelName,
}: {
  token: string
  channelName: string
}) {
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
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative h-8 w-8">
          <div
            className="absolute inset-0 animate-spin rounded-full border-[3px] border-t-transparent"
            style={{ borderColor: c.sand, borderTopColor: c.terracotta }}
          />
        </div>
        <p className="mt-4 text-sm" style={{ color: c.muted }}>加载统计数据...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="mb-3 h-8 w-8" style={{ color: c.red }} />
        <p className="text-sm" style={{ color: c.red }}>{error}</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* 今日 + 30天总计 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/70 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
          <p className="text-[12px] font-medium tracking-wide" style={{ color: c.muted }}>今日录入</p>
          <p className="mt-1.5 text-[32px] font-bold leading-none tracking-tight" style={{ color: c.terracotta }}>
            {stats.today_count}
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
          <p className="text-[12px] font-medium tracking-wide" style={{ color: c.muted }}>近30天</p>
          <p className="mt-1.5 text-[32px] font-bold leading-none tracking-tight" style={{ color: c.green }}>
            {stats.total_count}
          </p>
        </div>
      </div>

      {/* 每日明细 */}
      <div className="rounded-2xl bg-white/70 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
        <p className="mb-4 text-[13px] font-medium" style={{ color: c.text }}>每日录入明细</p>
        {stats.daily_stats.length === 0 ? (
          <p className="py-6 text-center text-[13px]" style={{ color: c.muted }}>暂无提交记录</p>
        ) : (
          <div className="space-y-0">
            {stats.daily_stats.map((item, idx) => {
              const isToday = item.date === new Date().toISOString().slice(0, 10)
              const maxCount = Math.max(...stats.daily_stats.map((d) => d.count), 1)
              const barWidth = Math.max((item.count / maxCount) * 100, 4)
              return (
                <div
                  key={item.date}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    isToday && 'bg-[#d97757]/[0.06]',
                  )}
                >
                  <span
                    className="w-[88px] shrink-0 text-[13px] tabular-nums"
                    style={{ color: isToday ? c.terracotta : c.text }}
                  >
                    {isToday ? '今天' : item.date.slice(5)}
                  </span>
                  <div className="flex-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.4, delay: idx * 0.03 }}
                      className="h-[18px] rounded-md"
                      style={{
                        background: isToday
                          ? `linear-gradient(90deg, ${c.terracotta}, #c4654a)`
                          : `linear-gradient(90deg, ${c.terracotta}40, ${c.terracotta}20)`,
                      }}
                    />
                  </div>
                  <span
                    className="w-8 shrink-0 text-right text-[13px] font-semibold tabular-nums"
                    style={{ color: isToday ? c.terracotta : c.text }}
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

  // Campus
  const [requireCampusSelection, setRequireCampusSelection] = useState(false)
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([])
  const [selectedCampusId, setSelectedCampusId] = useState('')

  // Extra fields config from channel
  const [extraFields, setExtraFields] = useState<SourceChannelExtraField[]>([])

  // Form data
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({})

  // Result
  const [singleResult, setSingleResult] = useState<SingleLeadResponse | null>(null)

  /* ─── Token validation ─── */
  useEffect(() => {
    if (!token) {
      setPhase('invalid')
      return
    }
    validateChannelToken(token)
      .then((res: ValidateTokenResponse) => {
        setChannelName(res.channel_name || '渠道提交')
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
        setPhase('invalid')
      })
  }, [token])

  /* ─── Extra field value setter ─── */
  const setExtraFieldValue = useCallback((fieldName: string, value: string) => {
    setExtraFieldValues((prev) => ({ ...prev, [fieldName]: value }))
  }, [])

  /* ─── Validation ─── */
  const canSubmit = (() => {
    if (!parentPhone.trim()) return false
    if (requireCampusSelection && !selectedCampusId) return false
    return true
  })()

  /* ─── Submit handler ─── */
  const handleSubmit = useCallback(async () => {
    // Frontend validation
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
    // Validate required extra fields
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

  /* ─── Reset — keep campus selection ─── */
  const handleReset = useCallback(() => {
    setParentName('')
    setParentPhone('')
    setNotes('')
    setExtraFieldValues({})
    setSingleResult(null)
    setErrorMsg('')
    // Keep selectedCampusId for consecutive entries
    setPhase('form')
  }, [])

  return (
    <div
      className="min-h-svh px-5 py-6 sm:px-6"
      style={{ background: `linear-gradient(170deg, ${c.cream} 0%, #f0ede6 55%, ${c.sand} 100%)` }}
    >
      <div className="mx-auto max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          {/* ═══ loading ═══ */}
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[88svh] flex-col items-center justify-center"
            >
              <div className="relative h-10 w-10">
                <div
                  className="absolute inset-0 animate-spin rounded-full border-[3px] border-t-transparent"
                  style={{ borderColor: c.sand, borderTopColor: c.terracotta }}
                />
                <div
                  className="absolute inset-1.5 animate-spin rounded-full border-2 border-b-transparent"
                  style={{
                    borderColor: `${c.terracotta}30`,
                    borderBottomColor: 'transparent',
                    animationDirection: 'reverse',
                    animationDuration: '0.8s',
                  }}
                />
              </div>
              <p className="mt-5 text-sm font-medium tracking-wide" style={{ color: c.muted }}>
                正在验证提交链接...
              </p>
            </motion.div>
          )}

          {/* ═══ invalid ═══ */}
          {phase === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-[88svh] flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 16 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{
                  background: `linear-gradient(145deg, ${c.red}12, ${c.red}06)`,
                  boxShadow: `0 0 0 1px ${c.red}15`,
                }}
              >
                <AlertCircle className="h-9 w-9" style={{ color: c.red }} />
              </motion.div>
              <h2
                className="mb-2.5 text-[22px] font-bold tracking-tight"
                style={{ color: c.dark }}
              >
                提交链接无效
              </h2>
              <p
                className="max-w-[260px] text-[14px] leading-relaxed"
                style={{ color: c.muted }}
              >
                该提交链接无效或已失效，请联系管理员获取正确的链接
              </p>
            </motion.div>
          )}

          {/* ═══ form / stats ═══ */}
          {phase === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-[88svh] flex-col"
            >
              {/* Sticky header + tab */}
              <div
                className="sticky top-0 z-10 -mx-5 px-5 pb-1 pt-6 sm:-mx-6 sm:px-6"
                style={{ background: `linear-gradient(170deg, ${c.cream} 0%, #f0ede6 55%, ${c.sand} 100%)` }}
              >
                {/* Header */}
                <div className="mb-5 text-center">
                  <h1
                    className="mb-2 text-[22px] font-bold tracking-tight"
                    style={{ background: `linear-gradient(135deg, ${c.terracotta}, #c4654a)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    {channelName}
                  </h1>
                  <p className="text-[13px] leading-relaxed" style={{ color: c.muted }}>
                    {activeTab === 'form' ? '请填写客户信息，提交后将自动录入系统' : '录入统计（近30天）'}
                  </p>
                </div>

                {/* Tab switcher */}
                <div className="mb-4 flex items-center gap-1.5 rounded-xl bg-white/50 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
                  {([
                    { key: 'form' as TabType, label: '录入', icon: FileEdit },
                    { key: 'stats' as TabType, label: '统计', icon: BarChart3 },
                  ]).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={cn(
                        'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-medium transition-all',
                        activeTab === key
                          ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                          : 'hover:bg-white/40',
                      )}
                      style={{ color: activeTab === key ? c.terracotta : c.muted }}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats tab */}
              {activeTab === 'stats' && (
                <StatsPanel token={token} channelName={channelName} />
              )}

              {/* Form tab */}
              {activeTab === 'form' && (
              <>
              {/* Form card */}
              <div className="space-y-4 rounded-2xl bg-white/70 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                {/* Campus selector */}
                {requireCampusSelection && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <label
                      className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium"
                      style={{ color: c.text }}
                    >
                      <MapPin className="h-3.5 w-3.5" style={{ color: c.terracotta }} />
                      归属校区
                    </label>
                    <FormSelect
                      options={campuses.map((cp) => ({ label: cp.name, value: cp.id }))}
                      value={selectedCampusId}
                      onChange={setSelectedCampusId}
                      placeholder="请选择归属校区"
                      icon={MapPin}
                    />
                  </motion.div>
                )}

                {/* Dynamic extra fields — 放在最前面 */}
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
                  <label
                    className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium"
                    style={{ color: c.text }}
                  >
                    <User className="h-3.5 w-3.5" style={{ color: c.terracotta }} />
                    客户名字
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    style={{ color: c.text }}
                    placeholder="请输入客户名字（选填）"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                  />
                </div>

                {/* 联系电话 * */}
                <div>
                  <label
                    className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium"
                    style={{ color: c.text }}
                  >
                    <Phone className="h-3.5 w-3.5" style={{ color: c.terracotta }} />
                    联系电话
                    <span style={{ color: c.red }}> *</span>
                  </label>
                  <input
                    type="tel"
                    className={inputCls}
                    style={{ color: c.text }}
                    placeholder="请输入11位手机号"
                    maxLength={11}
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                {/* 客户留言 */}
                <div>
                  <label
                    className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium"
                    style={{ color: c.text }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" style={{ color: c.terracotta }} />
                    客户留言
                  </label>
                  <textarea
                    className="w-full resize-none rounded-xl bg-white px-4 py-3 text-[15px] leading-relaxed shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none ring-1 ring-inset ring-black/[0.06] transition-shadow placeholder:text-[#b0aea5] focus:ring-[#d97757]/50 focus:shadow-[0_0_0_3px_rgba(217,119,87,0.08)]"
                    style={{ color: c.text, minHeight: '80px' }}
                    placeholder="请输入留言（选填）"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-1.5 text-[13px]"
                      style={{ color: c.red }}
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {errorMsg}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <button
                  type="button"
                  disabled={!canSubmit}
                  className={cn(
                    'h-12 w-full cursor-pointer rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98] motion-reduce:active:scale-100',
                    !canSubmit && 'cursor-not-allowed opacity-50',
                  )}
                  style={canSubmit ? cta : { backgroundColor: c.sand, color: c.muted }}
                  onClick={handleSubmit}
                >
                  {requireCampusSelection && !selectedCampusId
                    ? '请先选择校区'
                    : '提交线索'}
                </button>
              </div>

              {/* Footer hint */}
              <p
                className="mt-4 text-center text-[11px] tracking-wide"
                style={{ color: `${c.muted}90` }}
              >
                提交即表示线索将录入 CRM 系统
              </p>
              </>
              )}
            </motion.div>
          )}

          {/* ═══ submitting ═══ */}
          {phase === 'submitting' && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[88svh] flex-col items-center justify-center"
            >
              <div className="relative h-10 w-10">
                <div
                  className="absolute inset-0 animate-spin rounded-full border-[3px] border-t-transparent"
                  style={{ borderColor: c.sand, borderTopColor: c.terracotta }}
                />
                <div
                  className="absolute inset-1.5 animate-spin rounded-full border-2 border-b-transparent"
                  style={{
                    borderColor: `${c.terracotta}30`,
                    borderBottomColor: 'transparent',
                    animationDirection: 'reverse',
                    animationDuration: '0.8s',
                  }}
                />
              </div>
              <p className="mt-5 text-sm font-medium" style={{ color: c.text }}>
                正在提交，请稍候...
              </p>
            </motion.div>
          )}

          {/* ═══ result (single) ═══ */}
          {phase === 'result' && singleResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-[88svh] flex-col items-center justify-center"
            >
              {(() => {
                const cfg = STATUS_CONFIG[singleResult.status]
                const Icon = cfg.icon
                const isSuccess = singleResult.status === 'created' || singleResult.status === 'collision_taken'

                return (
                  <>
                    {/* Status icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.15,
                        type: 'spring',
                        stiffness: 200,
                        damping: 18,
                      }}
                      className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl"
                      style={{
                        background: `linear-gradient(145deg, ${cfg.color}14, ${cfg.color}08)`,
                        boxShadow: `0 0 0 1px ${cfg.color}1a`,
                      }}
                    >
                      <Icon className="h-9 w-9" style={{ color: cfg.color }} />
                    </motion.div>

                    {/* Title */}
                    <h2
                      className="mb-2 text-xl font-bold"
                      style={{ color: c.dark }}
                    >
                      {isSuccess ? '提交成功' : '提交结果'}
                    </h2>

                    {/* Result card */}
                    <div className="mb-6 w-full max-w-sm rounded-2xl bg-white/70 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <span
                          className="font-mono text-lg tabular-nums"
                          style={{ color: c.text }}
                        >
                          {singleResult.phone}
                        </span>
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                      {singleResult.message && (
                        <p
                          className="mt-2 text-[13px]"
                          style={{ color: c.muted }}
                        >
                          {singleResult.message}
                        </p>
                      )}
                    </div>

                    {/* Continue button */}
                    <button
                      type="button"
                      className="h-12 w-full max-w-sm cursor-pointer rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98] motion-reduce:active:scale-100"
                      style={cta}
                      onClick={handleReset}
                    >
                      <span className="inline-flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        继续录入
                      </span>
                    </button>
                  </>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
