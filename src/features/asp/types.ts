/** ASP 测评记录列表项 */
export interface AspRecordListItem {
  id: string
  test_record_id: string
  name: string
  phone: string
  stage: string
  stage_label: string
  memory_score: number | null
  execution_score: number | null
  resilience_score: number | null
  subject_score: number | null
  overall_score: number | null
  referred_by: string | null
  source_channel: string | null
  submitted_at: string | null
  created_at: string | null
}

/** ASP 测评记录详情 */
export interface AspRecordDetail extends AspRecordListItem {
  answers: Record<string, unknown>
  result: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
}

/** 学段配置 */
export const STAGE_OPTIONS = [
  { value: 'primary', label: '小学' },
  { value: 'junior', label: '初中' },
  { value: 'high-arts', label: '高中文科' },
  { value: 'high-science', label: '高中理科' },
] as const
