/**
 * DISC 性格测试类型定义 - 通用职场版
 */

// DISC 维度
export type DISCDimension = 'D' | 'I' | 'S' | 'C'

// 单个选项
export interface DISCOption {
  label: string
  dimension: DISCDimension
}

// 单道题
export interface DISCQuestion {
  id: number
  scenario?: string   // 场景描述
  category?: string   // 场景类别
  options: DISCOption[]
}

// 单题答案
export interface DISCAnswer {
  most: number | null  // 选项索引 0-3
  least: number | null // 选项索引 0-3
}

// 测试提交数据
export interface DISCTestSubmitData {
  name: string
  phone: string
  answers: DISCAnswer[]
  test_code?: string
  start_time?: string | null
  ref?: string
}

// DISC 类型信息
export interface DISCTypeInfo {
  code: DISCDimension
  label: string
  description: string
  score?: number
}

// DISC 图表数据（单张图）
export interface DISCGraphData {
  label: string
  description: string
  D: number
  I: number
  S: number
  C: number
}

// 维度匹配详情
export interface DISCDimensionDetail {
  userScore: number
  idealScore: number
  diff: number
  weight: number
  contribution: number
}

// 岗位适配度单项
export interface DISCJobFitItem {
  jobKey: string
  jobName: string
  matchScore: number
  idealScores: Record<DISCDimension, number>
  dimensionDetails?: Record<DISCDimension, DISCDimensionDetail>
  strengths?: DISCDimension[]
  gaps?: DISCDimension[]
  fitReason?: string
}

// 岗位适配度
export interface DISCJobFit {
  items: DISCJobFitItem[]
  bestMatch: string | null
}

// 后端返回的完整结果
export interface DISCResult {
  scores: Record<DISCDimension, number>
  primaryType: DISCTypeInfo
  secondaryType?: DISCTypeInfo
  graphs?: {
    external: DISCGraphData   // 现实中的我（外在行为）
    internal: DISCGraphData   // 压力下的我（压力下的行为倾向）
    selfImage: DISCGraphData  // 自我形象（综合认知）
  }
  rawData?: {
    mostCounts: Record<DISCDimension, number>
    leastCounts: Record<DISCDimension, number>
    rawScores?: Record<DISCDimension, number>
  }
  jobFit?: DISCJobFit
  interpretation?: Record<DISCDimension, string>
  characteristics?: {
    primary: string[]
    secondary: string[]
  }
  communicationAdvice?: string[]
  potentialChallenges?: string[]
  confidence?: {
    level: 'high' | 'medium' | 'low' | string
    score: number
    gap: number
    primaryScore: number
    secondaryScore: number
    reason: string
  }
  mixedType?: {
    code: string
    label: string
    tendency: 'strong' | 'moderate' | 'light' | string
    tendencyLabel: string
    gap: number
    description: string
  } | null
  testDate?: string
  calculationMethod?: string
  aiAnalysis?: DISCAIAnalysis
}

// AI 辅助分析结果
export interface DISCAIAnalysis {
  version: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  analyzedAt?: string
  /** v2 craft-md 格式：完整 markdown 报告 */
  format?: 'craft-md' | 'json'
  content?: string
  /** v1 JSON 格式字段（旧版兼容） */
  personalityProfile: string
  dimensionInsights: Record<'D' | 'I' | 'S' | 'C', string>
  communicationStrategy: string[]
  riskAnalysis: string[]
  developmentPlan: string[]
  teamCollaboration: string
  industryInsights: string
  jobFitAnalysis?: {
    summary?: string | null
    bestMatch?: {
      jobName: string
      matchLevel: string
      analysis: string
    } | null
    otherMatches?: Array<{
      jobName: string
      matchLevel: string
      brief: string
    }>
    developmentAdvice?: string | null
    // 兼容旧版数据
    bestMatchReason?: string | null
    developmentRole?: string | null
    topJobInsights?: Record<string, string>
  } | null
  error?: string | null
}

// 临时 DISC 记录列表项
export interface TempDISCRecordListItem {
  id: string
  test_record_id?: string
  name: string
  phone?: string
  d_score?: number
  i_score?: number
  s_score?: number
  c_score?: number
  primary_type?: string
  confidence_level?: 'high' | 'medium' | 'low' | string
  confidence_score?: number
  mixed_type_code?: string
  has_mixed_type?: boolean
  ai_analysis_status?: 'pending' | 'processing' | 'completed' | 'failed' | string | null
  best_match_job?: string | null
  submitted_at: string
  is_migrated: boolean
  created_at: string
}

// 临时 DISC 记录详情
export interface TempDISCRecordDetail {
  id: string
  test_record_id?: string
  name: string
  phone?: string
  result: DISCResult
  submitted_at: string
  ip_address?: string
  is_migrated: boolean
  migrated_at?: string
  notes?: string
  created_at: string
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  total_pages?: number
}

// DISC 类型配置（颜色、标签等）
export const DISC_TYPE_CONFIG: Record<DISCDimension, {
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  D: { label: '支配型', color: '#dc2626', bgColor: '#fff1f0', description: '目标导向、执行力强、善于快速决策和资源调度' },
  I: { label: '影响型', color: '#ea580c', bgColor: '#fff7e6', description: '善于沟通表达、社交能力强、善于激发团队热情' },
  S: { label: '稳健型', color: '#16a34a', bgColor: '#e6fffb', description: '耐心倾听、稳定可靠、善于维护团队和谐' },
  C: { label: '谨慎型', color: '#2563eb', bgColor: '#e6f7ff', description: '做事严谨细致、善于数据分析、注重流程规范' },
}
