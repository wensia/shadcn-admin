/**
 * 工具导航中心 — /tools
 * 统一管理所有公开工具（需兑换码）与内部管理页。
 * Anthropic 品牌风格。
 */

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import '../zhongkao/styles/anthropic.css'
import {
  GraduationCap,
  ClipboardCheck,
  Brain,
  FileQuestion,
  ArrowRight,
  KeyRound,
  ClipboardList,
  Shield,
  BookOpen,
  Link2,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ToolItem {
  id: string
  title: string
  description: string
  icon: LucideIcon
  url: string
  status: 'active' | 'coming'
  color: string
  tags: string[]
  requiresCode?: boolean
  category: 'public' | 'admin'
}

const tools: ToolItem[] = [
  // ─── 面向家长/学生的公开工具 ────────────────────────────────
  {
    id: 'zhongkao',
    title: '中考志愿填报',
    description: '输入一模成绩，智能推荐冲刺、稳妥、保底三档高中。支持南开、河西、和平、河东四区。',
    icon: GraduationCap,
    url: '/tools/zhongkao',
    status: 'active',
    color: '#d97757',
    tags: ['中考', '志愿', '分数对标'],
    requiresCode: true,
    category: 'public',
  },
  {
    id: 'xiaoshengchu',
    title: '小升初志愿模拟',
    description: '按片区填报初中志愿顺序，分析录取概率和风险等级，一键优化建议。',
    icon: BookOpen,
    url: '/tools/xiaoshengchu',
    status: 'active',
    color: '#788c5d',
    tags: ['小升初', '志愿', '河西区'],
    requiresCode: true,
    category: 'public',
  },
  {
    id: 'disc',
    title: 'DISC 性格测试',
    description: '通过 28 道情景题，评估你的支配型、影响型、稳健型、服从型特质分布。',
    icon: Brain,
    url: '/disc-test',
    status: 'active',
    color: '#6a9bcc',
    tags: ['性格', '职业', 'HR'],
    category: 'public',
  },
  {
    id: 'survey',
    title: '问卷调查',
    description: '自定义问卷模板，收集用户反馈和市场调研数据。支持多种题型。',
    icon: ClipboardCheck,
    url: '#',
    status: 'coming',
    color: '#788c5d',
    tags: ['问卷', '调研'],
    category: 'public',
  },
  {
    id: 'quiz',
    title: '知识测验',
    description: '创建在线测验，自动评分和成绩分析。适用于培训考核和学习评估。',
    icon: FileQuestion,
    url: '#',
    status: 'coming',
    color: '#b0aea5',
    tags: ['考试', '培训'],
    category: 'public',
  },

  // ─── 内部管理工具 ──────────────────────────────────────────
  {
    id: 'zhongkao-records',
    title: '中考分析记录',
    description: '查看所有通过中考志愿工具提交的分析记录，按区/时间/用户筛选，便于数据复盘。',
    icon: ClipboardList,
    url: '/tools/zhongkao-records',
    status: 'active',
    color: '#6a9bcc',
    tags: ['管理', '数据', '中考'],
    category: 'admin',
  },
  {
    id: 'redemption-codes',
    title: '兑换码管理',
    description: '为各工具生成、查询、撤销兑换码。支持批次管理与使用情况统计。',
    icon: KeyRound,
    url: '/tools/redemption-codes',
    status: 'active',
    color: '#d97757',
    tags: ['管理', '授权', '兑换码'],
    category: 'admin',
  },
  {
    id: 'quota-settings',
    title: '用量配额',
    description: '配置登录用户对各工具的每日/总量配额，防止滥用。',
    icon: Shield,
    url: '/tools/quota-settings',
    status: 'active',
    color: '#788c5d',
    tags: ['管理', '配额', '限流'],
    category: 'admin',
  },
]

function ToolCard({ tool }: { tool: ToolItem }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const isActive = tool.status === 'active' && tool.url !== '#'

  async function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}${tool.url}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // 老浏览器 fallback
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      onClick={() => isActive && navigate({ to: tool.url })}
      className={`group relative rounded-2xl border bg-white p-6 transition-all ${
        isActive
          ? 'cursor-pointer border-[#e8e6dc] shadow-sm hover:shadow-md hover:border-[#b0aea5]'
          : 'cursor-default border-[#e8e6dc]/60 opacity-70'
      }`}
    >
      {/* Status / code badge */}
      {!isActive && (
        <span
          className="absolute top-4 right-4 rounded-md bg-[#e8e6dc] px-2 py-0.5 text-[11px] text-[#b0aea5]"
          style={{ fontFamily: "var(--font-display-local)" }}
        >
          即将上线
        </span>
      )}
      {isActive && tool.requiresCode && (
        <span
          className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-md bg-[#d97757]/10 px-2 py-0.5 text-[11px] text-[#d97757]"
          style={{ fontFamily: "var(--font-display-local)" }}
        >
          <KeyRound size={11} />
          需要兑换码
        </span>
      )}

      {/* Icon */}
      <div
        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tool.color}15` }}
      >
        <tool.icon size={24} style={{ color: tool.color }} />
      </div>

      {/* Title */}
      <h3
        className="mb-2 text-[18px] font-semibold text-[#141413]"
        style={{ fontFamily: "var(--font-display-local)" }}
      >
        {tool.title}
      </h3>

      {/* Description — 单行，溢出原生悬浮提示 */}
      <p
        className="mb-4 truncate text-[14px] leading-relaxed text-[#b0aea5]"
        style={{ fontFamily: "var(--font-serif-local)" }}
        title={tool.description}
      >
        {tool.description}
      </p>

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tool.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-[#e8e6dc] px-2 py-0.5 text-[11px] text-[#b0aea5]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA + 复制链接 */}
      {isActive && (
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1 text-[13px] font-medium transition-colors group-hover:gap-2"
            style={{ color: tool.color, fontFamily: "var(--font-display-local)" }}
          >
            {tool.category === 'admin' ? '进入管理' : '开始使用'}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            title={copied ? '已复制' : '复制链接'}
            aria-label="复制链接"
            className="inline-flex items-center gap-1 rounded-md border border-[#e8e6dc] px-2 py-1 text-[11px] text-[#b0aea5] transition-colors hover:border-[#b0aea5] hover:text-[#141413]"
            style={{ fontFamily: "var(--font-display-local)" }}
          >
            {copied ? (
              <>
                <Check size={12} />
                已复制
              </>
            ) : (
              <>
                <Link2 size={12} />
                复制链接
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ kicker, title, desc }: { kicker: string; title: string; desc: string }) {
  return (
    <div className="mb-6">
      <p
        className="mb-1 text-[11px] font-medium tracking-wide uppercase text-[#b0aea5]"
        style={{ fontFamily: "var(--font-display-local)" }}
      >
        {kicker}
      </p>
      <h2
        className="mb-1 text-[22px] font-semibold text-[#141413]"
        style={{ fontFamily: "var(--font-display-local)" }}
      >
        {title}
      </h2>
      <p className="text-[13px] text-[#b0aea5]" style={{ fontFamily: "var(--font-serif-local)" }}>
        {desc}
      </p>
    </div>
  )
}

export function ToolsHubPage() {
  useDocumentTitle('工具中心')
  const publicTools = tools.filter((t) => t.category === 'public')
  const adminTools = tools.filter((t) => t.category === 'admin')
  const activeCount = tools.filter((t) => t.status === 'active').length

  return (
    <div className="tools-anthropic min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-16">
        {/* Header */}
        <div className="mb-14">
          <p
            className="mb-2 text-[12px] font-medium tracking-wide text-[#b0aea5]"
            style={{ fontFamily: "var(--font-display-local)" }}
          >
            工具中心
          </p>
          <h1
            className="mb-4 text-[36px] font-semibold leading-tight tracking-tight text-[#141413] sm:text-[42px]"
            style={{ fontFamily: "var(--font-display-local)" }}
          >
            选择一个工具开始
          </h1>
          <p className="text-[16px] text-[#b0aea5]" style={{ fontFamily: "var(--font-serif-local)" }}>
            {activeCount} 个工具可用，更多工具持续开发中
          </p>
        </div>

        {/* Public tools */}
        <div className="mb-16">
          <SectionHeader
            kicker="面向家长 / 学生"
            title="可用工具"
            desc="家长通过兑换码或登录访问，直接使用"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publicTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>

        {/* Admin tools */}
        <div className="mb-16">
          <SectionHeader
            kicker="内部管理"
            title="管理工具"
            desc="仅员工登录后可用，用于授权、配额和数据分析"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {adminTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-[13px] text-[#b0aea5]" style={{ fontFamily: "var(--font-serif-local)" }}>
            由 RuiMF 提供技术支持
          </p>
        </div>
      </div>
    </div>
  )
}
