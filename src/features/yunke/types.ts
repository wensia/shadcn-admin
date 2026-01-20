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
  }
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
  transcript: TranscriptSegment[] | null
  transcript_status: string | null
  created_at: string
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
  search?: string
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
  user_id: string | null
  status: number  // 0=失效, 1=正常
  last_login: string | null
  created_at: string | null
  updated_at: string | null
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
