/**
 * DISC 报告解析后的结构化类型定义
 *
 * 由 report-parser.ts 将 craft-md Markdown 解析为这些结构，
 * 再交给各 Section 组件渲染。
 */

// ── Datatable 数据（与 craft-renderer 中的 DatatableData 对齐） ──────────────

export interface DatatableColumn {
  key: string
  label: string
  type?: 'text' | 'number' | 'currency' | 'percent' | 'boolean' | 'date' | 'badge'
  align?: 'left' | 'center' | 'right'
}

export interface DatatableData {
  title?: string
  columns: DatatableColumn[]
  rows: Record<string, unknown>[]
}

// ── Insight 数据（与 craft-renderer 中的 InsightData 对齐） ──────────────────

export interface InsightItem {
  dim: 'D' | 'I' | 'S' | 'C'
  label: string
  insight: string
  tag?: string
}

export interface InsightData {
  items: InsightItem[]
  summary?: string
}

// ── 四维解读 ─────────────────────────────────────────────────────────────────

export interface ParsedDimension {
  dim: 'D' | 'I' | 'S' | 'C'
  label: string            // "支配" / "影响" / "稳健" / "谨慎"
  score: number            // 百分位 0-100
  tags: string[]           // 能力标签：["决策力", "推动力", "目标感"]
  body: string             // 深度解读段落（含内联标记原文）
}

// ── 建议条目 ─────────────────────────────────────────────────────────────────

export interface AdviceItem {
  tag: string              // <mark> 标签内容，如 "直奔主题"
  text: string             // 标签后的详细描述（含内联标记原文）
}

// ── 完整报告结构 ─────────────────────────────────────────────────────────────

export interface ParsedDiscReport {
  title: string
  meta: {
    testDate: string
    primaryType: string
    secondaryType: string
  }
  profile: string                        // 综合画像段落（含内联标记原文）
  dimensions: ParsedDimension[]          // D/I/S/C 四维解读
  behaviorTable: DatatableData | null    // 三图数据表
  behaviorInsight: InsightData | null    // 行为洞察卡片
  jobFitTable: DatatableData | null      // 岗位适配排名表
  bestMatchAnalysis: string              // 最佳匹配深度分析
  communicationStrategies: AdviceItem[]  // 沟通策略
  riskConcerns: AdviceItem[]             // 风险关注
  developmentDirections: AdviceItem[]    // 发展方向
  teamAdvice: string                     // 团队协作建议
}
