/**
 * craft-md → 结构化数据解析器
 *
 * 将 AI 返回的 craft-md Markdown 报告解析为 ParsedDiscReport 结构，
 * 交给各 Section 组件渲染。
 *
 * 设计原则：
 * - 基于正则的章节分割，不依赖 AST
 * - 每个字段完全容错，解析失败返回默认值，不抛异常
 * - 不修改原文中的内联标记，由 inline-markup.tsx 渲染
 */

import type {
  ParsedDiscReport,
  ParsedDimension,
  DatatableData,
  InsightData,
  AdviceItem,
} from './report-types'

type DISCDim = 'D' | 'I' | 'S' | 'C'

// ── 工具函数 ──────────────────────────────────────────────────────────────────

/** 按 ## 标题分割为 sections，返回 [sectionTitle, sectionBody][] */
function splitSections(md: string): Array<[string, string]> {
  const sections: Array<[string, string]> = []
  // 匹配 ## 开头的行（不匹配 ### 或更深层级）
  const regex = /^## (.+)$/gm
  const matches: Array<{ title: string; index: number; fullLen: number }> = []

  let match: RegExpExecArray | null
  while ((match = regex.exec(md)) !== null) {
    matches.push({ title: match[1].trim(), index: match.index, fullLen: match[0].length })
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].fullLen // 跳过整个 "## title" 行
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length
    sections.push([matches[i].title, md.slice(start, end).trim()])
  }

  return sections
}

/** 从 section body 中提取 ```lang ... ``` 代码块 */
function extractCodeBlock(body: string, lang: string): string | null {
  const regex = new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)\\n```', 'g')
  const match = regex.exec(body)
  return match ? match[1].trim() : null
}

/** 安全 JSON.parse */
function safeJsonParse<T>(json: string | null): T | null {
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

/** 从文本中去掉所有代码块 */
function stripCodeBlocks(body: string): string {
  return body.replace(/```\w*\s*\n[\s\S]*?\n```/g, '').trim()
}

// ── 标题 & 元信息解析 ────────────────────────────────────────────────────────

function parseTitle(md: string): string {
  const match = /^# (.+)$/m.exec(md)
  return match ? match[1].trim() : 'DISC 性格分析报告'
}

function parseMeta(md: string): ParsedDiscReport['meta'] {
  const defaults = { testDate: '', primaryType: '', secondaryType: '' }
  // 匹配 > **测试日期**：... | **主类型**：... | **次类型**：...
  const match = /^>\s*(.+)$/m.exec(md)
  if (!match) return defaults

  const line = match[1]
  const dateMatch = /\*\*测试日期\*\*[：:]\s*([^|*]+)/i.exec(line)
  const primaryMatch = /\*\*主类型\*\*[：:]\s*([^|*]+)/i.exec(line)
  const secondaryMatch = /\*\*次类型\*\*[：:]\s*([^|*]+)/i.exec(line)

  return {
    testDate: dateMatch ? dateMatch[1].trim() : '',
    primaryType: primaryMatch ? primaryMatch[1].trim() : '',
    secondaryType: secondaryMatch ? secondaryMatch[1].trim() : '',
  }
}

// ── 综合画像（# 标题和 > meta 之后、第一个 ## 之前的段落） ────────────────────

function parseProfile(md: string): string {
  // 取第一个 ## 之前的内容
  const firstH2 = md.indexOf('\n## ')
  const beforeH2 = firstH2 > 0 ? md.slice(0, firstH2) : md

  // 跳过 # 标题行和 > 引用行
  const lines = beforeH2.split('\n').filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith('# ') &&
      !trimmed.startsWith('> ')
    )
  })

  return lines.join('\n').trim()
}

// ── 四维深度解读 ─────────────────────────────────────────────────────────────

const DIM_MAP: Record<string, { dim: DISCDim; label: string }> = {
  'D': { dim: 'D', label: '支配' },
  'I': { dim: 'I', label: '影响' },
  'S': { dim: 'S', label: '稳健' },
  'C': { dim: 'C', label: '谨慎' },
}

function parseDimensions(body: string): ParsedDimension[] {
  const dimensions: ParsedDimension[] = []

  // 按 ### 分割子章节
  const subSections = body.split(/^### /m).filter(Boolean)

  for (const sub of subSections) {
    const firstLine = sub.split('\n')[0].trim()
    // 从 "D 支配" / "I 影响" 等获取维度
    const dimChar = firstLine.charAt(0).toUpperCase() as DISCDim
    const dimInfo = DIM_MAP[dimChar]
    if (!dimInfo) continue

    const rest = sub.slice(firstLine.length).trim()

    // 从 blockquote 提取分数和标签：> <mark>72%</mark> <mark>决策力</mark> · <mark>推动力</mark>
    let score = 0
    const tags: string[] = []
    const blockquoteMatch = /^>\s*(.+)$/m.exec(rest)
    if (blockquoteMatch) {
      const bqLine = blockquoteMatch[1]
      // 提取所有 <mark>...</mark> 内容
      const markRegex = /<mark>([^<]*)<\/mark>/g
      let m: RegExpExecArray | null
      while ((m = markRegex.exec(bqLine)) !== null) {
        const content = m[1].trim()
        // 如果内容是百分数，当作 score
        const pctMatch = /^(\d+)%$/.exec(content)
        if (pctMatch) {
          score = parseInt(pctMatch[1], 10)
        } else if (content) {
          tags.push(content)
        }
      }
    }

    // blockquote 之后的段落就是 body
    const bodyLines = rest.split('\n').filter((line) => {
      const trimmed = line.trim()
      return trimmed.length > 0 && !trimmed.startsWith('> ')
    })
    const bodyText = bodyLines.join('\n').trim()

    dimensions.push({
      dim: dimInfo.dim,
      label: dimInfo.label,
      score,
      tags,
      body: bodyText,
    })
  }

  return dimensions
}

// ── 建议解析（沟通策略/风险关注/发展方向） ────────────────────────────────────

function parseAdviceSection(body: string): {
  communicationStrategies: AdviceItem[]
  riskConcerns: AdviceItem[]
  developmentDirections: AdviceItem[]
} {
  const result = {
    communicationStrategies: [] as AdviceItem[],
    riskConcerns: [] as AdviceItem[],
    developmentDirections: [] as AdviceItem[],
  }

  // 按 ### 分割
  const subSections = body.split(/^### /m).filter(Boolean)

  for (const sub of subSections) {
    const firstLine = sub.split('\n')[0].trim()
    const rest = sub.slice(firstLine.length).trim()

    let target: AdviceItem[]
    if (/沟通/.test(firstLine)) {
      target = result.communicationStrategies
    } else if (/风险/.test(firstLine)) {
      target = result.riskConcerns
    } else if (/发展/.test(firstLine)) {
      target = result.developmentDirections
    } else {
      continue
    }

    // 解析列表项：- <mark>关键词</mark>：说明
    const items = parseAdviceItems(rest)
    target.push(...items)
  }

  return result
}

function parseAdviceItems(text: string): AdviceItem[] {
  const items: AdviceItem[] = []
  // 匹配以 - 开头的列表项（可能跨行）
  const lines = text.split('\n')
  let currentItem: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (currentItem !== null) {
        items.push(parseOneAdviceItem(currentItem))
      }
      currentItem = trimmed.slice(2)
    } else if (currentItem !== null && trimmed.length > 0) {
      // 续行
      currentItem += ' ' + trimmed
    }
  }
  if (currentItem !== null) {
    items.push(parseOneAdviceItem(currentItem))
  }

  return items
}

function parseOneAdviceItem(raw: string): AdviceItem {
  // 从 <mark>关键词</mark>：说明 中提取
  const markMatch = /^<mark>([^<]*)<\/mark>[：:]\s*([\s\S]*)$/.exec(raw)
  if (markMatch) {
    return { tag: markMatch[1].trim(), text: markMatch[2].trim() }
  }
  // fallback：没有 mark 标签，整行当 text
  return { tag: '', text: raw.trim() }
}

// ── 主解析函数 ───────────────────────────────────────────────────────────────

export function parseDiscReport(markdown: string): ParsedDiscReport {
  const title = parseTitle(markdown)
  const meta = parseMeta(markdown)
  const profile = parseProfile(markdown)
  const sections = splitSections(markdown)

  let dimensions: ParsedDimension[] = []
  let behaviorTable: DatatableData | null = null
  let behaviorInsight: InsightData | null = null
  let jobFitTable: DatatableData | null = null
  let bestMatchAnalysis = ''
  let communicationStrategies: AdviceItem[] = []
  let riskConcerns: AdviceItem[] = []
  let developmentDirections: AdviceItem[] = []
  let teamAdvice = ''

  for (const [sectionTitle, sectionBody] of sections) {
    if (/四维/.test(sectionTitle)) {
      dimensions = parseDimensions(sectionBody)
    } else if (/行为模式/.test(sectionTitle)) {
      const dtCode = extractCodeBlock(sectionBody, 'datatable')
      behaviorTable = safeJsonParse<DatatableData>(dtCode)
      const insightCode = extractCodeBlock(sectionBody, 'insight')
      behaviorInsight = safeJsonParse<InsightData>(insightCode)
    } else if (/岗位适配/.test(sectionTitle)) {
      const dtCode = extractCodeBlock(sectionBody, 'datatable')
      jobFitTable = safeJsonParse<DatatableData>(dtCode)
    } else if (/最佳匹配/.test(sectionTitle)) {
      bestMatchAnalysis = stripCodeBlocks(sectionBody)
    } else if (/沟通.*管理|管理.*建议/.test(sectionTitle)) {
      const parsed = parseAdviceSection(sectionBody)
      communicationStrategies = parsed.communicationStrategies
      riskConcerns = parsed.riskConcerns
      developmentDirections = parsed.developmentDirections
    } else if (/团队/.test(sectionTitle)) {
      teamAdvice = stripCodeBlocks(sectionBody)
    }
  }

  return {
    title,
    meta,
    profile,
    dimensions,
    behaviorTable,
    behaviorInsight,
    jobFitTable,
    bestMatchAnalysis,
    communicationStrategies,
    riskConcerns,
    developmentDirections,
    teamAdvice,
  }
}
