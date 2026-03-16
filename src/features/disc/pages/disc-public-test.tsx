/**
 * DISC 性格测试公开页
 *
 * Design: Nature Distilled + Flat hybrid, mobile-first
 * Palette: warm earth tones — dark #2c2c2a, cream #faf9f5, sand #e8e6dc, blue #0064FA
 * Touch target ≥ 44 px, focus-visible, prefers-reduced-motion
 */

import { useState, useCallback, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Input, Button as SemiButton } from '@douyinfe/semi-ui-19'
import { toast } from '@/lib/toast'
import { ChevronLeft, ChevronRight, Send, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DISC_QUESTIONS } from '../data/questions'
import { submitDiscTest, validateDiscTestRef } from '../api'
import { DiscQuestionCard } from '../components/disc-question-card'
import type { DISCAnswer } from '../types'

type Phase = 'loading' | 'invalid' | 'start' | 'test' | 'done'

const TOTAL = DISC_QUESTIONS.length
const PHONE_REGEX = /^1[3-9]\d{9}$/

function createEmptyAnswers(): DISCAnswer[] {
  return Array.from({ length: TOTAL }, () => ({ most: null, least: null }))
}

/* ─── Palette ─── */
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

/* ─── DISC 四维 Logo ─── */
const DISC_BADGES = [
  { letter: 'D', bg: '#dc2626', label: '支配' },
  { letter: 'I', bg: '#6a9bcc', label: '影响' },
  { letter: 'S', bg: '#788c5d', label: '稳健' },
  { letter: 'C', bg: '#3d3d3a', label: '谨慎' },
] as const

function DiscLogo() {
  return (
    <div className="mb-8 flex justify-center gap-3">
      {DISC_BADGES.map((b, i) => (
        <motion.div
          key={b.letter}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + i * 0.06, type: 'spring', stiffness: 320, damping: 22 }}
          className="flex flex-col items-center gap-1.5"
        >
          <div
            className="flex h-11 w-11 items-center justify-center rounded-[14px] text-base font-bold text-white shadow-md"
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

/* ─── 完成动画：涟漪绽放 ─── */
const DISC_PARTICLES = [
  { color: '#dc2626', angle: -50, dist: 64 },  // D
  { color: '#6a9bcc', angle: 35, dist: 60 },   // I
  { color: '#788c5d', angle: 145, dist: 62 },   // S
  { color: '#3d3d3a', angle: -145, dist: 58 },  // C
] as const

function CompletionAnimation() {
  return (
    <div className="relative mb-10 flex items-center justify-center" style={{ width: 168, height: 168 }}>
      {/* 柔光晕染 */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 220, height: 220,
          background: `radial-gradient(circle, ${c.green}14 0%, ${c.accent}06 40%, transparent 70%)`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      />

      {/* 装饰外环 - 虚线 */}
      <svg className="absolute" width="168" height="168" viewBox="0 0 168 168">
        <motion.circle
          cx="84" cy="84" r="80"
          fill="none" stroke={c.sand} strokeWidth="1" strokeDasharray="3 7"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ delay: 0.15, duration: 2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {/* 中央主圆 + 勾选 */}
      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 88, height: 88,
          background: `linear-gradient(145deg, ${c.green}0e, ${c.green}06)`,
          boxShadow: `0 0 0 1px ${c.green}1a, 0 8px 28px ${c.green}0a`,
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 180, damping: 18 }}
      >
        <svg width="34" height="34" viewBox="0 0 34 34">
          <motion.path
            d="M9.5 18.5 L14.5 23.5 L24.5 12"
            fill="none" stroke={c.green} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.65, duration: 0.45, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>

      {/* 四维彩色粒子 */}
      {DISC_PARTICLES.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: 6, height: 6,
              backgroundColor: p.color,
              marginLeft: -3, marginTop: -3,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: Math.cos(rad) * p.dist,
              y: Math.sin(rad) * p.dist,
              scale: [0, 1.4, 1],
              opacity: [0, 0.9, 0.55],
            }}
            transition={{
              delay: 0.95 + i * 0.08,
              duration: 0.75,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        )
      })}
    </div>
  )
}

/* ─── 主组件 ─── */
export function DiscPublicTest() {
  const search = useSearch({ from: '/disc-test' })
  const ref = search.ref ?? ''
  const linkId = search.id ?? ''
  const channel = search.channel ?? ''

  const [phase, setPhase] = useState<Phase>('loading')
  const [name, setName] = useState(search.name ?? '')
  const [phone, setPhone] = useState(search.phone ?? '')
  const [nameErr, setNameErr] = useState('')
  const [phoneErr, setPhoneErr] = useState('')
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<DISCAnswer[]>(createEmptyAnswers)
  const [submitting, setSubmitting] = useState(false)
  const [dir, setDir] = useState(1)
  const [startTime, setStartTime] = useState<string | null>(null)

  /* 链接验证：支持 ref 和 id 两种模式 */
  useEffect(() => {
    if (!ref && !linkId) { setPhase('invalid'); return }
    validateDiscTestRef(ref, linkId)
      .then((r) => {
        if (r.success === false) { setPhase('invalid'); return }
        // 专属链接模式：自动预填姓名和手机号
        if (r.data?.mode === 'link') {
          if (r.data.name) setName(r.data.name)
          if (r.data.phone) setPhone(r.data.phone)
        }
        setPhase('start')
      })
      .catch(() => setPhase('invalid'))
  }, [ref, linkId])

  const validateStart = useCallback(() => {
    let ok = true
    if (!name.trim()) { setNameErr('请输入姓名'); ok = false } else setNameErr('')
    if (!phone.trim()) { setPhoneErr('请输入手机号'); ok = false }
    else if (!PHONE_REGEX.test(phone.trim())) { setPhoneErr('请输入正确的手机号'); ok = false }
    else setPhoneErr('')
    return ok
  }, [name, phone])

  const handleStart = () => {
    if (validateStart()) { setStartTime(new Date().toISOString()); setPhase('test') }
  }

  const cur = answers[idx]
  const curOk = cur.most !== null && cur.least !== null
  const allOk = answers.every((a) => a.most !== null && a.least !== null)
  const isLast = idx === TOTAL - 1
  const done = answers.filter((a) => a.most !== null && a.least !== null).length

  const go = (d: 1 | -1) => {
    if (d === -1 && idx > 0) { setDir(-1); setIdx((i) => i - 1) }
    if (d === 1 && curOk && !isLast) { setDir(1); setIdx((i) => i + 1) }
  }

  const handleSubmit = async () => {
    if (!allOk || submitting) return
    setSubmitting(true)
    try {
      const res = await submitDiscTest({
        name: name.trim(), phone: phone.trim(), answers,
        start_time: startTime, ref: ref || undefined,
        link_id: linkId || undefined,
        channel: channel || undefined,
      })
      if (res.success === false) { toast.error(res.message || '提交失败'); return }
      setPhase('done')
    } catch { toast.error('提交失败，请稍后重试') }
    finally { setSubmitting(false) }
  }

  /* ─── 按钮样式工具 ─── */
  const cta = {
    background: `linear-gradient(135deg, ${c.accent}, #0050C8)`,
    color: '#fff',
    boxShadow: '0 4px 14px rgba(0,100,250,0.22)',
  }
  const ctaOff = { backgroundColor: c.sand, color: c.muted }

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
              key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex min-h-[88svh] flex-col items-center justify-center"
            >
              <div
                className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
                style={{ borderColor: c.sand, borderTopColor: c.accent }}
              />
              <p className="mt-4 text-sm" style={{ color: c.muted }}>正在验证测试链接...</p>
            </motion.div>
          )}

          {/* ═══ invalid ═══ */}
          {phase === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-[88svh] flex-col items-center justify-center text-center"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#c9554a]/10">
                <AlertCircle className="h-8 w-8 text-[#c9554a]" />
              </div>
              <h2 className="mb-2 text-xl font-bold" style={{ color: c.dark }}>
                测试链接无效
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: c.muted }}>
                该测试链接无效或已失效<br />请联系测试发起人获取正确的链接
              </p>
            </motion.div>
          )}

          {/* ═══ start ═══ */}
          {phase === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-[88svh] flex-col justify-center"
            >
              <DiscLogo />

              <div className="mb-8 text-center">
                <h1 className="mb-3 text-[26px] font-bold tracking-tight" style={{ color: c.dark }}>
                  DISC 性格测试
                </h1>
                <p className="text-[13px] leading-loose" style={{ color: c.muted }}>
                  本测试共 {TOTAL} 题，每题描述一个工作场景<br />
                  请分别选出最符合和最不符合您的做法<br />
                  测试大约需要 10–15 分钟
                </p>
              </div>

              {/* 表单卡片 */}
              <div className="space-y-4 rounded-2xl bg-white/70 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                <Field label="姓名" error={nameErr}>
                  <Input
                    className="h-12 w-full rounded-xl bg-white px-4 text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none ring-1 ring-inset ring-black/[0.06] transition-shadow focus:ring-2 focus:ring-[#0064FA]/40"
                    style={{ color: c.text }}
                    placeholder="请输入您的姓名"
                    autoComplete="name"
                    value={name}
                    onChange={(value) => { setName(value); if (nameErr) setNameErr('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  />
                </Field>

                <Field label="手机号" error={phoneErr}>
                  <Input
                    className="h-12 w-full rounded-xl bg-white px-4 text-[15px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none ring-1 ring-inset ring-black/[0.06] transition-shadow focus:ring-2 focus:ring-[#0064FA]/40"
                    style={{ color: c.text }}
                    placeholder="请输入您的手机号"
                    inputMode="tel" autoComplete="tel"
                    value={phone}
                    onChange={(value) => { setPhone(value); if (phoneErr) setPhoneErr('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  />
                </Field>

                <SemiButton
                  theme="solid"
                  className="h-12 w-full cursor-pointer rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98] motion-reduce:active:scale-100"
                  style={cta}
                  onClick={handleStart}
                >
                  开始测试
                </SemiButton>
              </div>
            </motion.div>
          )}

          {/* ═══ test ═══ */}
          {phase === 'test' && (
            <motion.div
              key={`q-${idx}`}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* 顶部提示 + 进度条 */}
              <div className="mb-6">
                <div className="mb-4 flex items-center justify-center gap-5 rounded-xl bg-white/60 px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#5e7043]">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#788c5d] text-white">
                      <ThumbsUp className="h-2.5 w-2.5" />
                    </span>
                    选一个最符合
                  </span>
                  <span className="text-[#e8e6dc]">+</span>
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#a8433a]">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#c9554a] text-white">
                      <ThumbsDown className="h-2.5 w-2.5" />
                    </span>
                    选一个最不符合
                  </span>
                </div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-medium" style={{ color: c.muted }}>
                    已完成 {done} / {TOTAL}
                  </span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: c.accent }}>
                    {Math.round((done / TOTAL) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: c.sand }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${c.accent}, #0050C8)` }}
                    initial={false}
                    animate={{ width: `${(done / TOTAL) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* 题目卡片 */}
              <DiscQuestionCard
                question={DISC_QUESTIONS[idx]}
                answer={cur}
                onAnswer={(a) => setAnswers((p) => { const n = [...p]; n[idx] = a; return n })}
              />

              {/* 底部留白，防止固定导航栏遮挡内容 */}
              <div className="h-20" />
            </motion.div>
          )}

          {/* ═══ done ═══ */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex min-h-[88svh] flex-col items-center justify-center text-center"
            >
              <CompletionAnimation />

              <motion.h2
                className="mb-2.5 text-[22px] font-bold tracking-tight"
                style={{ color: c.dark }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                测试完成
              </motion.h2>

              <motion.p
                className="text-[15px]"
                style={{ color: c.muted }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {name}，感谢您完成 DISC 性格测试
              </motion.p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── 固定底部导航栏（仅 test 阶段） ── */}
      {phase === 'test' && (
        <div className="fixed inset-x-0 bottom-0 z-30">
          {/* 渐变遮罩 */}
          <div
            className="pointer-events-none h-6"
            style={{ background: `linear-gradient(to bottom, transparent, ${c.sand}80)` }}
          />
          <div
            className="px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6"
            style={{ backgroundColor: `${c.sand}e6`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          >
            <div className="mx-auto flex max-w-md gap-3">
              <NavBtn
                disabled={idx === 0}
                onClick={() => go(-1)}
                style={idx === 0 ? { ...ctaOff, opacity: 0.45 } : { backgroundColor: '#fff', color: c.text, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <ChevronLeft className="h-4 w-4" />
                上一题
              </NavBtn>

              {isLast ? (
                <NavBtn
                  disabled={!allOk || submitting}
                  onClick={handleSubmit}
                  style={allOk && !submitting ? cta : ctaOff}
                >
                  {submitting ? '提交中...' : '提交测试'}
                  {!submitting && <Send className="h-4 w-4" />}
                </NavBtn>
              ) : (
                <NavBtn
                  disabled={!curOk}
                  onClick={() => go(1)}
                  style={curOk ? cta : ctaOff}
                >
                  下一题
                  <ChevronRight className="h-4 w-4" />
                </NavBtn>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── 表单字段 ─── */
function Field({ label, error, children }: { label: string; error: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: '#3d3d3a' }}>
        {label} <span className="text-[#c9554a]">*</span>
      </label>
      {children}
      {error && <p className="text-xs text-[#c9554a]">{error}</p>}
    </div>
  )
}

/* ─── 导航按钮 ─── */
function NavBtn({
  disabled, onClick, style, children,
}: {
  disabled: boolean
  onClick: () => void
  style: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <SemiButton
      theme="solid"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-12 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-semibold',
        'outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#0064FA]/40 focus-visible:ring-offset-1',
        'motion-reduce:transition-none',
        disabled ? 'pointer-events-none' : 'cursor-pointer active:scale-[0.97] motion-reduce:active:scale-100',
      )}
      style={style}
    >
      {children}
    </SemiButton>
  )
}
