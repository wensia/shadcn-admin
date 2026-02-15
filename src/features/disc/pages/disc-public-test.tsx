/**
 * DISC 性格测试公开页 - 移动端优先 + Anthropic 品牌配色
 *
 * Anthropic Brand Colors:
 *   Dark #141413 | Light #faf9f5 | Mid Gray #b0aea5 | Light Gray #e8e6dc
 *   Orange #d97757 | Blue #6a9bcc | Green #788c5d
 * Typography: Poppins (headings) + Lora (body) with system fallbacks
 */

import { useState, useCallback } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DISC_QUESTIONS } from '../data/questions'
import { submitDiscTest } from '../api'
import { DiscQuestionCard } from '../components/disc-question-card'
import type { DISCAnswer } from '../types'

type Phase = 'start' | 'test' | 'done'

const TOTAL = DISC_QUESTIONS.length
const PHONE_REGEX = /^1[3-9]\d{9}$/

function createEmptyAnswers(): DISCAnswer[] {
  return Array.from({ length: TOTAL }, () => ({ most: null, least: null }))
}

/* ─── Anthropic Brand Tokens ─── */
const brand = {
  dark: '#141413',
  light: '#faf9f5',
  midGray: '#b0aea5',
  lightGray: '#e8e6dc',
  orange: '#d97757',
  blue: '#6a9bcc',
  green: '#788c5d',
} as const

const fontHeading = "'Poppins', Arial, sans-serif"

/* ─── DISC 四维 Logo (使用 Anthropic 配色) ─── */
const DISC_BADGES = [
  { letter: 'D', color: brand.orange, label: '支配' },
  { letter: 'I', color: brand.blue, label: '影响' },
  { letter: 'S', color: brand.green, label: '稳健' },
  { letter: 'C', color: brand.dark, label: '服从' },
] as const

function DiscLogo() {
  return (
    <div className="mb-8 flex justify-center gap-3">
      {DISC_BADGES.map((item, i) => (
        <motion.div
          key={item.letter}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.15 + i * 0.08,
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          className="flex flex-col items-center gap-1.5"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold shadow-lg"
            style={{
              backgroundColor: item.color,
              color: item.color === brand.dark ? brand.light : '#fff',
              fontFamily: fontHeading,
            }}
          >
            {item.letter}
          </div>
          <span className="text-[10px] font-medium" style={{ color: brand.midGray }}>
            {item.label}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── 动画 SVG 对勾 ─── */
function AnimatedCheckmark() {
  return (
    <motion.svg viewBox="0 0 100 100" className="mb-8 h-28 w-28">
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={brand.green}
        strokeWidth="2.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      />
      <motion.path
        d="M30 52 L44 66 L70 36"
        fill="none"
        stroke={brand.green}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}

/* ─── 主组件 ─── */
export function DiscPublicTest() {
  const search = useSearch({ from: '/disc-test' })

  const [phase, setPhase] = useState<Phase>('start')
  const [name, setName] = useState(search.name ?? '')
  const [phone, setPhone] = useState(search.phone ?? '')
  const [nameError, setNameError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<DISCAnswer[]>(createEmptyAnswers)
  const [submitting, setSubmitting] = useState(false)
  const [direction, setDirection] = useState(1)

  const validateStart = useCallback(() => {
    let valid = true
    if (!name.trim()) {
      setNameError('请输入姓名')
      valid = false
    } else {
      setNameError('')
    }
    if (!phone.trim()) {
      setPhoneError('请输入手机号')
      valid = false
    } else if (!PHONE_REGEX.test(phone.trim())) {
      setPhoneError('请输入正确的手机号')
      valid = false
    } else {
      setPhoneError('')
    }
    return valid
  }, [name, phone])

  const handleStart = () => {
    if (validateStart()) setPhase('test')
  }

  const handleAnswer = (answer: DISCAnswer) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[currentIndex] = answer
      return next
    })
  }

  const currentAnswer = answers[currentIndex]
  const isCurrentComplete =
    currentAnswer.most !== null && currentAnswer.least !== null
  const allComplete = answers.every(
    (a) => a.most !== null && a.least !== null
  )
  const isLast = currentIndex === TOTAL - 1
  const completedCount = answers.filter(
    (a) => a.most !== null && a.least !== null
  ).length

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex((i) => i - 1)
    }
  }

  const handleNext = () => {
    if (isCurrentComplete && !isLast) {
      setDirection(1)
      setCurrentIndex((i) => i + 1)
    }
  }

  const handleSubmit = async () => {
    if (!allComplete || submitting) return
    setSubmitting(true)
    try {
      await submitDiscTest({
        name: name.trim(),
        phone: phone.trim(),
        answers,
        appointment_id: search.appointment_id,
      })
      setPhase('done')
    } catch {
      toast.error('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── 按钮样式 ─── */
  const ctaStyle = {
    background: `linear-gradient(135deg, ${brand.orange}, #c4654a)`,
    color: '#fff',
    boxShadow: '0 4px 14px rgba(217,119,87,0.25)',
  }

  const ctaDisabledStyle = {
    backgroundColor: brand.lightGray,
    color: brand.midGray,
  }

  return (
    <div
      className="min-h-svh px-5 py-6 sm:px-6"
      style={{
        background: `linear-gradient(170deg, ${brand.light} 0%, #f0ede6 50%, ${brand.lightGray} 100%)`,
      }}
    >
      <div className="mx-auto max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          {/* ═══ 开始页 ═══ */}
          {phase === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-[88svh] flex-col justify-center"
            >
              <DiscLogo />

              <div className="mb-8 text-center">
                <h1
                  className="mb-3 text-[28px] font-bold tracking-tight"
                  style={{ color: brand.dark, fontFamily: fontHeading }}
                >
                  DISC 性格测试
                </h1>
                <p
                  className="text-sm leading-loose"
                  style={{ color: brand.midGray }}
                >
                  本测试共 {TOTAL} 题，每题有 4 个描述
                  <br />
                  请分别选出最符合和最不符合您的描述
                  <br />
                  测试大约需要 5–10 分钟
                </p>
              </div>

              <div
                className="space-y-4 rounded-3xl p-6 shadow-sm backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  boxShadow: `0 0 0 1px ${brand.lightGray}`,
                }}
              >
                <div className="space-y-1.5">
                  <label
                    className="text-sm font-medium"
                    style={{ color: brand.dark }}
                  >
                    姓名 <span style={{ color: '#c9554a' }}>*</span>
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border-2 bg-white px-4 text-[15px] outline-none transition-colors"
                    style={{
                      borderColor: brand.lightGray,
                      color: brand.dark,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = brand.orange)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = brand.lightGray)}
                    placeholder="请输入您的姓名"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (nameError) setNameError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  />
                  {nameError && (
                    <p className="text-xs" style={{ color: '#c9554a' }}>
                      {nameError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    className="text-sm font-medium"
                    style={{ color: brand.dark }}
                  >
                    手机号 <span style={{ color: '#c9554a' }}>*</span>
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border-2 bg-white px-4 text-[15px] outline-none transition-colors"
                    style={{
                      borderColor: brand.lightGray,
                      color: brand.dark,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = brand.orange)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = brand.lightGray)}
                    placeholder="请输入您的手机号"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (phoneError) setPhoneError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  />
                  {phoneError && (
                    <p className="text-xs" style={{ color: '#c9554a' }}>
                      {phoneError}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="h-12 w-full rounded-xl text-base font-semibold transition-all active:scale-[0.98]"
                  style={ctaStyle}
                  onClick={handleStart}
                >
                  开始测试
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ 答题页 ═══ */}
          {phase === 'test' && (
            <motion.div
              key={`q-${currentIndex}`}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -50 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* 进度条 */}
              <div className="mb-6">
                <div className="mb-2 flex items-baseline justify-between">
                  <span
                    className="text-xs font-medium"
                    style={{ color: brand.midGray }}
                  >
                    已完成 {completedCount} / {TOTAL} 题
                  </span>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: brand.orange }}
                  >
                    {Math.round((completedCount / TOTAL) * 100)}%
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ backgroundColor: brand.lightGray }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${brand.orange}, #c4654a)`,
                    }}
                    initial={false}
                    animate={{
                      width: `${(completedCount / TOTAL) * 100}%`,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* 题目卡片 */}
              <DiscQuestionCard
                question={DISC_QUESTIONS[currentIndex]}
                answer={currentAnswer}
                onAnswer={handleAnswer}
              />

              {/* 导航按钮 */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  className={cn(
                    'flex h-12 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-semibold transition-all',
                    currentIndex === 0
                      ? 'pointer-events-none'
                      : 'active:scale-[0.97]'
                  )}
                  style={
                    currentIndex === 0
                      ? { backgroundColor: brand.lightGray, color: brand.midGray, opacity: 0.5 }
                      : {
                          backgroundColor: '#fff',
                          color: brand.dark,
                          boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px ${brand.lightGray}`,
                        }
                  }
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一题
                </button>

                {isLast ? (
                  <button
                    type="button"
                    className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                    style={allComplete && !submitting ? ctaStyle : ctaDisabledStyle}
                    onClick={handleSubmit}
                    disabled={!allComplete || submitting}
                  >
                    {submitting ? '提交中...' : '提交测试'}
                    {!submitting && <Send className="h-4 w-4" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex h-12 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                    style={isCurrentComplete ? ctaStyle : ctaDisabledStyle}
                    onClick={handleNext}
                    disabled={!isCurrentComplete}
                  >
                    下一题
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ 完成页 ═══ */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-h-[88svh] flex-col items-center justify-center text-center"
            >
              <AnimatedCheckmark />

              <motion.h2
                className="mb-3 text-2xl font-bold"
                style={{ color: brand.dark, fontFamily: fontHeading }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                测试完成
              </motion.h2>

              <motion.p
                style={{ color: brand.midGray }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                {name}，感谢您完成 DISC 性格测试！
              </motion.p>

              <motion.p
                className="mt-2 text-sm"
                style={{ color: brand.midGray, opacity: 0.7 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.9 }}
              >
                HR 将在面试流程中参考您的测试数据
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
