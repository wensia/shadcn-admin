/**
 * 渠道线索提交公开页
 *
 * Design: Nature Distilled + Flat hybrid, mobile-first
 * Palette: warm earth tones — dark #2c2c2a, cream #faf9f5, sand #e8e6dc, terracotta #d97757
 * Touch target ≥ 44 px, focus-visible, prefers-reduced-motion
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Send, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  validateChannelToken,
  submitChannelLeads,
  type SubmitResultItem,
  type ChannelSubmitResponse,
} from '../api/channel-submit'

/* ─── Phase ─── */
type Phase = 'loading' | 'invalid' | 'form' | 'submitting' | 'results'

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

/* ─── Phone parsing ─── */
function parsePhones(raw: string): { valid: string[]; invalid: string[] } {
  const lines = raw
    .split(/[\n,，\s]+/)
    .map((s) => s.replace(/\D/g, '').trim())
    .filter(Boolean)
  const unique = [...new Set(lines)]
  const valid = unique.filter((p) => /^1[3-9]\d{9}$/.test(p))
  const invalid = unique.filter((p) => !/^1[3-9]\d{9}$/.test(p) && p.length > 0)
  return { valid, invalid }
}

/* ─── Mask phone ─── */
function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone
  return phone.slice(0, 3) + '****' + phone.slice(7)
}

/* ─── Status badge config ─── */
type StatusKey = SubmitResultItem['status']
const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; bg: string; color: string; icon: typeof CheckCircle2 }
> = {
  created: { label: '新录入', bg: '#788c5d1a', color: '#788c5d', icon: CheckCircle2 },
  collision_taken: { label: '撞量·已接管', bg: '#d977571a', color: '#d97757', icon: AlertTriangle },
  collision_active: { label: '撞量', bg: '#d9775720', color: '#c4654a', icon: AlertTriangle },
  duplicate: { label: '重复', bg: '#b0aea51a', color: '#b0aea5', icon: XCircle },
  invalid: { label: '格式错误', bg: '#c9554a12', color: '#c9554a', icon: XCircle },
  error: { label: '错误', bg: '#c9554a1a', color: '#c9554a', icon: AlertCircle },
}

/* ─── CTA button styles ─── */
const cta = {
  background: `linear-gradient(135deg, ${c.terracotta}, #c4654a)`,
  color: '#fff',
  boxShadow: '0 4px 14px rgba(217,119,87,0.22)',
}

/* ─── Main Component ─── */
export function LeadChannelSubmit() {
  const search = useSearch({ from: '/lead-submit' })
  const token = search.token ?? ''

  const [phase, setPhase] = useState<Phase>('loading')
  const [channelName, setChannelName] = useState('')
  const [rawText, setRawText] = useState('')
  const [submitResult, setSubmitResult] = useState<ChannelSubmitResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  /* ─── Token validation ─── */
  useEffect(() => {
    if (!token) {
      setPhase('invalid')
      return
    }
    validateChannelToken(token)
      .then((res) => {
        setChannelName(res.channel_name || '渠道提交')
        setPhase('form')
      })
      .catch(() => {
        setPhase('invalid')
      })
  }, [token])

  /* ─── Parsed phones (memoized) ─── */
  const parsed = useMemo(() => parsePhones(rawText), [rawText])

  /* ─── Submit handler ─── */
  const handleSubmit = useCallback(async () => {
    if (parsed.valid.length === 0) return
    setErrorMsg('')
    setPhase('submitting')
    try {
      const res = await submitChannelLeads(token, parsed.valid)
      setSubmitResult(res)
      setPhase('results')
    } catch {
      setErrorMsg('提交失败，请稍后重试')
      setPhase('form')
    }
  }, [token, parsed.valid])

  /* ─── Reset to form ─── */
  const handleReset = useCallback(() => {
    setRawText('')
    setSubmitResult(null)
    setErrorMsg('')
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
              <div
                className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                style={{ borderColor: c.sand, borderTopColor: c.terracotta }}
              />
              <p className="mt-4 text-sm" style={{ color: c.muted }}>
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
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#c9554a]/10">
                <AlertCircle className="h-8 w-8 text-[#c9554a]" />
              </div>
              <h2 className="mb-2 text-xl font-bold" style={{ color: c.dark }}>
                提交链接无效
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: c.muted }}>
                该提交链接无效或已失效
                <br />
                请联系管理员获取正确的链接
              </p>
            </motion.div>
          )}

          {/* ═══ form ═══ */}
          {phase === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-[88svh] flex-col justify-center"
            >
              {/* Header */}
              <div className="mb-8 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 24 }}
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
                  style={{ background: `linear-gradient(135deg, ${c.terracotta}, #c4654a)` }}
                >
                  <Send className="h-6 w-6 text-white" />
                </motion.div>
                <h1 className="mb-2 text-[22px] font-bold tracking-tight" style={{ color: c.dark }}>
                  {channelName}
                </h1>
                <p className="text-[13px] leading-relaxed" style={{ color: c.muted }}>
                  请输入手机号码，系统将自动录入 CRM
                </p>
              </div>

              {/* Form card */}
              <div className="space-y-4 rounded-2xl bg-white/70 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                {/* Textarea */}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium" style={{ color: c.text }}>
                    手机号码
                  </label>
                  <textarea
                    className="w-full resize-none rounded-xl bg-white px-4 py-3 text-[15px] leading-relaxed shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none ring-1 ring-inset ring-black/[0.06] transition-shadow placeholder:text-[#b0aea5] focus:ring-2 focus:ring-[#d97757]/40"
                    style={{ color: c.text, minHeight: '200px' }}
                    placeholder={'请输入手机号，每行一个\n例如：\n13800138001\n13900139002'}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                </div>

                {/* Parsed count */}
                {rawText.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-wrap items-center gap-2 text-[13px]"
                  >
                    {parsed.valid.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1"
                        style={{ backgroundColor: `${c.green}18`, color: c.green }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        已识别 {parsed.valid.length} 个有效手机号
                      </span>
                    )}
                    {parsed.invalid.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1"
                        style={{ backgroundColor: `${c.red}18`, color: c.red }}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        {parsed.invalid.length} 个无效
                      </span>
                    )}
                    {parsed.valid.length === 0 && parsed.invalid.length === 0 && (
                      <span className="text-[13px]" style={{ color: c.muted }}>
                        未识别到手机号
                      </span>
                    )}
                  </motion.div>
                )}

                {/* Error message */}
                {errorMsg && (
                  <p className="text-[13px]" style={{ color: c.red }}>
                    {errorMsg}
                  </p>
                )}

                {/* Submit button */}
                <button
                  type="button"
                  disabled={parsed.valid.length === 0}
                  className={cn(
                    'h-12 w-full cursor-pointer rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98] motion-reduce:active:scale-100',
                    parsed.valid.length === 0 && 'cursor-not-allowed opacity-50'
                  )}
                  style={parsed.valid.length > 0 ? cta : { backgroundColor: c.sand, color: c.muted }}
                  onClick={handleSubmit}
                >
                  提交 {parsed.valid.length > 0 ? `${parsed.valid.length} 个号码` : ''}
                </button>
              </div>
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
              <div
                className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                style={{ borderColor: c.sand, borderTopColor: c.terracotta }}
              />
              <p className="mt-4 text-sm" style={{ color: c.muted }}>
                正在提交，请稍候...
              </p>
              <p className="mt-1 text-xs" style={{ color: c.muted }}>
                共 {parsed.valid.length} 个号码
              </p>
            </motion.div>
          )}

          {/* ═══ results ═══ */}
          {phase === 'results' && submitResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="py-4"
            >
              {/* Title */}
              <div className="mb-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    background: `linear-gradient(145deg, ${c.green}14, ${c.green}08)`,
                    boxShadow: `0 0 0 1px ${c.green}1a`,
                  }}
                >
                  <CheckCircle2 className="h-7 w-7" style={{ color: c.green }} />
                </motion.div>
                <h2 className="mb-1 text-xl font-bold" style={{ color: c.dark }}>
                  提交完成
                </h2>
                <p className="text-[13px]" style={{ color: c.muted }}>
                  {channelName}
                </p>
              </div>

              {/* Summary bar */}
              <div className="mb-4 rounded-xl bg-white/70 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] font-medium">
                  <span style={{ color: c.text }}>
                    共 {submitResult.summary.total} 条
                  </span>
                  <span style={{ color: '#b0aea5' }}>|</span>
                  {submitResult.summary.created > 0 && (
                    <span style={{ color: c.green }}>
                      新录入 {submitResult.summary.created}
                    </span>
                  )}
                  {(submitResult.summary.collision_taken + submitResult.summary.collision_active) > 0 && (
                    <>
                      <span style={{ color: '#b0aea5' }}>|</span>
                      <span style={{ color: c.terracotta }}>
                        撞量 {submitResult.summary.collision_taken + submitResult.summary.collision_active}
                      </span>
                    </>
                  )}
                  {submitResult.summary.duplicate > 0 && (
                    <>
                      <span style={{ color: '#b0aea5' }}>|</span>
                      <span style={{ color: c.muted }}>
                        重复 {submitResult.summary.duplicate}
                      </span>
                    </>
                  )}
                  {submitResult.summary.error > 0 && (
                    <>
                      <span style={{ color: '#b0aea5' }}>|</span>
                      <span style={{ color: c.red }}>
                        错误 {submitResult.summary.error}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Results list */}
              <div className="space-y-2">
                {submitResult.results.map((item, i) => {
                  const cfg = STATUS_CONFIG[item.status]
                  const Icon = cfg.icon
                  return (
                    <motion.div
                      key={`${item.phone}-${i}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * Math.min(i, 20), duration: 0.25 }}
                      className="flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] backdrop-blur-sm"
                    >
                      {/* Phone */}
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-[15px] tabular-nums"
                        style={{ color: c.text }}
                      >
                        {maskPhone(item.phone)}
                      </span>

                      {/* Status badge */}
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>

                      {/* Message */}
                      {item.message && item.status !== 'created' && (
                        <span
                          className="hidden shrink-0 text-[12px] sm:inline"
                          style={{ color: c.muted }}
                        >
                          {item.message}
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Continue button */}
              <div className="mt-6">
                <button
                  type="button"
                  className="h-12 w-full cursor-pointer rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98] motion-reduce:active:scale-100"
                  style={cta}
                  onClick={handleReset}
                >
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    继续提交
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
