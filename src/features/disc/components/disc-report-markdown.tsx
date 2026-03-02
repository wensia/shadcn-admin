/**
 * DISC 专用精简 Markdown 渲染器
 *
 * 从 craft-renderer/markdown 的 full 模式裁剪而来，仅保留 DISC 报告实际使用的功能：
 * - react-markdown + remark-gfm + rehype-raw（项目共享依赖，零增量）
 * - datatable / insight 两个自定义代码块
 * - 标题、加粗、斜体、mark、引用、列表、分隔线
 *
 * 移除了 Mermaid、Shiki、Diff、JSON Tree、Spreadsheet、ResizableImage、
 * CollapsibleSection、preprocessLinks、wrapWithSafeProxy、MemoizedMarkdown 等重型模块。
 */

import * as React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { MarkdownDatatableBlock } from '@/lib/craft-renderer/markdown/MarkdownDatatableBlock'
import { MarkdownInsightBlock } from '@/lib/craft-renderer/markdown/MarkdownInsightBlock'

// D/I/S/C 维度色条映射
const DIMENSION_COLORS: Record<string, string> = {
  D: '#ef4444', // red
  I: '#f97316', // orange
  S: '#22c55e', // green
  C: '#3b82f6', // blue
}

/** 从标题文本中检测 D/I/S/C 维度关键词，返回对应颜色 */
function detectDimensionColor(children: React.ReactNode): string | null {
  const text = React.Children.toArray(children)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('')
  // 匹配以 "D -"、"D维度"、"D（" 等开头的标题，或包含"支配/Dominance"等关键词
  const patterns: [string, RegExp][] = [
    ['D', /^D\s*[-—（(·:：]|支配|Dominance/i],
    ['I', /^I\s*[-—（(·:：]|影响|Influence/i],
    ['S', /^S\s*[-—（(·:：]|稳健|Steadiness/i],
    ['C', /^C\s*[-—（(·:：]|谨慎|Compliance|Conscientiousness/i],
  ]
  for (const [dim, re] of patterns) {
    if (re.test(text)) return DIMENSION_COLORS[dim]
  }
  return null
}

const components: Partial<Components> = {
  // 代码块：仅处理 datatable / insight，其余 fallback 为 <pre><code>
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    const isBlock =
      'node' in props &&
      props.node?.position?.start.line !== props.node?.position?.end.line

    if (match || isBlock) {
      const code = String(children).replace(/\n$/, '')
      if (match?.[1] === 'datatable') {
        return <MarkdownDatatableBlock code={code} className="my-1" />
      }
      if (match?.[1] === 'insight') {
        return <MarkdownInsightBlock code={code} className="my-1" />
      }
      // 未识别的代码块 fallback
      return (
        <pre className="my-2 rounded-md bg-muted/50 p-3 overflow-x-auto text-sm">
          <code>{children}</code>
        </pre>
      )
    }

    // 行内代码
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em] font-mono">
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,

  // 段落
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,

  // 列表
  ul: ({ children }) => (
    <ul className="my-3 space-y-1.5 ps-[16px] pe-2 list-disc marker:text-[var(--md-bullets)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 space-y-1.5 pl-6 list-decimal">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // 表格
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-md border">
      <table className="min-w-full divide-y divide-border">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  th: ({ children }) => (
    <th className="text-left py-3 px-4 font-semibold text-sm">{children}</th>
  ),
  td: ({ children }) => <td className="py-3 px-4 text-sm">{children}</td>,
  tr: ({ children }) => (
    <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
  ),

  // 标题
  h1: ({ children }) => (
    <h1 className="font-sans text-[16px] font-bold mt-7 mb-4">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-sans text-[16px] font-semibold mt-6 mb-3 flex items-center gap-2">
      <span className="w-[3px] h-[1em] rounded-full bg-primary inline-block shrink-0" />
      {children}
    </h2>
  ),
  // h3：检测 D/I/S/C 维度标题，添加对应颜色左侧色条
  h3: ({ children }) => {
    const color = detectDimensionColor(children)
    return (
      <h3
        className="font-sans text-[15px] font-semibold mt-5 mb-3"
        style={
          color
            ? { borderLeft: `3px solid ${color}`, paddingLeft: 10 }
            : undefined
        }
      >
        {children}
      </h3>
    )
  },
  h4: ({ children }) => (
    <h4 className="text-[14px] font-semibold mt-3 mb-1">{children}</h4>
  ),

  // 引用块
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/40 bg-muted/30 pl-4 pr-3 py-1.5 my-2 rounded-r-md [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-1">
      {children}
    </blockquote>
  ),

  // 分隔线
  hr: () => <hr className="my-6 border-border" />,

  // 内联样式
  strong: ({ children }) => (
    <strong className="font-semibold text-primary/90">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  mark: ({ children }) => (
    <mark
      className="bg-primary/10 text-primary font-medium text-[0.9em] px-1.5 py-0.5 rounded-[4px]"
      style={{ textDecoration: 'none' }}
    >
      {children}
    </mark>
  ),

  // 链接（报告中极少使用，简单渲染即可）
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground hover:underline cursor-pointer"
    >
      {children}
    </a>
  ),
}

const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeRaw]

interface DiscReportMarkdownProps {
  children: string
  className?: string
}

export function DiscReportMarkdown({
  children,
  className,
}: DiscReportMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
