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

// 通话记录
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
