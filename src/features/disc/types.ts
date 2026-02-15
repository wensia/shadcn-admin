/**
 * DISC 性格测试类型定义
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
  appointment_id?: string
  test_code?: string
}

// DISC 类型信息
export interface DISCTypeInfo {
  code: DISCDimension
  label: string
  description: string
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

// 后端返回的完整结果
export interface DISCResult {
  scores: Record<DISCDimension, number>
  primaryType: DISCTypeInfo
  graphs?: {
    external: DISCGraphData   // 现实中的我（外在行为）
    internal: DISCGraphData   // 本我（内在核心）
    selfImage: DISCGraphData  // 自我形象（综合认知）
  }
  rawData?: {
    mostCounts: Record<DISCDimension, number>
    leastCounts: Record<DISCDimension, number>
  }
  characteristics?: {
    primary: string[]
    secondary: string[]
  }
  communicationAdvice?: string[]
  potentialChallenges?: string[]
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

// DISC 测试链接
export interface DiscTestLink {
  id: string
  appointment_id: string
  name: string
  phone?: string
  test_url: string
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED'
  test_record_id?: string
  expires_at?: string
  completed_at?: string
  notes?: string
  created_at: string
}

// 创建链接请求
export interface DiscTestLinkCreate {
  name: string
  phone?: string
  notes?: string
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
  D: { label: '支配型', color: '#dc2626', bgColor: '#fff1f0', description: '直接果断、竞争意识强、喜欢挑战、行动迅速' },
  I: { label: '影响型', color: '#ea580c', bgColor: '#fff7e6', description: '热情乐观、善于社交、富有创造力、喜欢认可' },
  S: { label: '稳健型', color: '#16a34a', bgColor: '#e6fffb', description: '耐心友善、重视团队、可靠稳定、善于倾听' },
  C: { label: '服从型', color: '#2563eb', bgColor: '#e6f7ff', description: '精确细致、注重细节、善于分析、重视规则' },
}
