/**
 * 云客模块类型定义
 */

// 云客管理员状态
export interface YunkeAdminStatus {
  logged_in: boolean
  cookies_count?: number
  cookies_keys?: string[]
}

// 云客管理员登录响应
export interface YunkeAdminLoginResponse {
  cookies_saved: boolean
  ttl: number
  message: string
}

// 云客子账号
export interface YunkeSubAccount {
  id: string
  phone: string
  username: string
  real_name: string
  department_name?: string
  position?: string
  role_name?: string
  status: 'active' | 'paused' | 'inactive'
  create_time?: string
  last_login_time?: string
  auth_status?: string
  is_admin?: boolean
  user_type?: string
  bound_employee?: {
    id: string
    name: string
    username: string
  }
  // 登录状态（基于绑定员工的 cookies）
  login_status?: {
    is_logged_in: boolean
    has_password: boolean
  }
  // 来源凭证信息（从多凭证 API 返回时填充）
  source_account_id?: string
  source_account_phone?: string
  source_company_name?: string
}

// 可绑定的员工
export interface YunkeAvailableEmployee {
  id: string
  name: string
  username: string
  campus_name?: string
  position_name?: string
  bound_yunke?: {
    phone: string
    real_name: string
    yunke_user_id?: string
    source_account_id?: string
  }
  bound_yunke_accounts?: Array<{
    phone?: string
    real_name?: string
    yunke_user_id?: string
    source_account_id?: string
  }>
}

// 密码重置响应
export interface YunkePasswordResetResponse {
  new_password: string
  sync_status?: string
  bound_employee?: {
    id: string
    name: string
    username: string
  }
}

// 批量登录结果
export interface YunkeBatchLoginResult {
  total: number
  success: number
  failed: number
  skipped: number
  details: Array<{
    employee_id: string
    employee_name: string
    yunke_phone?: string
    status: 'success' | 'failed' | 'skipped'
    message: string
    update_time?: string
  }>
}

// 登录状态检查结果
export interface YunkeLoginStatusResult {
  total: number
  logged_in: number
  not_logged_in: number
  details: Array<{
    employee_id: string
    employee_name: string
    yunke_phone: string | null
    is_logged_in: boolean
    check_time: string
    message: string
  }>
}

// 自动同步绑定结果
export interface YunkeAutoSyncResult {
  total: number
  matched: number
  details: Array<{
    yunke_name: string
    employee_name: string
    status: string
  }>
}

// ============ AI 分析 ============

export interface AIAnalysisSupport {
  id: string
  turn_index: number
  speaker: string
  time_range: string
  quote: string
}

export interface AIAnalysisEvidence {
  claim: string
  support_ids: string[]
}

export interface AIAnalysisRiskFlag {
  type: string
  severity: 'high' | 'medium' | 'low' | string
  detail: string
  support_ids: string[]
  deduction?: number
}

export interface AIAnalysisComplianceAdjustment {
  base_score: number
  auto_deduction: number
  final_score: number
  reasons: string[]
  ignored_without_evidence?: number
}

export type AIAnalysisScoreDimension =
  | 'opening'
  | 'needs_discovery'
  | 'product_intro'
  | 'objection_handling'
  | 'closing'
  | 'communication'
  | 'compliance'
  | 'ending'

export interface AIAnalysisScorecardItem {
  score: number
  max_score: number
  rationale: string
  support_ids: string[]
}

export interface AIAnalysisImprovementItem {
  dimension: AIAnalysisScoreDimension
  priority: 'high' | 'medium' | 'low'
  suggestion: string
}

// AI 分析结果
export interface AIAnalysisResult {
  version?: number
  summary: string
  customer_intent: 'high' | 'medium' | 'low' | 'none'
  key_info: {
    customer_needs: string[]
    objections: string[]
    follow_up_times: string[]
    competitors_mentioned: string[]
    decision_makers: string[]
  }
  quality_score: number
  quality_feedback: string
  improvements?: Array<string | AIAnalysisImprovementItem>
  scores?: {
    opening?: number
    needs_discovery?: number
    product_intro?: number
    objection_handling?: number
    closing?: number
    communication?: number
    compliance?: number
    ending?: number
  }
  label?: {
    primary?: string
    secondary?: string
  }
  scorecard?: {
    opening: AIAnalysisScorecardItem
    needs_discovery: AIAnalysisScorecardItem
    product_intro: AIAnalysisScorecardItem
    objection_handling: AIAnalysisScorecardItem
    closing: AIAnalysisScorecardItem
    communication: AIAnalysisScorecardItem
    compliance: AIAnalysisScorecardItem
    ending: AIAnalysisScorecardItem
  }
  supports?: AIAnalysisSupport[]
  evidence?: AIAnalysisEvidence[]
  risk_flags?: AIAnalysisRiskFlag[]
  compliance_adjustment?: AIAnalysisComplianceAdjustment
  validation_warnings?: string[]
  validation_errors?: string[]
  prompt_name?: string
  prompt_version?: number
  model_config?: string
}

// ============ 通话记录 ============

// 转写文本段落
export interface TranscriptSegment {
  speaker: string
  start_time: number
  end_time: number
  text: string
}

// 通话记录
export interface CallRecord {
  id: string
  source: string
  record_id: string
  caller: string | null
  callee: string | null
  call_time: string | null
  duration: number | null
  call_type: string | null
  call_result: string | null
  customer_name: string | null
  staff_name: string | null
  department: string | null
  has_recording: boolean
  transcript?: TranscriptSegment[] | null
  transcript_status: string | null
  ai_analysis?: AIAnalysisResult | null
  ai_analysis_status: string | null
  ai_analyzed_at: string | null
  created_at: string
  // 列表汇总字段（列表 API 返回，避免传输大字段）
  has_transcript?: boolean
  ai_quality_score?: number | null
  ai_customer_intent?: string | null
  ai_label_primary?: string | null
  // CRM 关联字段
  lead_id?: string | null
  lead_child_name?: string | null
  lead_status?: string | null
  employee_id?: string | null
}

// 通话记录查询参数
export interface CallRecordListParams {
  page?: number
  size?: number
  start_date?: string
  end_date?: string
  department?: string
  staff_name?: string
  call_type?: string
  call_result?: string
  has_recording?: boolean
  transcript_status?: string
  min_duration?: number
  max_duration?: number
  search?: string
  ai_analysis_status?: string
  min_score?: number
  max_score?: number
}

// 通话统计数据
export interface CallRecordStats {
  today_count: number
  today_duration: number
  answered_count: number
  answer_rate: number
  total_count: number
}

// 录音 URL 请求
export interface RecordUrlRequest {
  voice_id: string
}

// 录音 URL 响应
export interface RecordUrlResponse {
  url: string
  expires_in?: number
}

// 兼容旧类型（保留）
export interface YunkeCallRecord {
  id: string
  caller_phone: string
  callee_phone: string
  caller_name?: string
  callee_name?: string
  start_time: string
  end_time?: string
  duration: number
  status: string
  record_url?: string
  created_at: string
}

// 云客仪表盘统计
export interface YunkeDashboardStats {
  total_accounts: number
  active_accounts: number
  logged_in_accounts: number
  bound_employees: number
  today_calls: number
  today_duration: number
}

// ============ 云客账号凭证管理 ============

// 云客账号凭证
export interface YunkeCredential {
  id: string
  phone: string
  company_id: string
  company_code: string | null
  company_name: string | null
  root_dept_id: string | null // 根部门ID
  user_id: string | null
  status: number // 0=失效, 1=正常
  last_login: string | null
  created_at: string | null
  updated_at: string | null
  notify_robot_id: string | null // 通知机器人ID
  notify_robot_name: string | null // 通知机器人名称
}

// 创建账号凭证请求
export interface YunkeCredentialCreate {
  phone: string
  password: string
  company_code: string
  company_name: string
  domain?: string
}

// 更新账号凭证请求
export interface YunkeCredentialUpdate {
  phone?: string
  password?: string
  company_code?: string
  company_name?: string
  domain?: string
  notify_robot_id?: string // 通知机器人ID，空字符串表示清除
}

// 账号状态响应
export interface YunkeCredentialStatus {
  valid: boolean
  status: number
  last_login: string | null
  hours_since_login: number | null
  message: string
}

// 账号列表响应
export interface YunkeCredentialListResponse {
  items: YunkeCredential[]
  total: number
}

// ========================================================================
// 一键建咨询师（onboarding）相关类型
// ========================================================================

export interface YunkeOnboardingOptions {
  /** 云客部门树原始结构（嵌套；每个节点至少有 id + name + children） */
  dept_tree: YunkeDeptNode[] | null
  /** 云客角色列表（含「咨询师」） */
  roles: YunkeRole[] | null
  /** 所选 credential 对应的云客公司信息 */
  company: {
    id: string
    company_code: string | null
    company_name: string | null
    domain: string | null
  }
}

export interface YunkeDeptNode {
  id: string
  name: string
  parentId?: string
  children?: YunkeDeptNode[]
  [key: string]: unknown
}

export interface YunkeRole {
  id: string
  name: string
  [key: string]: unknown
}

export interface OnboardingCreateConsultantRequest {
  employee_id: string
  identity_id: string
  yunke_admin_account_id: string
  yunke_dept_id: string
  yunke_role_id: string
  yunke_major?: string
  send_sms?: 0 | 1
}

export interface OnboardingConsultantEmployee {
  id: string
  name: string
  username: string
  phone: string | null
  password: string | null
  joined_at: string | null
  scope_type: string | null
  campus: { id: string; name: string } | null
  department: { id: string; name: string } | null
  position: { id: string; name: string; level?: number | string } | null
}

export interface OnboardingConsultantYunke {
  phone: string
  yunke_user_id: string
  username: string
  password: string | null
  company_code: string
  login_type: string
  bound_at: string
  login_ok: boolean
  cookies_updated_at?: string
}

export interface OnboardingConsultantResult {
  employee: OnboardingConsultantEmployee
  yunke: OnboardingConsultantYunke | null
  step_errors: string[]
}

// 云客通话记录原始数据（从云客 API 实时查询返回）
export interface YunkeCallLogItem {
  id: string
  startCallTime: string // 通话开始时间
  callDuration: string // 格式化的通话时长，如 "0'07\""
  callSeconds: number // 通话时长（秒）
  createdTime: string // 创建时间
  ringTime: string // 振铃时间
  ringSecond: number // 振铃时长（秒）
  callStatus: number // 通话状态：0=未接通, 2=已接通
  incomingCall: number // 是否呼入：0=外呼, 1=呼入
  callNumber: string // 被叫号码
  simPhone: string // 主叫号码（SIM卡）
  userIdName: string // 员工姓名
  departmentList: string // 部门名称
  planCustomerName?: string // 客户名称
  planCustomerCompany?: string // 客户公司
  recordFile?: string // 录音文件URL
  companyCode: string
  userId: string
  departmentId: string
}
