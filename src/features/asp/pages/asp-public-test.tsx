import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Eye,
  Flame,
  GraduationCap,
  Layers3,
  NotebookPen,
  ScanSearch,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ASP_MEMORY_TASKS,
  ASP_PREFERENCE_QUESTIONS,
  ASP_SCALE_OPTIONS,
  ASP_SCALE_QUESTIONS,
  ASP_STAGE_PROFILES,
  type AspMemoryTask,
  type AspStageId,
} from '../data/assessment'

type StepId = 'intro' | 'flash' | 'state' | 'preference' | 'subjects' | 'result'
type MemoryPhase = 'ready' | 'memorizing' | 'recall'

const STEP_CONFIG: Array<{
  id: StepId
  label: string
  title: string
  intro: string
}> = [
  {
    id: 'intro',
    label: '01',
    title: '起始档案',
    intro: '确认学段、体验说明与页面结构。',
  },
  {
    id: 'flash',
    label: '02',
    title: '闪测样例',
    intro: '用缩短版时间还原 PDF 里的记忆与规律题。',
  },
  {
    id: 'state',
    label: '03',
    title: '学习状态',
    intro: '用 Likert 量表重建学习策略与学习心理部分。',
  },
  {
    id: 'preference',
    label: '04',
    title: '偏好画像',
    intro: '重建学习通道、环境和互动偏好题。',
  },
  {
    id: 'subjects',
    label: '05',
    title: '学科画像',
    intro: '根据学段展示题册中的学科范围，并完成自评。',
  },
  {
    id: 'result',
    label: '06',
    title: '结果概览',
    intro: '这是一个非官方评分原型，只用于预览页面效果。',
  },
] as const

const LIKERT_WIDTH = 'minmax(64px,1fr)'

const palette = {
  paper: '#f7f1e5',
  paperDeep: '#efe4d2',
  ink: '#102038',
  muted: '#5f6d7f',
  teal: '#2e8b93',
  tealSoft: '#d9eeef',
  blue: '#2d58b8',
  blueSoft: '#dde7fb',
  red: '#d75f5f',
  redSoft: '#fde5e1',
  gold: '#c79a43',
  line: 'rgba(16,32,56,0.12)',
} as const

function tokenizeAnswer(value: string) {
  return value
    .split(/[\s,，、/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function scoreMemoryTask(task: AspMemoryTask, answer: string) {
  if (task.expectedTokens) {
    const expected = new Set(task.expectedTokens.map((item) => item.toLowerCase()))
    const seen = new Set<string>()
    let hits = 0

    tokenizeAnswer(answer).forEach((item) => {
      const normalized = item.toLowerCase()
      if (expected.has(normalized) && !seen.has(normalized)) {
        seen.add(normalized)
        hits += 1
      }
    })

    return Math.round((hits / task.expectedTokens.length) * 100)
  }

  if (task.expectedAnswer) {
    return answer.trim() === task.expectedAnswer ? 100 : 0
  }

  return 0
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function describeBand(score: number) {
  if (score >= 85) return '高位稳定'
  if (score >= 70) return '状态较好'
  if (score >= 55) return '中位波动'
  return '需要重点关注'
}

function createMemoryPhaseState() {
  return Object.fromEntries(ASP_MEMORY_TASKS.map((task) => [task.id, 'ready'])) as Record<string, MemoryPhase>
}

function createMemoryCountdownState() {
  return Object.fromEntries(ASP_MEMORY_TASKS.map((task) => [task.id, task.memorizeSeconds])) as Record<
    string,
    number
  >
}

function createMemoryAnswerState() {
  return Object.fromEntries(ASP_MEMORY_TASKS.map((task) => [task.id, ''])) as Record<string, string>
}

function createScaleAnswerState() {
  return Object.fromEntries(ASP_SCALE_QUESTIONS.map((question) => [question.id, 0])) as Record<string, number>
}

function createPreferenceState() {
  return Object.fromEntries(ASP_PREFERENCE_QUESTIONS.map((question) => [question.id, ''])) as Record<string, string>
}

function createSubjectRatings(stageId: AspStageId, current?: Record<string, number>) {
  const stage = ASP_STAGE_PROFILES.find((item) => item.id === stageId) ?? ASP_STAGE_PROFILES[0]
  return Object.fromEntries(
    stage.subjects.map((subject) => [subject.id, current?.[subject.id] ?? 0])
  ) as Record<string, number>
}

function StepChip({
  active,
  done,
  index,
  title,
}: {
  active: boolean
  done: boolean
  index: string
  title: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] border px-4 py-3 transition-all duration-300',
        active ? 'translate-x-1 shadow-[0_18px_60px_rgba(46,139,147,0.15)]' : 'opacity-75'
      )}
      style={{
        borderColor: active ? 'rgba(46,139,147,0.28)' : palette.line,
        background: active
          ? 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(217,238,239,0.74))'
          : 'rgba(255,255,255,0.62)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            backgroundColor: active ? palette.teal : done ? palette.blue : 'rgba(255,255,255,0.7)',
            color: active || done ? '#fff' : palette.ink,
          }}
        >
          {done ? '✓' : index}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: palette.muted }}>
            ASP Flow
          </div>
          <div className="text-sm font-semibold" style={{ color: palette.ink }}>
            {title}
          </div>
        </div>
      </div>
    </div>
  )
}

function MemoryTaskCard({
  task,
  phase,
  countdown,
  answer,
  onStart,
  onRecall,
  onAnswerChange,
}: {
  task: AspMemoryTask
  phase: MemoryPhase
  countdown: number
  answer: string
  onStart: () => void
  onRecall: () => void
  onAnswerChange: (value: string) => void
}) {
  const score = answer.trim() ? scoreMemoryTask(task, answer) : 0

  return (
    <div
      className="rounded-[28px] border p-5 shadow-[0_22px_80px_rgba(16,32,56,0.06)]"
      style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.28em]" style={{ color: palette.teal }}>
            Flash Module
          </div>
          <h3 className="text-xl font-semibold" style={{ color: palette.ink }}>
            {task.title}
          </h3>
        </div>
        <div
          className="rounded-full border px-3 py-1 text-xs"
          style={{
            borderColor: phase === 'memorizing' ? 'rgba(215,95,95,0.25)' : 'rgba(46,139,147,0.22)',
            color: phase === 'memorizing' ? palette.red : palette.teal,
            backgroundColor: phase === 'memorizing' ? palette.redSoft : palette.tealSoft,
          }}
        >
          {phase === 'memorizing' ? `剩余 ${countdown}s` : phase === 'recall' ? `原型分 ${score}` : '等待开始'}
        </div>
      </div>

      <p className="mb-4 text-sm leading-6" style={{ color: palette.muted }}>
        {task.instruction}
      </p>

      <div
        className={cn(
          'mb-4 rounded-[24px] border px-4 py-5 text-center text-lg font-semibold tracking-[0.08em]',
          phase === 'memorizing' || task.memorizeSeconds === 0 ? 'blur-0' : 'blur-[10px]'
        )}
        style={{
          borderColor: palette.line,
          background:
            phase === 'memorizing' || task.memorizeSeconds === 0
              ? 'linear-gradient(135deg, rgba(221,231,251,0.88), rgba(255,255,255,0.92))'
              : 'linear-gradient(135deg, rgba(239,228,210,0.55), rgba(255,255,255,0.9))',
          color: palette.ink,
        }}
      >
        {phase === 'memorizing' || task.memorizeSeconds === 0 ? task.display : '内容已隐藏，进入回忆输入'}
      </div>

      {task.memorizeSeconds > 0 ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onStart}
            disabled={phase === 'memorizing'}
            className="rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #2d58b8, #1f3f8f)',
              color: '#fff',
            }}
          >
            {phase === 'ready' ? '开始记忆' : phase === 'memorizing' ? '记忆中…' : '重新开始'}
          </button>
          {phase === 'memorizing' && (
            <button
              type="button"
              onClick={onRecall}
              className="rounded-full border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: palette.line, color: palette.ink }}
            >
              提前进入回忆
            </button>
          )}
        </div>
      ) : null}

      {(phase === 'recall' || task.memorizeSeconds === 0) && (
        <div className="mt-4 space-y-3">
          <textarea
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder={task.placeholder}
            className="min-h-[110px] w-full rounded-[22px] border bg-white/80 px-4 py-3 text-sm leading-6"
            style={{ borderColor: palette.line, color: palette.ink }}
          />
          <p className="text-xs leading-5" style={{ color: palette.muted }}>
            {task.hint}
          </p>
        </div>
      )}
    </div>
  )
}

function AspResultBar({
  label,
  score,
  tone,
}: {
  label: string
  score: number
  tone: 'teal' | 'blue' | 'red' | 'gold'
}) {
  const toneMap = {
    teal: { base: palette.teal, soft: palette.tealSoft },
    blue: { base: palette.blue, soft: palette.blueSoft },
    red: { base: palette.red, soft: palette.redSoft },
    gold: { base: palette.gold, soft: 'rgba(199,154,67,0.18)' },
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: palette.ink }}>{label}</span>
        <span className="font-semibold" style={{ color: toneMap[tone].base }}>
          {score}
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full"
        style={{ backgroundColor: toneMap[tone].soft }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ backgroundColor: toneMap[tone].base }}
        />
      </div>
      <div className="text-xs" style={{ color: palette.muted }}>
        {describeBand(score)}
      </div>
    </div>
  )
}

export function AspPublicTest() {
  const [step, setStep] = useState(0)
  const [studentName, setStudentName] = useState('')
  const [stageId, setStageId] = useState<AspStageId>('junior')
  const [memoryPhase, setMemoryPhase] = useState<Record<string, MemoryPhase>>(createMemoryPhaseState)
  const [memoryCountdown, setMemoryCountdown] = useState<Record<string, number>>(createMemoryCountdownState)
  const [memoryAnswers, setMemoryAnswers] = useState<Record<string, string>>(createMemoryAnswerState)
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null)
  const [scaleAnswers, setScaleAnswers] = useState<Record<string, number>>(createScaleAnswerState)
  const [preferenceAnswers, setPreferenceAnswers] = useState<Record<string, string>>(createPreferenceState)
  const [subjectRatings, setSubjectRatings] = useState<Record<string, number>>(() => createSubjectRatings('junior'))

  const stageProfile = ASP_STAGE_PROFILES.find((item) => item.id === stageId) ?? ASP_STAGE_PROFILES[0]
  const currentStep = STEP_CONFIG[step]

  useEffect(() => {
    if (!activeMemoryId) return
    if (memoryPhase[activeMemoryId] !== 'memorizing') return

    const timer = window.setTimeout(() => {
      const nextCountdown = memoryCountdown[activeMemoryId] - 1
      if (nextCountdown <= 0) {
        setMemoryCountdown((current) => ({ ...current, [activeMemoryId]: 0 }))
        setMemoryPhase((current) => ({ ...current, [activeMemoryId]: 'recall' }))
        setActiveMemoryId(null)
        return
      }

      setMemoryCountdown((current) => ({ ...current, [activeMemoryId]: nextCountdown }))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [activeMemoryId, memoryCountdown, memoryPhase])

  const introComplete = studentName.trim().length > 0
  const memoryComplete = ASP_MEMORY_TASKS.every((task) => memoryAnswers[task.id]?.trim())
  const scaleComplete = ASP_SCALE_QUESTIONS.every((question) => scaleAnswers[question.id] > 0)
  const preferenceComplete = ASP_PREFERENCE_QUESTIONS.every((question) => preferenceAnswers[question.id])
  const subjectsComplete = stageProfile.subjects.every((subject) => subjectRatings[subject.id] > 0)

  const stepReady = [introComplete, memoryComplete, scaleComplete, preferenceComplete, subjectsComplete, true]
  const finishedCount = stepReady.slice(0, -1).filter(Boolean).length

  const memoryScores = ASP_MEMORY_TASKS.map((task) => scoreMemoryTask(task, memoryAnswers[task.id] ?? ''))
  const executionScore = average(
    ASP_SCALE_QUESTIONS.filter((question) => question.dimension === 'execution').map((question) => {
      const raw = scaleAnswers[question.id]
      const normalized = question.reverse ? 6 - raw : raw
      return Math.round(((normalized - 1) / 4) * 100)
    })
  )
  const resilienceScore = average(
    ASP_SCALE_QUESTIONS.filter((question) => question.dimension === 'resilience').map((question) => {
      const raw = scaleAnswers[question.id]
      const normalized = question.reverse ? 6 - raw : raw
      return Math.round(((normalized - 1) / 4) * 100)
    })
  )
  const memoryScore = average(memoryScores)
  const subjectScore = average(
    stageProfile.subjects.map((subject) => Math.round(((subjectRatings[subject.id] - 1) / 4) * 100))
  )
  const overallScore = Math.round(memoryScore * 0.24 + executionScore * 0.24 + resilienceScore * 0.22 + subjectScore * 0.3)

  const preferenceTraits = Object.entries(preferenceAnswers).flatMap(([questionId, answerId]) => {
    const question = ASP_PREFERENCE_QUESTIONS.find((item) => item.id === questionId)
    const option = question?.options.find((item) => item.id === answerId)
    return option?.traits ?? []
  })
  const preferenceTraitCounter = preferenceTraits.reduce<Record<string, number>>((counter, trait) => {
    counter[trait] = (counter[trait] ?? 0) + 1
    return counter
  }, {})
  const topPreferenceTraits = Object.entries(preferenceTraitCounter)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([trait]) => trait)

  const sortedSubjects = [...stageProfile.subjects].sort(
    (left, right) => subjectRatings[right.id] - subjectRatings[left.id]
  )
  const strongSubjects = sortedSubjects.slice(0, 2)
  const focusSubjects = [...stageProfile.subjects]
    .sort((left, right) => subjectRatings[left.id] - subjectRatings[right.id])
    .slice(0, 2)

  function startMemoryTask(taskId: string) {
    const task = ASP_MEMORY_TASKS.find((item) => item.id === taskId)
    if (!task || task.memorizeSeconds <= 0) return

    setActiveMemoryId(taskId)
    setMemoryPhase((current) => ({ ...current, [taskId]: 'memorizing' }))
    setMemoryCountdown((current) => ({ ...current, [taskId]: task.memorizeSeconds }))
    setMemoryAnswers((current) => ({ ...current, [taskId]: '' }))
  }

  function moveToRecall(taskId: string) {
    setMemoryPhase((current) => ({ ...current, [taskId]: 'recall' }))
    if (activeMemoryId === taskId) {
      setActiveMemoryId(null)
    }
  }

  function handleStageSelect(nextStageId: AspStageId) {
    setStageId(nextStageId)
    setSubjectRatings((current) => createSubjectRatings(nextStageId, current))
  }

  function resetAll() {
    setStep(0)
    setStudentName('')
    setStageId('junior')
    setMemoryPhase(createMemoryPhaseState())
    setMemoryCountdown(createMemoryCountdownState())
    setMemoryAnswers(createMemoryAnswerState())
    setActiveMemoryId(null)
    setScaleAnswers(createScaleAnswerState())
    setPreferenceAnswers(createPreferenceState())
    setSubjectRatings(createSubjectRatings('junior'))
  }

  function goNext() {
    if (step < STEP_CONFIG.length - 1 && stepReady[step]) {
      setStep((current) => current + 1)
    }
  }

  function goPrev() {
    if (step > 0) {
      setStep((current) => current - 1)
    }
  }

  return (
    <div
      className="min-h-svh overflow-hidden px-4 py-6 sm:px-6 lg:px-8"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(221,231,251,0.8), transparent 34%), radial-gradient(circle at 90% 10%, rgba(217,238,239,0.88), transparent 24%), linear-gradient(180deg, #fcf7ef 0%, #f7f1e5 50%, #efe4d2 100%)',
      }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div
              className="overflow-hidden rounded-[34px] border p-5 shadow-[0_30px_120px_rgba(16,32,56,0.12)]"
              style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.66)' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em]" style={{ color: palette.teal }}>
                    Rui Man Fen
                  </div>
                  <h1 className="mt-2 text-3xl font-black tracking-[0.18em]" style={{ color: palette.ink }}>
                    ASP
                  </h1>
                </div>
                <div
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{ borderColor: 'rgba(215,95,95,0.25)', color: palette.red, backgroundColor: palette.redSoft }}
                >
                  原型预览
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <div className="rounded-[28px] border p-4" style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.52)' }}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.ink }}>
                    <Layers3 size={16} />
                    三层结构
                  </div>
                  <div className="flex items-center justify-center py-3">
                    <div className="relative h-44 w-44">
                      <div className="absolute left-8 top-12 flex h-24 w-24 items-center justify-center rounded-full bg-[#2655B61F] text-sm font-semibold text-[#1F4EA7]">
                        学习
                        <br />
                        能力
                      </div>
                      <div className="absolute left-14 top-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#2E8B931E] text-sm font-semibold text-[#1E6C73]">
                        学习
                        <br />
                        策略
                      </div>
                      <div className="absolute left-20 top-12 flex h-24 w-24 items-center justify-center rounded-full bg-[#D75F5F1F] text-sm font-semibold text-[#B34A4A]">
                        学习
                        <br />
                        心理
                      </div>
                      <div className="absolute left-[52px] top-[52px] flex h-16 w-16 items-center justify-center rounded-full bg-[#102038] text-xs font-semibold text-white">
                        ASP
                      </div>
                    </div>
                  </div>
                  <p className="text-xs leading-5" style={{ color: palette.muted }}>
                    页面结构参考 PDF 题册封面与末页示意图，右侧流程则是网页化后的答题路径。
                  </p>
                </div>

                <div className="rounded-[28px] border p-4" style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.52)' }}>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.ink }}>
                    <ClipboardCheck size={16} />
                    完成进度
                  </div>
                  <div className="mb-2 text-4xl font-black" style={{ color: palette.blue }}>
                    {finishedCount}
                    <span className="text-lg font-medium" style={{ color: palette.muted }}>
                      /5
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(16,32,56,0.08)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(finishedCount / 5) * 100}%` }}
                      transition={{ duration: 0.6 }}
                      style={{ background: 'linear-gradient(90deg, #2e8b93, #2d58b8)' }}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5" style={{ color: palette.muted }}>
                    这里做的是“网页化交互原型”，并没有接 ASP 官方后台或官方评分卡。
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {STEP_CONFIG.map((item, index) => (
                  <StepChip
                    key={item.id}
                    active={index === step}
                    done={index < STEP_CONFIG.length - 1 ? stepReady[index] : false}
                    index={item.label}
                    title={item.title}
                  />
                ))}
              </div>
            </div>
          </aside>

          <main>
            <div
              className="overflow-hidden rounded-[38px] border shadow-[0_30px_120px_rgba(16,32,56,0.12)]"
              style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.64)' }}
            >
              <div
                className="border-b px-6 py-5 sm:px-8"
                style={{ borderColor: palette.line, background: 'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.4))' }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.28em]" style={{ color: palette.teal }}>
                      {currentStep.label} / {currentStep.id}
                    </div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black tracking-[0.08em]" style={{ color: palette.ink }}>
                        {currentStep.title}
                      </h2>
                      <div
                        className="rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{ borderColor: palette.line, color: palette.muted }}
                      >
                        {currentStep.intro}
                      </div>
                    </div>
                  </div>

                  {step < STEP_CONFIG.length - 1 && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={goPrev}
                        disabled={step === 0}
                        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ borderColor: palette.line, color: palette.ink }}
                      >
                        <ChevronLeft size={16} />
                        上一步
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        disabled={!stepReady[step]}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ background: 'linear-gradient(135deg, #2e8b93, #2d58b8)' }}
                      >
                        下一步
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-8 sm:py-7">
                <AnimatePresence mode="wait" initial={false}>
                  {currentStep.id === 'intro' && (
                    <motion.div
                      key="intro"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.28 }}
                      className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
                    >
                      <section className="space-y-5">
                        <div
                          className="overflow-hidden rounded-[34px] border p-6"
                          style={{
                            borderColor: 'rgba(46,139,147,0.22)',
                            background:
                              'linear-gradient(160deg, rgba(217,238,239,0.8), rgba(255,255,255,0.76) 58%, rgba(221,231,251,0.64))',
                          }}
                        >
                          <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-full bg-white/80 p-3 text-[#2e8b93]">
                              <ScanSearch size={20} />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.24em]" style={{ color: palette.teal }}>
                                Assessment Preview
                              </div>
                              <h3 className="text-2xl font-black" style={{ color: palette.ink }}>
                                把 PDF 题册改造成网页答题体验
                              </h3>
                            </div>
                          </div>
                          <p className="max-w-2xl text-sm leading-7" style={{ color: palette.ink }}>
                            这个页面不是把 PDF 直接塞进 iframe，而是按题册逻辑重新组织成网页流程：先做闪测样例，再完成学习状态、偏好和学科自评，最后给出一个非官方的原型评分摘要。
                          </p>

                          <div className="mt-6 grid gap-4 md:grid-cols-3">
                            {[
                              {
                                icon: BrainCircuit,
                                title: '学习能力',
                                text: '用数字闪记、词语回忆和规律题示范网页化后的快测区。',
                              },
                              {
                                icon: NotebookPen,
                                title: '学习策略',
                                text: '把 PDF 中的陈述题改为 Likert 量表，更适合移动端点选。',
                              },
                              {
                                icon: GraduationCap,
                                title: '学科画像',
                                text: '按小学、初中、高中文理分流展示题册里的学科覆盖范围。',
                              },
                            ].map((item) => (
                              <div
                                key={item.title}
                                className="rounded-[28px] border p-4"
                                style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
                              >
                                <item.icon size={18} color={palette.blue} />
                                <div className="mt-3 text-base font-semibold" style={{ color: palette.ink }}>
                                  {item.title}
                                </div>
                                <p className="mt-2 text-sm leading-6" style={{ color: palette.muted }}>
                                  {item.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      <section className="space-y-5">
                        <div
                          className="rounded-[34px] border p-6"
                          style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.74)' }}
                        >
                          <div className="mb-5 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.ink }}>
                            <BookOpen size={16} />
                            开始设置
                          </div>

                          <label className="mb-2 block text-sm font-medium" style={{ color: palette.muted }}>
                            学生姓名 / 体验者标记
                          </label>
                          <input
                            value={studentName}
                            onChange={(event) => setStudentName(event.target.value)}
                            placeholder="例如：张同学 / 试听用户 A"
                            className="mb-5 w-full rounded-[22px] border bg-white/80 px-4 py-3 text-sm"
                            style={{ borderColor: palette.line, color: palette.ink }}
                          />

                          <div className="mb-2 text-sm font-medium" style={{ color: palette.muted }}>
                            选择学段
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {ASP_STAGE_PROFILES.map((stage) => (
                              <button
                                key={stage.id}
                                type="button"
                                onClick={() => handleStageSelect(stage.id)}
                                className={cn(
                                  'rounded-[24px] border p-4 text-left transition',
                                  stage.id === stageId && 'translate-y-[-2px] shadow-[0_18px_45px_rgba(46,139,147,0.12)]'
                                )}
                                style={{
                                  borderColor: stage.id === stageId ? 'rgba(46,139,147,0.28)' : palette.line,
                                  background:
                                    stage.id === stageId
                                      ? 'linear-gradient(135deg, rgba(217,238,239,0.86), rgba(255,255,255,0.9))'
                                      : 'rgba(255,255,255,0.72)',
                                }}
                              >
                                <div className="mb-3 flex items-center gap-3">
                                  <div
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                                    style={{ backgroundColor: stage.id === stageId ? palette.teal : palette.blue }}
                                  >
                                    {stage.badge}
                                  </div>
                                  <div className="text-base font-semibold" style={{ color: palette.ink }}>
                                    {stage.label}
                                  </div>
                                </div>
                                <p className="text-sm leading-6" style={{ color: palette.muted }}>
                                  {stage.summary}
                                </p>
                              </button>
                            ))}
                          </div>

                          <div
                            className="mt-5 rounded-[24px] border p-4"
                            style={{ borderColor: 'rgba(215,95,95,0.18)', backgroundColor: palette.redSoft }}
                          >
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.red }}>
                              <CircleAlert size={16} />
                              说明
                            </div>
                            <p className="text-sm leading-6" style={{ color: '#8f4646' }}>
                              当前页面只做交互预览，不包含 ASP 官方答题卡、常模或报告引擎。结果页的分数是为了演示信息架构和视觉效果。
                            </p>
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {currentStep.id === 'flash' && (
                    <motion.div
                      key="flash"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-5"
                    >
                      <div
                        className="rounded-[30px] border p-5"
                        style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className="rounded-full bg-[#2d58b814] p-3 text-[#2d58b8]">
                            <Eye size={18} />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.24em]" style={{ color: palette.blue }}>
                              Timed Demo
                            </div>
                            <h3 className="text-xl font-semibold" style={{ color: palette.ink }}>
                              网页版闪测把 PDF 的 30 秒 / 60 秒任务缩短成演示版
                            </h3>
                          </div>
                        </div>
                        <p className="text-sm leading-7" style={{ color: palette.muted }}>
                          这里先验证网页交互是否顺手：开始记忆后内容会短暂显示，时间结束自动隐藏，再进入回忆输入。这样比纸面题册更适合手机端和线上测评。
                        </p>
                      </div>

                      <div className="grid gap-5 xl:grid-cols-3">
                        {ASP_MEMORY_TASKS.map((task) => (
                          <MemoryTaskCard
                            key={task.id}
                            task={task}
                            phase={memoryPhase[task.id]}
                            countdown={memoryCountdown[task.id]}
                            answer={memoryAnswers[task.id]}
                            onStart={() => startMemoryTask(task.id)}
                            onRecall={() => moveToRecall(task.id)}
                            onAnswerChange={(value) =>
                              setMemoryAnswers((current) => ({ ...current, [task.id]: value }))
                            }
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentStep.id === 'state' && (
                    <motion.div
                      key="state"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-5"
                    >
                      <div
                        className="rounded-[30px] border p-5"
                        style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className="rounded-full bg-[#2e8b9314] p-3 text-[#2e8b93]">
                            <Sparkles size={18} />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.24em]" style={{ color: palette.teal }}>
                              Likert Survey
                            </div>
                            <h3 className="text-xl font-semibold" style={{ color: palette.ink }}>
                              把纸质判断题改成可点选矩阵
                            </h3>
                          </div>
                        </div>
                        <p className="text-sm leading-7" style={{ color: palette.muted }}>
                          这一段来自 PDF 的第三至第六部分。网页上最适合的承载方式是 5 级量表，不再要求用户手写 √，而是直接点选，非常适合手机操作。
                        </p>
                      </div>

                      <div className="space-y-4">
                        {ASP_SCALE_QUESTIONS.map((question, index) => (
                          <div
                            key={question.id}
                            className="rounded-[28px] border p-5"
                            style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
                          >
                            <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                              <div className="text-sm font-semibold leading-7" style={{ color: palette.ink }}>
                                {index + 1}. {question.prompt}
                              </div>
                              <div
                                className="rounded-full border px-3 py-1 text-xs"
                                style={{
                                  borderColor:
                                    question.dimension === 'execution'
                                      ? 'rgba(45,88,184,0.16)'
                                      : 'rgba(215,95,95,0.18)',
                                  color: question.dimension === 'execution' ? palette.blue : palette.red,
                                  backgroundColor:
                                    question.dimension === 'execution' ? palette.blueSoft : palette.redSoft,
                                }}
                              >
                                {question.dimension === 'execution' ? '学习执行' : '心理韧性'}
                              </div>
                            </div>
                            <div
                              className="grid gap-2"
                              style={{ gridTemplateColumns: `repeat(${ASP_SCALE_OPTIONS.length}, ${LIKERT_WIDTH})` }}
                            >
                              {ASP_SCALE_OPTIONS.map((option) => {
                                const selected = scaleAnswers[question.id] === option.value
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      setScaleAnswers((current) => ({
                                        ...current,
                                        [question.id]: option.value,
                                      }))
                                    }
                                    className={cn(
                                      'rounded-[22px] border px-3 py-3 text-center text-sm transition',
                                      selected && 'translate-y-[-2px]'
                                    )}
                                    style={{
                                      borderColor: selected ? 'rgba(46,139,147,0.34)' : palette.line,
                                      background: selected
                                        ? 'linear-gradient(135deg, rgba(217,238,239,0.88), rgba(255,255,255,0.96))'
                                        : 'rgba(255,255,255,0.82)',
                                      color: selected ? palette.teal : palette.ink,
                                    }}
                                  >
                                    <div className="text-base font-semibold">{option.value}</div>
                                    <div className="mt-1 text-xs leading-5">{option.label}</div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentStep.id === 'preference' && (
                    <motion.div
                      key="preference"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-5"
                    >
                      <div
                        className="rounded-[30px] border p-5"
                        style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className="rounded-full bg-[#c79a4316] p-3 text-[#c79a43]">
                            <Flame size={18} />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.24em]" style={{ color: palette.gold }}>
                              Learning Preference
                            </div>
                            <h3 className="text-xl font-semibold" style={{ color: palette.ink }}>
                              偏好题最适合做成卡片式选择
                            </h3>
                          </div>
                        </div>
                        <p className="text-sm leading-7" style={{ color: palette.muted }}>
                          这部分用来验证“学习通道、环境、互动偏好”在网页上的呈现方式。你点完以后，结果页会自动整理出偏好标签。
                        </p>
                      </div>

                      <div className="grid gap-5 xl:grid-cols-2">
                        {ASP_PREFERENCE_QUESTIONS.map((question) => (
                          <div
                            key={question.id}
                            className="rounded-[30px] border p-5"
                            style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
                          >
                            <div className="mb-2 text-xs uppercase tracking-[0.24em]" style={{ color: palette.teal }}>
                              {question.description}
                            </div>
                            <h3 className="mb-4 text-lg font-semibold" style={{ color: palette.ink }}>
                              {question.prompt}
                            </h3>
                            <div className="space-y-3">
                              {question.options.map((option) => {
                                const selected = preferenceAnswers[question.id] === option.id
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() =>
                                      setPreferenceAnswers((current) => ({
                                        ...current,
                                        [question.id]: option.id,
                                      }))
                                    }
                                    className={cn(
                                      'w-full rounded-[24px] border p-4 text-left transition',
                                      selected && 'translate-y-[-2px] shadow-[0_16px_40px_rgba(45,88,184,0.1)]'
                                    )}
                                    style={{
                                      borderColor: selected ? 'rgba(45,88,184,0.28)' : palette.line,
                                      background: selected
                                        ? 'linear-gradient(135deg, rgba(221,231,251,0.92), rgba(255,255,255,0.98))'
                                        : 'rgba(255,255,255,0.84)',
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-semibold" style={{ color: palette.ink }}>
                                          {option.label}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {option.traits.map((trait) => (
                                            <span
                                              key={trait}
                                              className="rounded-full border px-2 py-1 text-xs"
                                              style={{
                                                borderColor: 'rgba(46,139,147,0.18)',
                                                color: palette.teal,
                                                backgroundColor: palette.tealSoft,
                                              }}
                                            >
                                              {trait}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <div
                                        className="mt-1 h-5 w-5 rounded-full border"
                                        style={{
                                          borderColor: selected ? palette.blue : palette.line,
                                          backgroundColor: selected ? palette.blue : 'transparent',
                                        }}
                                      />
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentStep.id === 'subjects' && (
                    <motion.div
                      key="subjects"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-5"
                    >
                      <div
                        className="rounded-[30px] border p-5"
                        style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className="rounded-full bg-[#2d58b814] p-3 text-[#2d58b8]">
                            <GraduationCap size={18} />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.24em]" style={{ color: palette.blue }}>
                              Stage Mapping
                            </div>
                            <h3 className="text-xl font-semibold" style={{ color: palette.ink }}>
                              {stageProfile.label} 学科范围与自评
                            </h3>
                          </div>
                        </div>
                        <p className="text-sm leading-7" style={{ color: palette.muted }}>
                          这部分直接参考题册后半段的“学科知识测评 / 题型测评”页。页面里先展示覆盖范围，再让体验者给每门学科做一个快速自评，方便结果页演示“强项 / 关注点”。
                        </p>
                      </div>

                      <div className="grid gap-5 xl:grid-cols-2">
                        {stageProfile.subjects.map((subject) => (
                          <div
                            key={subject.id}
                            className="rounded-[30px] border p-5"
                            style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.72)' }}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="text-lg font-semibold" style={{ color: palette.ink }}>
                                {subject.name}
                              </div>
                              <div
                                className="rounded-full border px-3 py-1 text-xs"
                                style={{ borderColor: 'rgba(45,88,184,0.16)', color: palette.blue, backgroundColor: palette.blueSoft }}
                              >
                                {subjectRatings[subject.id] > 0 ? `当前 ${subjectRatings[subject.id]} / 5` : '待自评'}
                              </div>
                            </div>

                            <div className="mb-4 flex flex-wrap gap-2">
                              {subject.topics.map((topic) => (
                                <span
                                  key={topic}
                                  className="rounded-full border px-3 py-1 text-xs"
                                  style={{ borderColor: palette.line, color: palette.muted, backgroundColor: 'rgba(255,255,255,0.86)' }}
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map((value) => {
                                const selected = subjectRatings[subject.id] === value
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                      setSubjectRatings((current) => ({
                                        ...current,
                                        [subject.id]: value,
                                      }))
                                    }
                                    className="rounded-[20px] border px-2 py-3 text-center transition"
                                    style={{
                                      borderColor: selected ? 'rgba(46,139,147,0.28)' : palette.line,
                                      background: selected
                                        ? 'linear-gradient(135deg, rgba(217,238,239,0.88), rgba(255,255,255,0.96))'
                                        : 'rgba(255,255,255,0.84)',
                                      color: selected ? palette.teal : palette.ink,
                                    }}
                                  >
                                    <div className="text-base font-semibold">{value}</div>
                                    <div className="mt-1 text-[11px] leading-4">
                                      {value === 1
                                        ? '薄弱'
                                        : value === 2
                                          ? '偏弱'
                                          : value === 3
                                            ? '一般'
                                            : value === 4
                                              ? '稳'
                                              : '强'}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentStep.id === 'result' && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-5"
                    >
                      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                        <div
                          className="overflow-hidden rounded-[34px] border p-6"
                          style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.74)' }}
                        >
                          <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-full bg-[#2d58b814] p-3 text-[#2d58b8]">
                              <ArrowRight size={18} />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.24em]" style={{ color: palette.blue }}>
                                Prototype Result
                              </div>
                              <h3 className="text-xl font-semibold" style={{ color: palette.ink }}>
                                {studentName || '未命名体验者'} 的 ASP 网页版概览
                              </h3>
                            </div>
                          </div>

                          <div className="flex justify-center py-4">
                            <div className="relative flex h-48 w-48 items-center justify-center">
                              <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background:
                                    'conic-gradient(from 90deg, #2e8b93 0deg, #2d58b8 135deg, #d75f5f 260deg, #c79a43 320deg, rgba(255,255,255,0) 320deg)',
                                  opacity: 0.18,
                                }}
                              />
                              <div
                                className="absolute inset-[12px] rounded-full"
                                style={{ backgroundColor: palette.paper, boxShadow: 'inset 0 0 0 1px rgba(16,32,56,0.08)' }}
                              />
                              <div className="relative text-center">
                                <div className="text-xs uppercase tracking-[0.28em]" style={{ color: palette.muted }}>
                                  Preview Score
                                </div>
                                <div className="mt-2 text-6xl font-black" style={{ color: palette.ink }}>
                                  {overallScore}
                                </div>
                                <div className="mt-2 text-sm font-medium" style={{ color: palette.teal }}>
                                  {describeBand(overallScore)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div
                            className="rounded-[24px] border p-4"
                            style={{ borderColor: 'rgba(215,95,95,0.16)', backgroundColor: palette.redSoft }}
                          >
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.red }}>
                              <CircleAlert size={16} />
                              非官方评分说明
                            </div>
                            <p className="text-sm leading-6" style={{ color: '#8f4646' }}>
                              这个分数来自“闪测样例 + 问卷均值 + 学科自评”的前端原型逻辑，只是为了让你直观看到网页结构是否成立，不代表锐满分 ASP 的正式报告结果。
                            </p>
                          </div>
                        </div>

                        <div
                          className="rounded-[34px] border p-6"
                          style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.74)' }}
                        >
                          <div className="mb-5 grid gap-5 md:grid-cols-2">
                            <AspResultBar label="记忆闪测" score={memoryScore} tone="blue" />
                            <AspResultBar label="学习执行" score={executionScore} tone="teal" />
                            <AspResultBar label="心理韧性" score={resilienceScore} tone="red" />
                            <AspResultBar label="学科自评" score={subjectScore} tone="gold" />
                          </div>

                          <div className="grid gap-5 lg:grid-cols-2">
                            <div
                              className="rounded-[26px] border p-4"
                              style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.82)' }}
                            >
                              <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.ink }}>
                                <Sparkles size={16} color={palette.teal} />
                                偏好标签
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {topPreferenceTraits.length ? (
                                  topPreferenceTraits.map((trait) => (
                                    <span
                                      key={trait}
                                      className="rounded-full border px-3 py-1 text-xs"
                                      style={{
                                        borderColor: 'rgba(46,139,147,0.16)',
                                        color: palette.teal,
                                        backgroundColor: palette.tealSoft,
                                      }}
                                    >
                                      {trait}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm" style={{ color: palette.muted }}>
                                    暂无偏好标签
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className="rounded-[26px] border p-4"
                              style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.82)' }}
                            >
                              <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.ink }}>
                                <BookOpen size={16} color={palette.blue} />
                                强项学科
                              </div>
                              <div className="space-y-3">
                                {strongSubjects.map((subject) => (
                                  <div key={subject.id} className="rounded-[22px] border p-3" style={{ borderColor: palette.line }}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold" style={{ color: palette.ink }}>
                                        {subject.name}
                                      </span>
                                      <span className="text-sm" style={{ color: palette.blue }}>
                                        {subjectRatings[subject.id]} / 5
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {subject.topics.slice(0, 2).map((topic) => (
                                        <span key={topic} className="text-xs" style={{ color: palette.muted }}>
                                          #{topic}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                        <div
                          className="rounded-[34px] border p-6"
                          style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.74)' }}
                        >
                          <div className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.ink }}>
                            <ClipboardCheck size={16} color={palette.red} />
                            重点关注建议
                          </div>
                          <div className="space-y-4">
                            {focusSubjects.map((subject) => (
                              <div
                                key={subject.id}
                                className="rounded-[24px] border p-4"
                                style={{ borderColor: 'rgba(215,95,95,0.14)', backgroundColor: 'rgba(253,229,225,0.58)' }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-base font-semibold" style={{ color: palette.ink }}>
                                    {subject.name}
                                  </div>
                                  <div className="text-sm font-medium" style={{ color: palette.red }}>
                                    当前 {subjectRatings[subject.id]} / 5
                                  </div>
                                </div>
                                <p className="mt-2 text-sm leading-6" style={{ color: '#8f4646' }}>
                                  可以把这一科放进结果页的“重点突破模块”，继续接正式题目、错题复盘或课程推荐。
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {subject.topics.slice(0, 3).map((topic) => (
                                    <span
                                      key={topic}
                                      className="rounded-full border px-3 py-1 text-xs"
                                      style={{ borderColor: 'rgba(215,95,95,0.18)', color: '#8f4646' }}
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div
                          className="rounded-[34px] border p-6"
                          style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.74)' }}
                        >
                          <div className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: palette.ink }}>
                            <Layers3 size={16} color={palette.gold} />
                            下一步可扩展方向
                          </div>
                          <div className="space-y-4">
                            {[
                              {
                                title: '接入正式答题卡',
                                text: '把当前步骤保存成后端记录，对应真实 ASP 的答题卡字段结构。',
                                icon: ClipboardCheck,
                              },
                              {
                                title: '细化报告模块',
                                text: '结果页拆成学习能力、学习策略、学习心理三个分卷结果，并增加文字解读。',
                                icon: NotebookPen,
                              },
                              {
                                title: '补充招生/顾问场景',
                                text: '可在结果页后接课程建议、试听转化按钮或顾问联系表单。',
                                icon: Sparkles,
                              },
                            ].map((item) => (
                              <div
                                key={item.title}
                                className="rounded-[24px] border p-4"
                                style={{ borderColor: palette.line, background: 'rgba(255,255,255,0.82)' }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="rounded-full bg-[#c79a4316] p-3 text-[#c79a43]">
                                    <item.icon size={16} />
                                  </div>
                                  <div>
                                    <div className="text-base font-semibold" style={{ color: palette.ink }}>
                                      {item.title}
                                    </div>
                                    <p className="mt-1 text-sm leading-6" style={{ color: palette.muted }}>
                                      {item.text}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => setStep(0)}
                              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                              style={{ borderColor: palette.line, color: palette.ink }}
                            >
                              <ChevronLeft size={16} />
                              返回第一页
                            </button>
                            <button
                              type="button"
                              onClick={resetAll}
                              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                              style={{ background: 'linear-gradient(135deg, #2e8b93, #2d58b8)' }}
                            >
                              <Sparkles size={16} />
                              重新体验
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
