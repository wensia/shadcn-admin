import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { AnimatePresence, motion } from 'motion/react'
import {
  ASP_MEMORY_TASKS,
  ASP_PREFERENCE_QUESTIONS,
  ASP_SCALE_OPTIONS,
  ASP_SCALE_QUESTIONS,
  ASP_STAGE_PROFILES,
  ASP_DIGIT_SPAN,
  ASP_SENTENCE_WORDS,
  ASP_WORD_TRANSFORM,
  ASP_STYLE_QUESTIONS,
  ASP_SENSORY_QUESTIONS,
  type AspStageId,
} from '../data/assessment'

/* ═══════════════════════════════════════════════════════════════
   Nothing Design — Light Mode Tokens (Student-Adapted)
   Printed technical manual. Off-white paper, black ink.
   Chinese labels for student readability.
   ═══════════════════════════════════════════════════════════════ */

const N = {
  bg: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceRaised: '#F0EFE8',
  border: '#E8E6E0',
  borderVisible: '#CCC9C0',
  textDisplay: '#1A1A18',
  textPrimary: '#2A2A28',
  textSecondary: '#787870',
  textDisabled: '#A0A098',
  accent: '#E8750A',
  accentSubtle: 'rgba(232,117,10,0.10)',
  success: '#3D9A50',
  warning: '#D4A020',
  interactive: '#E8750A',
} as const

const FONT = {
  display: 'var(--font-mono-local)',
  body: 'var(--font-sans-local)',
  mono: 'var(--font-mono-local)',
} as const

/* ═══════════════════════════════════════════════════════════════ */

const STEPS = [
  { label: '起始档案', tag: '01' },
  { label: '闪测记忆', tag: '02' },
  { label: '思维测试', tag: '03' },
  { label: '学习状态', tag: '04' },
  { label: '学习风格', tag: '05' },
  { label: '感官偏好', tag: '06' },
  { label: '偏好画像', tag: '07' },
  { label: '学科画像', tag: '08' },
  { label: '结果报告', tag: '09' },
]

function band(s: number) { return s >= 85 ? '优秀' : s >= 70 ? '良好' : s >= 55 ? '中等' : '待提升' }
function bandColor(s: number) { return s >= 85 ? N.success : s >= 70 ? N.textPrimary : s >= 55 ? N.warning : N.accent }

function DisplayText({ text }: { text: string }) {
  const parts = text.split('___')
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts[0]}
      <svg width="60" height="4" viewBox="0 0 60 4" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 2px' }}>
        <rect x="0" y="1" width="60" height="2" rx="1" fill="currentColor" />
      </svg>
      {parts[1]}
    </>
  )
}

type AspResult = {
  memoryScore: number
  executionScore: number
  resilienceScore: number
  subjectScore: number
  overallScore: number
  preferenceTraits: string[]
  strongSubjects: { id: string; name: string; rating: number; topics: string[] }[]
  relativeWeakSubjects: { id: string; name: string; rating: number; gap: number; topics: string[]; reason: string }[]
  psychWeakSubjects: { id: string; name: string; rating: number; riskLevel: string; reason: string }[]
  report: { title: string; paragraphs: string[] }[]
}

const mkMemPhases = () => Object.fromEntries(ASP_MEMORY_TASKS.map((t) => [t.id, 'ready' as const])) as Record<string, 'ready' | 'memorizing' | 'recall'>
const mkMemCountdowns = () => Object.fromEntries(ASP_MEMORY_TASKS.map((t) => [t.id, t.memorizeSeconds])) as Record<string, number>
const mkMemAnswers = () => Object.fromEntries(ASP_MEMORY_TASKS.map((t) => [t.id, ''])) as Record<string, string>
const mkScaleAnswers = () => Object.fromEntries(ASP_SCALE_QUESTIONS.map((q) => [q.id, 0])) as Record<string, number>
const mkPrefAnswers = () => Object.fromEntries(ASP_PREFERENCE_QUESTIONS.map((q) => [q.id, ''])) as Record<string, string>
const mkSubjectRatings = (sid: AspStageId) => {
  const stage = ASP_STAGE_PROFILES.find((s) => s.id === sid) ?? ASP_STAGE_PROFILES[0]
  return Object.fromEntries(stage.subjects.map((s) => [s.id, 0])) as Record<string, number>
}

/* ═══════════════════════════════════════════════════════════════
   UI Atoms — Nothing Light, Student-adapted
   ═══════════════════════════════════════════════════════════════ */

/** Mono label — smaller, secondary, used for metadata */
function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontFamily: FONT.mono, fontSize: 11, lineHeight: 1.2,
      letterSpacing: '0.06em', color: N.textSecondary, ...style,
    }}>{children}</span>
  )
}

/** Segmented progress bar — the Nothing signature */
function SegmentedProgress({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4,
          background: i <= current ? N.accent : N.border,
          transition: 'background 200ms ease-out',
        }} />
      ))}
    </div>
  )
}

/** Circle timer — mechanical instrument style */
function CircleTimer({ seconds, total }: { seconds: number; total: number }) {
  const size = 120, r = 48, circ = 2 * Math.PI * r
  const off = circ * (1 - seconds / total)
  const ticks = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * 360 - 90, rad = (angle * Math.PI) / 180
    return {
      x1: size / 2 + (r + 6) * Math.cos(rad), y1: size / 2 + (r + 6) * Math.sin(rad),
      x2: size / 2 + (r + 10) * Math.cos(rad), y2: size / 2 + (r + 10) * Math.sin(rad),
    }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={N.borderVisible} strokeWidth={1.5} />)}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={N.border} strokeWidth={2} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={N.textDisplay} strokeWidth={2}
        strokeDasharray={circ} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }} />
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="middle"
        fill={N.textDisplay} fontSize={36} fontFamily={FONT.mono} fontWeight={400}>{seconds}</text>
      <text x={size / 2} y={size / 2 + 18} textAnchor="middle"
        fill={N.textSecondary} fontSize={10} fontFamily={FONT.mono} letterSpacing="0.06em">秒</text>
    </svg>
  )
}

/** Score gauge — the instrument dial */
function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const r = (size - 16) / 2, circ = 2 * Math.PI * r
  const off = circ * (1 - score / 100), color = bandColor(score)
  const ticks = Array.from({ length: 20 }).map((_, i) => {
    const angle = (i / 20) * 360 - 90, rad = (angle * Math.PI) / 180
    return {
      x1: size / 2 + (r + 4) * Math.cos(rad), y1: size / 2 + (r + 4) * Math.sin(rad),
      x2: size / 2 + (r + 7) * Math.cos(rad), y2: size / 2 + (r + 7) * Math.sin(rad),
    }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={N.border} strokeWidth={1} />)}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={N.border} strokeWidth={2} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: off }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ strokeDasharray: circ, transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.3} fontFamily={FONT.display} fontWeight={400}>{score}</text>
    </svg>
  )
}

/** Segmented metric bar — the signature data viz */
function MetricBar({ label, score, delay = 0 }: { label: string; score: number; delay?: number }) {
  const segments = 20, filled = Math.round((score / 100) * segments), color = bandColor(score)
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 400, color: N.textSecondary }}>{label}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 14, color, fontWeight: 400 }}>
          {score}<span style={{ fontSize: 10, color: N.textSecondary, marginLeft: 4 }}>/ 100</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: delay + i * 0.02, duration: 0.15 }}
            style={{ flex: 1, height: 8, background: i < filled ? color : '#E0E0E0' }} />
        ))}
      </div>
    </div>
  )
}

/** Tag recall input */
function TagRecallInput({ tags, onChange, placeholder, total }: {
  tags: string[]; onChange: (t: string[]) => void; placeholder: string; total: number
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  function add() {
    const v = input.trim()
    if (!v || tags.some((t) => t.toLowerCase() === v.toLowerCase())) { setInput(''); return }
    onChange([...tags, v]); setInput(''); inputRef.current?.focus()
  }
  function remove(i: number) { onChange(tags.filter((_, idx) => idx !== i)) }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && tags.length) remove(tags.length - 1)
  }
  return (
    <div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {tags.map((tag, i) => (
            <motion.div key={`${tag}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                border: `1px solid ${N.borderVisible}`, borderRadius: 4,
                fontFamily: FONT.mono, fontSize: 13, color: N.textPrimary }}>
                {tag}
                <span onClick={() => remove(i)} style={{ cursor: 'pointer', color: N.textDisabled, fontSize: 14, lineHeight: 1 }}>&times;</span>
              </span>
            </motion.div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
          placeholder={tags.length ? '继续输入…' : placeholder}
          style={{ flex: 1, height: 44, padding: '0 12px', border: 'none', borderBottom: `1px solid ${N.borderVisible}`,
            background: 'transparent', fontFamily: FONT.mono, fontSize: 14, color: N.textPrimary, outline: 'none' }}
          onFocus={(e) => { e.target.style.borderBottomColor = N.textPrimary }}
          onBlur={(e) => { e.target.style.borderBottomColor = N.borderVisible }} />
        <button onClick={add} disabled={!input.trim()} style={{
          height: 44, padding: '0 24px', border: `1px solid ${N.borderVisible}`, borderRadius: 999,
          background: 'transparent', fontFamily: FONT.body, fontSize: 13, letterSpacing: '0.02em',
          color: input.trim() ? N.textPrimary : N.textDisabled, cursor: input.trim() ? 'pointer' : 'default', transition: 'all 200ms',
        }}>添加</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <Label>已回忆 {tags.length}</Label>
        <Label>共 {total} 个</Label>
      </div>
    </div>
  )
}

/** Nothing-style pill button — Chinese labels */
function NButton({ children, primary, disabled, loading, block, onClick, style: extraStyle }: {
  children: React.ReactNode; primary?: boolean; disabled?: boolean; loading?: boolean
  block?: boolean; onClick?: () => void; style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    height: 48, padding: '0 32px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 999, fontFamily: FONT.body, fontSize: 14, fontWeight: 500, letterSpacing: '0.02em',
    cursor: disabled ? 'default' : 'pointer', transition: 'all 200ms ease-out', border: 'none',
    width: block ? '100%' : undefined,
    ...(primary
      ? { background: disabled ? N.textDisabled : N.accent, color: '#FFFFFF', opacity: disabled ? 0.4 : 1 }
      : { background: 'transparent', border: `1px solid ${disabled ? N.border : N.borderVisible}`, color: disabled ? N.textDisabled : N.textPrimary }),
    ...extraStyle,
  }
  return (
    <button onClick={disabled || loading ? undefined : onClick} style={base}>
      {loading && <span style={{ display: 'inline-block', width: 14, height: 14,
        border: `2px solid ${primary ? N.bg : N.textSecondary}`, borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'nothing-spin 0.8s linear infinite' }} />}
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

export function AspPublicTest() {
  useDocumentTitle('ASP 学习风格测评')

  useEffect(() => {
    if (!document.getElementById('nothing-keyframes')) {
      const style = document.createElement('style')
      style.id = 'nothing-keyframes'
      style.textContent = '@keyframes nothing-spin { to { transform: rotate(360deg) } }'
      document.head.appendChild(style)
    }
  }, [])

  const [step, setStep] = useState(0)
  const [studentName, setStudentName] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [stageId, setStageId] = useState<AspStageId>('junior')
  const [memPhases, setMemPhases] = useState(mkMemPhases)
  const [memCountdowns, setMemCountdowns] = useState(mkMemCountdowns)
  const [memAnswers, setMemAnswers] = useState(mkMemAnswers)
  const [flashIdx, setFlashIdx] = useState(0)
  const [scaleAnswers, setScaleAnswers] = useState(mkScaleAnswers)
  const [prefAnswers, setPrefAnswers] = useState(mkPrefAnswers)
  const [subjectRatings, setSubjectRatings] = useState<Record<string, number>>(() => mkSubjectRatings('junior'))
  const [aspResult, setAspResult] = useState<AspResult | null>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [phoneDup, setPhoneDup] = useState<boolean | null>(null)
  const [phoneChecking, setPhoneChecking] = useState(false)
  // THINK step
  const [thinkIdx, setThinkIdx] = useState(0)
  const [digitSpanAnswers, setDigitSpanAnswers] = useState<Record<string, string>>({})
  const [digitSpanPhase, setDigitSpanPhase] = useState<'ready' | 'showing' | 'recall'>('ready')
  const [digitSpanDigitIdx, setDigitSpanDigitIdx] = useState(-1)
  const [digitSpanBlank, setDigitSpanBlank] = useState(false)
  const [digitSpanSeqIdx, setDigitSpanSeqIdx] = useState(0)
  const [sentenceAnswer, setSentenceAnswer] = useState('')
  const [wordTransformAnswers, setWordTransformAnswers] = useState<string[]>([])
  const [wordTransformPhase, setWordTransformPhase] = useState<'ready' | 'active' | 'done'>('ready')
  const [wordTransformCountdown, setWordTransformCountdown] = useState(60)
  // STYLE step
  const [styleAnswers, setStyleAnswers] = useState<Record<string, { most: string; like: string; least: string }>>({})
  // SENSE step
  const [senseAnswers, setSenseAnswers] = useState<Record<string, string>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const stageProfile = useMemo(() => ASP_STAGE_PROFILES.find((s) => s.id === stageId) ?? ASP_STAGE_PROFILES[0], [stageId])

  useEffect(() => { setSubjectRatings(mkSubjectRatings(stageId)) }, [stageId])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }, [step, flashIdx, thinkIdx])

  useEffect(() => {
    const task = ASP_MEMORY_TASKS[flashIdx]; if (!task) return
    if (memPhases[task.id] !== 'memorizing') return
    if (memCountdowns[task.id] <= 0) { setMemPhases((p) => ({ ...p, [task.id]: 'recall' })); return }
    const t = setTimeout(() => setMemCountdowns((c) => ({ ...c, [task.id]: c[task.id] - 1 })), 1000)
    return () => clearTimeout(t)
  }, [flashIdx, memPhases, memCountdowns])

  // 数字广度逐字显示定时器（数字800ms → 空白200ms → 下一个）
  useEffect(() => {
    if (digitSpanPhase !== 'showing') return
    if (thinkIdx > 1) return
    const group = ASP_DIGIT_SPAN[thinkIdx]
    if (!group) return
    const seq = group.sequences[digitSpanSeqIdx]
    if (!seq) return
    if (digitSpanBlank) {
      // 空白阶段200ms后显示下一个数字
      const t = setTimeout(() => { setDigitSpanBlank(false); setDigitSpanDigitIdx(i => i + 1) }, 200)
      return () => clearTimeout(t)
    }
    if (digitSpanDigitIdx >= seq.digits.length - 1) {
      const t = setTimeout(() => setDigitSpanPhase('recall'), 800)
      return () => clearTimeout(t)
    }
    // 显示当前数字800ms后进入空白
    const t = setTimeout(() => setDigitSpanBlank(true), 800)
    return () => clearTimeout(t)
  }, [digitSpanPhase, digitSpanDigitIdx, digitSpanBlank, thinkIdx, digitSpanSeqIdx])

  // 日字加一笔倒计时
  useEffect(() => {
    if (wordTransformPhase !== 'active') return
    if (wordTransformCountdown <= 0) { setWordTransformPhase('done'); return }
    const t = setTimeout(() => setWordTransformCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [wordTransformPhase, wordTransformCountdown])

  useEffect(() => {
    const phone = studentPhone.trim()
    if (!/^1\d{10}$/.test(phone)) { setPhoneDup(null); return }
    setPhoneChecking(true)
    const ctrl = new AbortController()
    fetch(`/api/v1/public/asp-test/check-phone?phone=${phone}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { setPhoneDup(d.data?.exists ?? false); setPhoneChecking(false) })
      .catch(() => { setPhoneChecking(false) })
    return () => ctrl.abort()
  }, [studentPhone])

  const introOk = studentName.trim().length > 0 && /^1\d{10}$/.test(studentPhone.trim()) && phoneDup === false
  const flashOk = ASP_MEMORY_TASKS.every((t) => memAnswers[t.id]?.trim())
  const scaleOk = ASP_SCALE_QUESTIONS.every((q) => scaleAnswers[q.id] > 0)
  const prefOk = ASP_PREFERENCE_QUESTIONS.every((q) => prefAnswers[q.id])
  const subjectOk = stageProfile.subjects.every((s) => subjectRatings[s.id] > 0)
  const thinkOk = ASP_DIGIT_SPAN.every(g => g.sequences.every(s => digitSpanAnswers[s.id]?.trim())) && sentenceAnswer.trim().length > 0 && wordTransformPhase === 'done'
  const styleOk = ASP_STYLE_QUESTIONS.every(q => { const a = styleAnswers[q.id]; return a && a.most && a.like && a.least })
  const senseOk = ASP_SENSORY_QUESTIONS.every(q => senseAnswers[q.id])
  const ready = [introOk, flashOk, thinkOk, scaleOk, styleOk, senseOk, prefOk, subjectOk, true]
  const R = aspResult

  function startFlash() {
    const task = ASP_MEMORY_TASKS[flashIdx]
    if (!task || task.memorizeSeconds <= 0) { setMemPhases((p) => ({ ...p, [task.id]: 'recall' })); return }
    setMemPhases((p) => ({ ...p, [task.id]: 'memorizing' }))
  }

  async function submitAndShow() {
    if (submitState === 'loading') return
    setSubmitState('loading')
    try {
      const resp = await fetch('/api/v1/public/asp-test/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentName, phone: studentPhone, stage: stageId, memory_answers: memAnswers, scale_answers: scaleAnswers, preference_answers: prefAnswers, subject_ratings: subjectRatings, digit_span_answers: digitSpanAnswers, sentence_answer: sentenceAnswer, word_transform_answers: wordTransformAnswers, style_answers: styleAnswers, sensory_answers: senseAnswers }),
      })
      const data = await resp.json()
      if (data.success && data.data?.result) {
        setAspResult(data.data.result as AspResult); setSubmitState('done'); setStep(8)
      } else { setSubmitState('error') }
    } catch { setSubmitState('error') }
  }

  function goNext() { if (step === 7) { submitAndShow(); return }; if (step < 8) setStep(step + 1) }
  function goPrev() { if (step > 0) setStep(step - 1) }

  const resetAll = useCallback(() => {
    setStep(0); setStudentName(''); setStudentPhone(''); setStageId('junior')
    setMemPhases(mkMemPhases); setMemCountdowns(mkMemCountdowns); setMemAnswers(mkMemAnswers); setFlashIdx(0)
    setScaleAnswers(mkScaleAnswers); setPrefAnswers(mkPrefAnswers)
    setSubjectRatings(mkSubjectRatings('junior')); setAspResult(null); setSubmitState('idle')
    setPhoneDup(null); setPhoneChecking(false)
    setThinkIdx(0); setDigitSpanAnswers({}); setDigitSpanPhase('ready'); setDigitSpanDigitIdx(-1); setDigitSpanBlank(false); setDigitSpanSeqIdx(0);
    setSentenceAnswer(''); setWordTransformAnswers([]); setWordTransformPhase('ready'); setWordTransformCountdown(60);
    setStyleAnswers({}); setSenseAnswers({});
  }, [])

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 0',
    border: 'none', borderBottom: `1px solid ${N.borderVisible}`,
    background: 'transparent', fontFamily: FONT.body, fontSize: 16, color: N.textPrimary, outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: N.bg, maxWidth: 480, margin: '0 auto', fontFamily: FONT.body }}>

      {/* Header */}
      <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 16px 16px' }}>
        <SegmentedProgress current={step} total={STEPS.length} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 12 }}>
          <Label>{STEPS[step].tag}</Label>
          <Label style={{ color: N.textDisabled }}>{String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</Label>
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 24, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.2, color: N.textDisplay, marginTop: 4 }}>
          {STEPS[step].label}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={step === 1 ? `f-${flashIdx}` : step === 2 ? `t-${thinkIdx}` : step}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}>

            {/* Step 0: Intro */}
            {step === 0 && (
              <div style={{ paddingTop: 32 }}>
                <div style={{ marginBottom: 48 }}>
                  <div style={{ fontFamily: FONT.display, fontSize: 48, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.02em', color: N.textDisplay }}>
                    学习力
                  </div>
                  <div style={{ fontFamily: FONT.display, fontSize: 48, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.02em', color: N.textDisplay }}>
                    探索
                  </div>
                  <div style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 300, color: N.textSecondary, marginTop: 12, lineHeight: 1.5 }}>
                    通过 8 个维度，发现你独特的学习方式
                  </div>
                </div>

                <div style={{ marginBottom: 32 }}>
                  <Label>姓名</Label>
                  <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="输入姓名" style={{ ...inputStyle, marginTop: 8, marginBottom: 24 }}
                    onFocus={(e) => { e.target.style.borderBottomColor = N.textPrimary }}
                    onBlur={(e) => { e.target.style.borderBottomColor = N.borderVisible }} />

                  <Label>手机号</Label>
                  <input value={studentPhone} onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="输入手机号" maxLength={11} style={{ ...inputStyle, fontFamily: FONT.mono, marginTop: 8 }}
                    onFocus={(e) => { e.target.style.borderBottomColor = N.textPrimary }}
                    onBlur={(e) => { e.target.style.borderBottomColor = N.borderVisible }} />
                  {studentPhone && !/^1\d{10}$/.test(studentPhone) && (
                    <div style={{ fontFamily: FONT.body, fontSize: 12, color: N.accent, marginTop: 6 }}>请输入正确的11位手机号</div>
                  )}
                  {phoneChecking && <div style={{ fontFamily: FONT.body, fontSize: 12, color: N.textDisabled, marginTop: 6 }}>验证中...</div>}
                  {phoneDup === true && (
                    <div style={{ fontFamily: FONT.body, fontSize: 12, color: N.accent, marginTop: 6 }}>该手机号近期已提交过测评，30天内仅可提交一次</div>
                  )}
                </div>

                <Label>学段</Label>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {ASP_STAGE_PROFILES.map((s) => {
                    const active = stageId === s.id
                    return (
                      <div key={s.id} onClick={() => setStageId(s.id)} style={{
                        padding: '14px 16px', background: active ? N.surface : 'transparent',
                        borderLeft: active ? `2px solid ${N.accent}` : '2px solid transparent',
                        cursor: 'pointer', transition: 'all 200ms ease-out',
                      }}>
                        <div style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: active ? 500 : 400, color: active ? N.textDisplay : N.textSecondary, transition: 'color 200ms' }}>
                          {s.label}
                        </div>
                        <div style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 300, color: N.textDisabled, marginTop: 2 }}>{s.summary}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 1: Flash Memory */}
            {step === 1 && (() => {
              const task = ASP_MEMORY_TASKS[flashIdx]
              const phase = memPhases[task.id], cd = memCountdowns[task.id], ans = memAnswers[task.id] ?? ''
              return (
                <div style={{ paddingTop: 16 }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 24 }}>
                    {ASP_MEMORY_TASKS.map((_, i) => (
                      <div key={i} style={{ flex: i === flashIdx ? 3 : 1, height: 3, background: i <= flashIdx ? N.accent : N.border, transition: 'all 200ms' }} />
                    ))}
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: FONT.body, fontSize: 18, fontWeight: 400, color: N.textDisplay }}>{task.title}</div>
                    <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 300, color: N.textSecondary, marginTop: 4 }}>{task.instruction}</div>
                  </div>

                  {phase === 'ready' && (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <div style={{ fontFamily: FONT.display, fontSize: 36, fontWeight: 400, color: N.textDisplay, marginBottom: 32 }}>
                        {task.memorizeSeconds > 0 ? `${task.memorizeSeconds}s` : '?'}
                      </div>
                      <NButton primary onClick={startFlash}>{task.memorizeSeconds > 0 ? '开始记忆' : '开始'}</NButton>
                    </div>
                  )}

                  {phase === 'memorizing' && (
                    <div>
                      <CircleTimer seconds={cd} total={task.memorizeSeconds} />
                      <div style={{ marginTop: 24, padding: 24, background: N.surface, border: `1px solid ${N.border}`, borderRadius: 8, textAlign: 'center', fontFamily: FONT.mono, fontSize: 20, fontWeight: 400, letterSpacing: '0.04em', lineHeight: 1.8, color: N.textDisplay }}>
                        <DisplayText text={task.display} />
                      </div>
                      <Label style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>请认真记住上面的内容</Label>
                    </div>
                  )}

                  {phase === 'recall' && (
                    <div>
                      {task.memorizeSeconds === 0 && (
                        <div style={{ padding: 24, marginBottom: 24, background: N.surface, border: `1px solid ${N.border}`, borderRadius: 8, textAlign: 'center', fontFamily: FONT.mono, fontSize: 22, fontWeight: 400, letterSpacing: '0.06em', color: N.textDisplay }}>
                          <DisplayText text={task.display} />
                        </div>
                      )}
                      {task.expectedTokens ? (
                        <TagRecallInput tags={ans ? ans.split(',').filter(Boolean) : []}
                          onChange={(tags) => setMemAnswers((a) => ({ ...a, [task.id]: tags.join(',') }))}
                          placeholder={task.placeholder} total={task.expectedTokens.length} />
                      ) : (
                        <input value={ans} onChange={(e) => setMemAnswers((a) => ({ ...a, [task.id]: e.target.value }))}
                          placeholder={task.placeholder}
                          style={{ ...inputStyle, textAlign: 'center', fontFamily: FONT.mono, fontSize: 22, fontWeight: 400, letterSpacing: '0.04em' }}
                          onFocus={(e) => { e.target.style.borderBottomColor = N.textPrimary }}
                          onBlur={(e) => { e.target.style.borderBottomColor = N.borderVisible }} />
                      )}
                      <div style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 300, color: N.textDisabled, marginTop: 8 }}>{task.hint}</div>
                      {flashIdx < ASP_MEMORY_TASKS.length - 1 && ans.trim() && (
                        <NButton primary block onClick={() => setFlashIdx(flashIdx + 1)} style={{ marginTop: 24 }}>下一题 &rarr;</NButton>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ══════ 2. Think 思维测试 ══════ */}
            {step === 2 && (() => {
              const THINK_TASKS = [
                { title: ASP_DIGIT_SPAN[0].title, desc: ASP_DIGIT_SPAN[0].instruction },
                { title: ASP_DIGIT_SPAN[1].title, desc: ASP_DIGIT_SPAN[1].instruction },
                { title: '造句', desc: '从4个词语中任选2个，写一个完整的句子。' },
                { title: '日字加一笔', desc: `给"${ASP_WORD_TRANSFORM.baseChar}"字加一笔变成另一个字，限时${ASP_WORD_TRANSFORM.timeLimit}秒。` },
              ]
              const task = THINK_TASKS[thinkIdx]
              return (
                <div style={{ paddingTop: 16 }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 24 }}>
                    {THINK_TASKS.map((_, i) => (
                      <div key={i} style={{ flex: i === thinkIdx ? 3 : 1, height: 3, background: i <= thinkIdx ? N.accent : N.border, transition: 'all 200ms ease-out' }} />
                    ))}
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: FONT.body, fontSize: 18, fontWeight: 400, color: N.textDisplay }}>{task.title}</div>
                    <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 300, color: N.textSecondary, marginTop: 4 }}>{task.desc}</div>
                  </div>

                  {/* 数字广度 */}
                  {thinkIdx <= 1 && (() => {
                    const group = ASP_DIGIT_SPAN[thinkIdx]
                    const seq = group.sequences[digitSpanSeqIdx]
                    if (digitSpanPhase === 'ready') return (
                      <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <div style={{ fontFamily: FONT.mono, fontSize: 14, color: N.textSecondary, marginBottom: 16 }}>第 {digitSpanSeqIdx + 1} / {group.sequences.length} 组</div>
                        <NButton primary onClick={() => { setDigitSpanDigitIdx(-1); setDigitSpanBlank(false); setDigitSpanPhase('showing'); setTimeout(() => setDigitSpanDigitIdx(0), 500) }}>开始</NButton>
                      </div>
                    )
                    if (digitSpanPhase === 'showing') return (
                      <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <div style={{ fontFamily: FONT.display, fontSize: 64, fontWeight: 400, color: N.textDisplay, letterSpacing: '0.1em', minHeight: 80, opacity: digitSpanBlank ? 0 : 1, transition: 'opacity 100ms ease-out' }}>
                          {digitSpanDigitIdx >= 0 && digitSpanDigitIdx < seq.digits.length ? seq.digits[digitSpanDigitIdx] : ''}
                        </div>
                        <Label style={{ marginTop: 16 }}>{group.reverse ? '请记住并倒序' : '请记住顺序'}</Label>
                      </div>
                    )
                    return (
                      <div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 12, color: N.textSecondary, marginBottom: 8 }}>第 {digitSpanSeqIdx + 1} / {group.sequences.length} 组 — {group.reverse ? '请倒序写出' : '请按顺序写出'}</div>
                        <input value={digitSpanAnswers[seq.id] ?? ''} onChange={e => setDigitSpanAnswers(a => ({ ...a, [seq.id]: e.target.value.replace(/\D/g, '') }))} placeholder={group.reverse ? '倒序输入数字' : '输入记住的数字'} maxLength={6} style={{ width: '100%', height: 44, border: 'none', borderBottom: `1px solid ${N.borderVisible}`, background: 'transparent', fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.1em', textAlign: 'center', color: N.textPrimary, outline: 'none' }} />
                        {(digitSpanAnswers[seq.id]?.trim()) && digitSpanSeqIdx < group.sequences.length - 1 && (
                          <NButton primary block onClick={() => { setDigitSpanSeqIdx(digitSpanSeqIdx + 1); setDigitSpanPhase('ready') }} style={{ marginTop: 24 }}>下一组 →</NButton>
                        )}
                        {(digitSpanAnswers[seq.id]?.trim()) && digitSpanSeqIdx === group.sequences.length - 1 && thinkIdx < 3 && (
                          <NButton primary block onClick={() => { setThinkIdx(thinkIdx + 1); setDigitSpanSeqIdx(0); setDigitSpanPhase('ready') }} style={{ marginTop: 24 }}>下一题 →</NButton>
                        )}
                      </div>
                    )
                  })()}

                  {/* 造句 */}
                  {thinkIdx === 2 && (
                    <div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                        {ASP_SENTENCE_WORDS.map(w => (
                          <span key={w} style={{ fontFamily: FONT.mono, fontSize: 16, padding: '8px 20px', border: `1px solid ${N.borderVisible}`, borderRadius: 8, color: N.textDisplay }}>{w}</span>
                        ))}
                      </div>
                      <textarea value={sentenceAnswer} onChange={e => setSentenceAnswer(e.target.value)} placeholder="任选其中2个词语，写一个完整的句子" rows={3} style={{ width: '100%', padding: 12, border: `1px solid ${N.borderVisible}`, borderRadius: 8, background: 'transparent', fontFamily: FONT.body, fontSize: 14, color: N.textPrimary, outline: 'none', resize: 'none' }} />
                      {sentenceAnswer.trim() && <NButton primary block onClick={() => setThinkIdx(3)} style={{ marginTop: 24 }}>下一题 →</NButton>}
                    </div>
                  )}

                  {/* 日字加一笔 */}
                  {thinkIdx === 3 && (
                    <div>
                      {wordTransformPhase === 'ready' && (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                          <div style={{ fontFamily: FONT.display, fontSize: 72, fontWeight: 400, color: N.textDisplay, marginBottom: 24 }}>{ASP_WORD_TRANSFORM.baseChar}</div>
                          <NButton primary onClick={() => setWordTransformPhase('active')}>开始 ({ASP_WORD_TRANSFORM.timeLimit}秒)</NButton>
                        </div>
                      )}
                      {(wordTransformPhase === 'active' || wordTransformPhase === 'done') && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontFamily: FONT.display, fontSize: 40, color: N.textDisplay }}>{ASP_WORD_TRANSFORM.baseChar}</div>
                            {wordTransformPhase === 'active' && <CircleTimer seconds={wordTransformCountdown} total={ASP_WORD_TRANSFORM.timeLimit} />}
                            {wordTransformPhase === 'done' && <Label style={{ color: N.accent }}>时间到</Label>}
                          </div>
                          {wordTransformAnswers.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                              {wordTransformAnswers.map((ch, i) => {
                                const valid = (ASP_WORD_TRANSFORM.validAnswers as readonly string[]).includes(ch)
                                return (
                                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: `1px solid ${valid ? N.success : N.borderVisible}`, borderRadius: 4, fontFamily: FONT.body, fontSize: 18, color: valid ? N.success : N.textSecondary }}>
                                    {ch}
                                    {wordTransformPhase === 'active' && <span onClick={() => setWordTransformAnswers(a => a.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', color: N.textDisabled, fontSize: 14 }}>×</span>}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                          {wordTransformPhase === 'active' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input id="wt-input" maxLength={1} placeholder="输入一个字" style={{ flex: 1, height: 44, border: 'none', borderBottom: `1px solid ${N.borderVisible}`, background: 'transparent', fontFamily: FONT.body, fontSize: 18, color: N.textPrimary, outline: 'none', textAlign: 'center' }} onKeyDown={e => { if (e.key === 'Enter') { const el = e.target as HTMLInputElement; const v = el.value.trim(); if (v && !wordTransformAnswers.includes(v)) { setWordTransformAnswers(a => [...a, v]); el.value = '' } } }} />
                              <button onClick={() => { const el = document.getElementById('wt-input') as HTMLInputElement; if (el) { const v = el.value.trim(); if (v && !wordTransformAnswers.includes(v)) { setWordTransformAnswers(a => [...a, v]); el.value = ''; el.focus() } } }} style={{ height: 44, padding: '0 24px', border: `1px solid ${N.borderVisible}`, borderRadius: 999, background: 'transparent', fontFamily: FONT.mono, fontSize: 13, color: N.textPrimary, cursor: 'pointer' }}>添加</button>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            <Label>有效 {wordTransformAnswers.filter(ch => (ASP_WORD_TRANSFORM.validAnswers as readonly string[]).includes(ch)).length} 个</Label>
                            <Label>共 {wordTransformAnswers.length} 个</Label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Step 3: Scale */}
            {step === 3 && (
              <div style={{ paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <Label>进度</Label>
                  <span style={{ fontFamily: FONT.mono, fontSize: 14, color: N.textPrimary }}>
                    {ASP_SCALE_QUESTIONS.filter((q) => scaleAnswers[q.id] > 0).length}
                    <span style={{ color: N.textDisabled }}> / {ASP_SCALE_QUESTIONS.length}</span>
                  </span>
                </div>
                {ASP_SCALE_QUESTIONS.map((q, qi) => {
                  const answered = scaleAnswers[q.id] > 0
                  return (
                    <div key={q.id} style={{ padding: '16px 0', borderBottom: `1px solid ${N.border}` }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        <span style={{ fontFamily: FONT.mono, fontSize: 12, color: answered ? N.textPrimary : N.textDisabled, minWidth: 24 }}>
                          {String(qi + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: N.textPrimary }}>{q.prompt}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginLeft: 32 }}>
                        {ASP_SCALE_OPTIONS.map((opt) => {
                          const sel = scaleAnswers[q.id] === opt.value
                          return (
                            <div key={opt.value} onClick={() => setScaleAnswers((s) => ({ ...s, [q.id]: opt.value }))}
                              style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: FONT.mono, fontSize: 14, cursor: 'pointer', transition: 'all 150ms',
                                borderRadius: 999, border: sel ? 'none' : `1px solid ${N.borderVisible}`,
                                background: sel ? N.accent : 'transparent', color: sel ? '#FFFFFF' : N.textSecondary }} >
                              {opt.value}
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginLeft: 32 }}>
                        <Label style={{ fontSize: 10 }}>非常不像我</Label>
                        <Label style={{ fontSize: 10 }}>非常像我</Label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ══════ 4. Style 学习风格 ══════ */}
            {step === 4 && (() => {
              const SLOTS = [
                { key: 'most' as const, label: '最像我', color: N.success },
                { key: 'like' as const, label: '很像我', color: N.interactive },
                { key: 'least' as const, label: '最不像我', color: N.warning },
              ]
              const tapOption = (qId: string, optId: string) => {
                const prev = styleAnswers[qId] || { most: '', like: '', least: '' }
                const newAns = { ...prev }
                // 如果已选中，取消
                for (const s of SLOTS) { if (newAns[s.key] === optId) { newAns[s.key] = ''; setStyleAnswers(a => ({ ...a, [qId]: newAns })); return } }
                // 填入下一个空槽
                const empty = SLOTS.find(s => !newAns[s.key])
                if (empty) { newAns[empty.key] = optId; setStyleAnswers(a => ({ ...a, [qId]: newAns })) }
              }
              const clearSlot = (qId: string, slotKey: 'most' | 'like' | 'least') => {
                const prev = styleAnswers[qId] || { most: '', like: '', least: '' }
                setStyleAnswers(a => ({ ...a, [qId]: { ...prev, [slotKey]: '' } }))
              }
              const getOptSlot = (qId: string, optId: string) => {
                const a = styleAnswers[qId]; if (!a) return null
                return SLOTS.find(s => a[s.key] === optId) || null
              }
              const getOptLabel = (qId: string, optId: string) => {
                const q = ASP_STYLE_QUESTIONS.find(x => x.id === qId)
                return q?.options.find(o => o.id === optId)?.label || ''
              }
              const nextSlot = (qId: string) => {
                const a = styleAnswers[qId] || { most: '', like: '', least: '' }
                return SLOTS.find(s => !a[s.key]) || null
              }
              return (
                <div style={{ paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <Label>进度</Label>
                    <span style={{ fontFamily: FONT.mono, fontSize: 14, color: N.textPrimary }}>
                      {ASP_STYLE_QUESTIONS.filter(q => { const a = styleAnswers[q.id]; return a?.most && a?.like && a?.least }).length}
                      <span style={{ color: N.textDisabled }}> / {ASP_STYLE_QUESTIONS.length}</span>
                    </span>
                  </div>
                  <div style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 300, color: N.textSecondary, marginBottom: 16 }}>点击选项自动填入槽位，点击槽位可清除</div>
                  {ASP_STYLE_QUESTIONS.map((q, qi) => {
                    const ans = styleAnswers[q.id] || { most: '', like: '', least: '' }
                    const hint = nextSlot(q.id)
                    return (
                      <div key={q.id} style={{ padding: '16px 0', borderBottom: `1px solid ${N.border}` }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          <span style={{ fontFamily: FONT.mono, fontSize: 12, color: N.textDisabled, minWidth: 24 }}>{String(qi + 1).padStart(2, '0')}</span>
                          <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: N.textPrimary }}>{q.prompt}</span>
                        </div>
                        {/* 三个槽位 */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12, marginLeft: 32 }}>
                          {SLOTS.map(slot => {
                            const filled = ans[slot.key]
                            return (
                              <div key={slot.key} onClick={() => filled && clearSlot(q.id, slot.key)} style={{
                                flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center' as const,
                                border: `1.5px ${filled ? 'solid' : 'dashed'} ${filled ? slot.color : (hint?.key === slot.key ? slot.color : N.borderVisible)}`,
                                background: filled ? `${slot.color}10` : 'transparent',
                                cursor: filled ? 'pointer' : 'default', transition: 'all 150ms ease-out',
                                opacity: !filled && hint?.key !== slot.key ? 0.5 : 1,
                              }}>
                                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: slot.color, marginBottom: 2 }}>{slot.label}</div>
                                <div style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 500, color: filled ? N.textDisplay : N.textDisabled, minHeight: 18 }}>
                                  {filled ? `${filled} ${getOptLabel(q.id, filled)}` : (hint?.key === slot.key ? '← 点选' : '—')}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* 选项列表 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginLeft: 32 }}>
                          {q.options.map(opt => {
                            const slot = getOptSlot(q.id, opt.id)
                            return (
                              <div key={opt.id} onClick={() => tapOption(q.id, opt.id)} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 12px', cursor: 'pointer', transition: 'all 150ms ease-out',
                                background: slot ? `${slot.color}08` : 'transparent',
                                borderLeft: slot ? `2px solid ${slot.color}` : '2px solid transparent',
                                opacity: slot ? 0.6 : 1,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontFamily: FONT.mono, fontSize: 12, color: slot ? slot.color : N.textSecondary }}>{opt.id}</span>
                                  <span style={{ fontFamily: FONT.body, fontSize: 13, color: slot ? N.textSecondary : N.textDisplay, textDecoration: slot ? 'line-through' : 'none' }}>{opt.label}</span>
                                </div>
                                {slot && <span style={{ fontFamily: FONT.mono, fontSize: 10, color: slot.color }}>{slot.label}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* ══════ 5. Sense 感官偏好 ══════ */}
            {step === 5 && (
              <div style={{ paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <Label>进度</Label>
                  <span style={{ fontFamily: FONT.mono, fontSize: 14, color: N.textPrimary }}>
                    {ASP_SENSORY_QUESTIONS.filter(q => senseAnswers[q.id]).length}
                    <span style={{ color: N.textDisabled }}> / {ASP_SENSORY_QUESTIONS.length}</span>
                  </span>
                </div>
                {ASP_SENSORY_QUESTIONS.map((q, qi) => (
                  <div key={q.id} style={{ padding: '16px 0', borderBottom: `1px solid ${N.border}` }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: 12, color: senseAnswers[q.id] ? N.textPrimary : N.textDisabled, minWidth: 24 }}>{String(qi + 1).padStart(2, '0')}</span>
                      <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: N.textPrimary }}>{q.prompt}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginLeft: 32 }}>
                      {q.options.map(opt => {
                        const sel = senseAnswers[q.id] === opt.id
                        return (
                          <div key={opt.id} onClick={() => setSenseAnswers(s => ({ ...s, [q.id]: opt.id }))} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: sel ? N.surface : 'transparent', borderLeft: sel ? `2px solid ${N.accent}` : '2px solid transparent', cursor: 'pointer', transition: 'all 200ms ease-out' }}>
                            <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                              <circle cx="9" cy="9" r="8" fill="none" stroke={sel ? N.accent : N.borderVisible} strokeWidth="1.5" />
                              {sel && <circle cx="9" cy="9" r="4.5" fill={N.accent} />}
                            </svg>
                            <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: sel ? 500 : 400, color: sel ? N.textDisplay : N.textSecondary }}>{opt.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 6: Preference */}
            {step === 6 && (
              <div style={{ paddingTop: 16 }}>
                {ASP_PREFERENCE_QUESTIONS.map((q) => (
                  <div key={q.id} style={{ marginBottom: 32 }}>
                    <div style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: 500, color: N.textDisplay }}>{q.prompt}</div>
                    <div style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 300, color: N.textDisabled, marginTop: 4, marginBottom: 16 }}>{q.description}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {q.options.map((opt) => {
                        const sel = prefAnswers[q.id] === opt.id
                        return (
                          <div key={opt.id} onClick={() => setPrefAnswers((s) => ({ ...s, [q.id]: opt.id }))}
                            style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                              background: sel ? N.surface : 'transparent', borderLeft: sel ? `2px solid ${N.accent}` : '2px solid transparent',
                              cursor: 'pointer', transition: 'all 200ms' }}>
                            <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                              <circle cx="9" cy="9" r="8" fill="none" stroke={sel ? N.accent : N.borderVisible} strokeWidth="1.5" />
                              {sel && <circle cx="9" cy="9" r="4.5" fill={N.accent} />}
                            </svg>
                            <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: sel ? 500 : 400, color: sel ? N.textDisplay : N.textSecondary }}>
                              {opt.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 7: Subject Ratings */}
            {step === 7 && (
              <div style={{ paddingTop: 16 }}>
                <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 300, color: N.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                  为每个学科的掌握程度打分
                </div>
                {stageProfile.subjects.map((subject) => (
                  <div key={subject.id} style={{ padding: '16px 0', borderBottom: `1px solid ${N.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontFamily: FONT.body, fontSize: 16, fontWeight: 500, color: N.textDisplay }}>{subject.name}</span>
                      {subjectRatings[subject.id] > 0 && (
                        <span style={{ fontFamily: FONT.mono, fontSize: 13, color: N.textPrimary }}>
                          {subjectRatings[subject.id]}<span style={{ color: N.textDisabled }}>/5</span>
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {subject.topics.map((t) => (
                        <span key={t} style={{ fontFamily: FONT.body, fontSize: 11, letterSpacing: '0.02em', padding: '3px 10px',
                          border: `1px solid ${N.borderVisible}`, borderRadius: 4, color: N.textSecondary }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map((v) => {
                        const sel = subjectRatings[subject.id] >= v
                        return (
                          <div key={v} onClick={() => setSubjectRatings((r) => ({ ...r, [subject.id]: v }))}
                            style={{ flex: 1, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: FONT.mono, fontSize: 13,
                              background: sel ? N.accent : 'transparent', color: sel ? '#FFFFFF' : N.textSecondary,
                              border: sel ? 'none' : `1px solid ${N.borderVisible}`, cursor: 'pointer', transition: 'all 150ms' }}>
                            {v}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <Label style={{ fontSize: 10 }}>薄弱</Label>
                      <Label style={{ fontSize: 10 }}>精通</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 8: Results */}
            {step === 8 && R && (
              <div style={{ paddingTop: 16 }}>
                <div style={{ textAlign: 'center', padding: '32px 0 48px' }}>
                  <Label>综合得分</Label>
                  <div style={{ margin: '16px auto' }}><ScoreGauge score={R.overallScore} size={160} /></div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 14, letterSpacing: '0.04em', color: bandColor(R.overallScore) }}>
                    {band(R.overallScore)}
                  </div>
                </div>

                <div style={{ padding: 20, background: N.surface, border: `1px solid ${N.border}`, borderRadius: 12, marginBottom: 16 }}>
                  <Label style={{ display: 'block', marginBottom: 16 }}>能力维度</Label>
                  <MetricBar label="记忆力" score={R.memoryScore} delay={0} />
                  <MetricBar label="执行力" score={R.executionScore} delay={0.1} />
                  <MetricBar label="抗压力" score={R.resilienceScore} delay={0.2} />
                  <MetricBar label="学科力" score={R.subjectScore} delay={0.3} />
                </div>

                {R.report?.map((sec, si) => (
                  <motion.div key={sec.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + si * 0.07 }}
                    style={{ padding: 20, background: N.surface, border: `1px solid ${N.border}`, borderRadius: 12, marginBottom: 8 }}>
                    <div style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: 500, color: N.textDisplay, marginBottom: 8 }}>{sec.title}</div>
                    {sec.paragraphs.map((p, pi) => (
                      <div key={pi} style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 300, lineHeight: 1.7, color: pi === 0 ? N.textPrimary : N.textSecondary, marginTop: pi > 0 ? 4 : 0 }}>{p}</div>
                    ))}
                  </motion.div>
                ))}

                {R.preferenceTraits.length > 0 && (
                  <div style={{ padding: 20, background: N.surface, border: `1px solid ${N.border}`, borderRadius: 12, marginBottom: 8 }}>
                    <Label style={{ display: 'block', marginBottom: 12 }}>学习风格</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {R.preferenceTraits.map((t) => (
                        <span key={t} style={{ fontFamily: FONT.body, fontSize: 12, letterSpacing: '0.02em', padding: '5px 14px',
                          border: `1px solid ${N.borderVisible}`, borderRadius: 999, color: N.textPrimary }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {R.strongSubjects.length > 0 && (
                  <div style={{ padding: 20, background: N.surface, border: `1px solid ${N.border}`, borderRadius: 12, marginBottom: 8 }}>
                    <Label style={{ display: 'block', marginBottom: 12, color: N.success }}>优势学科</Label>
                    {R.strongSubjects.map((s, i) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0',
                        borderBottom: i < R.strongSubjects.length - 1 ? `1px solid ${N.border}` : undefined }}>
                        <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 500, color: N.textDisplay }}>{s.name}</span>
                        <span style={{ fontFamily: FONT.mono, fontSize: 14, color: N.success }}>{s.rating}/5</span>
                      </div>
                    ))}
                  </div>
                )}

                {R.relativeWeakSubjects.length > 0 && (
                  <div style={{ padding: 20, background: N.surface, border: `1px solid ${N.border}`, borderRadius: 12, marginBottom: 8 }}>
                    <Label style={{ display: 'block', marginBottom: 4, color: N.warning }}>相对薄弱</Label>
                    <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 300, color: N.textDisabled, marginBottom: 12 }}>与最强科目存在明显落差</div>
                    {R.relativeWeakSubjects.map((s, i) => (
                      <div key={s.id} style={{ padding: '10px 0', borderBottom: i < R.relativeWeakSubjects.length - 1 ? `1px solid ${N.border}` : undefined }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 500, color: N.textDisplay }}>{s.name}</span>
                          <span style={{ fontFamily: FONT.mono, fontSize: 12, color: N.warning }}>
                            {s.rating}/5 <span style={{ color: N.textDisabled }}>(-{s.gap})</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {s.topics.map((t) => (
                            <span key={t} style={{ fontFamily: FONT.body, fontSize: 10, letterSpacing: '0.02em', padding: '2px 8px',
                              border: `1px solid ${N.borderVisible}`, borderRadius: 4, color: N.textSecondary }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {R.psychWeakSubjects.length > 0 && (
                  <div style={{ padding: 20, background: N.surface, border: `1px solid ${N.border}`, borderRadius: 12, marginBottom: 8 }}>
                    <Label style={{ display: 'block', marginBottom: 4, color: N.accent }}>压力风险</Label>
                    <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 300, color: N.textDisabled, marginBottom: 12 }}>
                      心理韧性偏低（{R.resilienceScore}分），以下科目在考压下容易退步
                    </div>
                    {R.psychWeakSubjects.map((s, i) => (
                      <div key={s.id} style={{ padding: '10px 0', borderBottom: i < R.psychWeakSubjects.length - 1 ? `1px solid ${N.border}` : undefined }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 500, color: N.textDisplay }}>{s.name}</span>
                          <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.04em', padding: '3px 10px',
                            border: `1px solid ${s.riskLevel === 'high' ? N.accent : N.warning}`, borderRadius: 999,
                            color: s.riskLevel === 'high' ? N.accent : N.warning }}>
                            {s.riskLevel === 'high' ? '高风险' : '中等'}
                          </span>
                        </div>
                        <div style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 300, color: N.textSecondary, marginTop: 4 }}>{s.reason}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ padding: '24px 0' }}>
                  <NButton block onClick={resetAll}>重新测评</NButton>
                  <div style={{ fontFamily: FONT.body, fontSize: 11, color: N.textDisabled, textAlign: 'center', marginTop: 12 }}>测评结果已保存</div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      {step < 8 && (
        <div style={{ padding: '12px 16px max(env(safe-area-inset-bottom), 12px)', display: 'flex', gap: 10, borderTop: `1px solid ${N.border}`, background: N.bg }}>
          {step > 0 && <NButton onClick={goPrev} style={{ flex: 1 }}>&larr; 上一步</NButton>}
          <NButton primary loading={submitState === 'loading'} disabled={!ready[step]} onClick={goNext} style={{ flex: 1 }}>
            {step === 7 ? (submitState === 'loading' ? '生成中...' : '生成报告') : <>下一步 &rarr;</>}
          </NButton>
        </div>
      )}

      {submitState === 'error' && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          fontFamily: FONT.body, fontSize: 12, color: N.accent, background: N.surface,
          border: `1px solid ${N.accent}`, padding: '8px 16px', borderRadius: 8 }}>
          提交失败，请重试
        </div>
      )}
    </div>
  )
}
