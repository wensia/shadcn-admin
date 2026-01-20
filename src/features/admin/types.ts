/**
 * Admin 管理后台类型定义
 * 从 frontend-vue/src/api/admin.ts 迁移
 */

// ============================================================================
// 组织架构实体类型
// ============================================================================

/** 大区 */
export interface RegionItem {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/** 地区 */
export interface DistrictItem {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  region_id: string
  region_name: string
  created_at?: string
  updated_at?: string
}

/** 区域 */
export interface AreaItem {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  district_id: string
  district_name: string
  region_name: string
  created_at?: string
  updated_at?: string
}

/** 校区 */
export interface CampusItem {
  id: string
  name: string
  description?: string
  address?: string
  contact_phone?: string
  sort_order: number
  is_active: boolean
  is_area_office: boolean
  area_id: string
  area_name: string
  district_name: string
  region_name: string
  managing_office_id?: string | null
  managing_office_name?: string | null
  created_at?: string
  updated_at?: string
}

/** 学校 */
export interface SchoolItem {
  id: string
  name: string
  province?: string
  city?: string
  district?: string
  address?: string
  contact_phone?: string
  remark?: string
  grade_levels: string[]
  created_at?: string
  updated_at?: string
}

/** 学校批量导入结果 */
export interface SchoolBulkImportResult {
  total_requested: number
  total_created: number
  created: string[]
  skipped_existing: string[]
}

/** 部门 */
export interface DepartmentItem {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/** 校区部门关联 */
export interface CampusDepartmentItem {
  id: string
  campus_id: string
  campus_name?: string
  department_id: string
  department_name?: string
  sort_order?: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  /** 负责人列表 */
  managers?: DepartmentManagerItem[]
  /** 负责人数量 */
  managers_count?: number
}

/** 负责人类型 */
export type ManagerType = 'manager' | 'deputy' | 'supervisor'

/** 部门负责人 */
export interface DepartmentManagerItem {
  id: string
  campus_department_id: string
  employee_id: string
  employee?: {
    id: string
    name: string
    username: string
    phone?: string
    email?: string
  }
  manager_type: ManagerType
  is_active: boolean
  appointed_at?: string
  created_at?: string
  updated_at?: string
}

/** 添加负责人请求 */
export interface DepartmentManagerCreate {
  employee_id: string
  manager_type: ManagerType
}

/** 负责人类型选项 */
export const MANAGER_TYPE_OPTIONS = [
  { label: '经理', value: 'manager' },
  { label: '副经理', value: 'deputy' },
  { label: '主管', value: 'supervisor' }
] as const

/** 职位 */
export interface PositionItem {
  id: string
  name: string
  code?: string
  level: number
  level_display: string
  description?: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// ============================================================================
// 员工相关类型
// ============================================================================

/** 云客账号信息 */
export interface YunkeInfo {
  phone?: string
  yunke_user_id?: string
  username?: string
  major?: string
  company_code?: string
  password?: string
  cookies?: unknown
  cookies_updated_at?: string
}

/** 员工 */
export interface EmployeeItem {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  yunke?: YunkeInfo
  is_active: boolean
  is_superuser: boolean
  joined_at?: string
  created_at?: string
  updated_at?: string
}

/** 员工身份 */
export interface EmployeeIdentityItem {
  id: string
  employee_id: string
  employee_name: string
  employee_username: string
  employee_joined_at?: string  // 员工入职日期
  campus_id: string
  campus_name: string
  department_id: string
  department_name: string
  position_id: string
  position_name: string
  position_level: string
  is_primary: boolean
  is_active: boolean
  effective_date?: string
  created_at: string
  updated_at?: string
}

// ============================================================================
// 管理层级相关
// ============================================================================

/** 下属信息 */
export interface SubordinateInfo {
  id: string
  name: string
  username: string
  email?: string
  phone?: string
  level: number
  campus?: string
  department?: string
  position?: string
  is_active: boolean
}

/** 管理范围 */
export interface ManagementScope {
  employee: {
    id: string
    name: string
    is_superuser: boolean
  }
  managed_departments: Array<{
    campus: string
    department: string
    role: 'manager' | 'deputy_manager'
  }>
  direct_reports: Array<{
    id: string
    name: string
  }>
  total_subordinates: number
  management_levels: number
}

// ============================================================================
// 组织架构树
// ============================================================================

/** 组织架构树节点 */
export interface OrganizationTreeNode {
  id: string
  name: string
  type: 'region' | 'district' | 'area' | 'area_office' | 'campus'
  is_active: boolean
  address?: string
  contact_phone?: string
  children?: OrganizationTreeNode[]
  campuses?: OrganizationTreeNode[]
  area_offices?: OrganizationTreeNode[]
}

/** 员工层级树节点 */
export interface EmployeeHierarchyNode {
  id: string
  name: string
  phone?: string
  email?: string
  is_superuser: boolean
  campus?: string
  department?: string
  position?: string
  children: EmployeeHierarchyNode[]
}

/** 员工下属响应 */
export interface EmployeeSubordinatesResponse {
  employee: {
    id: string
    name: string
    is_superuser: boolean
  }
  direct_reports: Array<{
    id: string
    name: string
    phone?: string
    email?: string
    is_active: boolean
  }>
  all_subordinates: SubordinateInfo[]
  total_count: number
  max_depth: number
}

/** 员工层级树响应 */
export interface EmployeeHierarchyTreeResponse {
  nodes: EmployeeHierarchyNode[]
  total_employees: number
}

// ============================================================================
// 统计和查询
// ============================================================================

/** 管理后台统计 */
export interface AdminStats {
  regions: number
  districts: number
  areas: number
  campuses: number
  departments: number
  positions: number
  employees: number
  active_employees: number
  superusers: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

/** 列表查询参数 */
export interface ListQuery {
  page?: number
  size?: number
  search?: string
  is_active?: boolean
}

// ============================================================================
// 创建/更新数据类型
// ============================================================================

/** 创建大区 */
export interface RegionCreate {
  name: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 更新大区 */
export interface RegionUpdate {
  name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 创建地区 */
export interface DistrictCreate {
  region_id: string
  name: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 更新地区 */
export interface DistrictUpdate {
  region_id?: string
  name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 创建区域 */
export interface AreaCreate {
  district_id: string
  name: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 更新区域 */
export interface AreaUpdate {
  district_id?: string
  name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 创建校区 */
export interface CampusCreate {
  area_id: string
  name: string
  description?: string
  address?: string
  contact_phone?: string
  sort_order?: number
  is_active?: boolean
  is_area_office?: boolean
  managing_office_id?: string | null
  auto_create_departments?: boolean
}

/** 更新校区 */
export interface CampusUpdate {
  area_id?: string
  name?: string
  description?: string
  address?: string
  contact_phone?: string
  sort_order?: number
  is_active?: boolean
  is_area_office?: boolean
  managing_office_id?: string | null
}

/** 创建学校 */
export interface SchoolCreate {
  name: string
  province?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
  contact_phone?: string | null
  remark?: string | null
  grade_levels: string[]
}

/** 更新学校 */
export interface SchoolUpdate {
  name?: string
  province?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
  contact_phone?: string | null
  remark?: string | null
  grade_levels?: string[]
}

/** 创建部门 */
export interface DepartmentCreate {
  name: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 更新部门 */
export interface DepartmentUpdate {
  name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 创建职位 */
export interface PositionCreate {
  name: string
  level: number
  code?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 更新职位 */
export interface PositionUpdate {
  name?: string
  level?: number
  code?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/** 创建员工 */
export interface EmployeeCreate {
  username: string
  name: string
  email?: string
  phone?: string
  is_active?: boolean
  is_superuser?: boolean
  joined_at?: string
}

/** 更新员工 */
export interface EmployeeUpdate {
  username?: string
  name?: string
  email?: string
  phone?: string
  is_active?: boolean
  is_superuser?: boolean
  joined_at?: string
}

/** 更新员工云客信息 */
export interface EmployeeYunkeUpdate {
  phone?: string
  password?: string
  company_code?: string
}

/** 快速创建员工 */
export interface QuickCreateEmployeeData {
  name: string
  campus_id: string
  department_id: string
  position_id: string
  joined_at?: string
}

/** 快速创建员工结果 */
export interface QuickCreateEmployeeResult {
  employee_id: string
  name: string
  username: string
  password: string
  joined_at?: string
  created_at: string
  campus: {
    id: string
    name: string
  }
  department: {
    id: string
    name: string
  }
  position: {
    id: string
    name: string
    level: number
  }
}

/** 创建员工身份 */
export interface EmployeeIdentityCreate {
  employee_id: string
  campus_id: string
  department_id: string
  position_id: string
  is_primary?: boolean
  is_active?: boolean
  effective_date?: string
}

/** 更新员工身份 */
export interface EmployeeIdentityUpdate {
  campus_id?: string
  department_id?: string
  position_id?: string
  is_primary?: boolean
  is_active?: boolean
  effective_date?: string
}

/** 创建校区部门关联 */
export interface CampusDepartmentCreate {
  campus_id: string
  department_id: string
  manager_id?: string
  deputy_manager_id?: string
  is_active?: boolean
}

/** 更新校区部门关联 */
export interface CampusDepartmentUpdate {
  manager_id?: string | null
  deputy_manager_id?: string | null
  is_active?: boolean
}

// ============================================================================
// 云客相关类型
// ============================================================================

/** 云客登录状态检查结果 */
export interface YunkeLoginStatusResult {
  total: number
  logged_in: number
  not_logged_in: number
  details: Array<{
    employee_id: string
    employee_name: string
    employee_username: string
    yunke_phone: string | null
    is_logged_in: boolean
    check_time: string
    message: string
  }>
}

/** 批量更新云客登录结果 */
export interface YunkeBatchLoginResult {
  total: number
  success: number
  failed: number
  skipped: number
  details: Array<{
    employee_id: string
    employee_name: string
    employee_username: string
    yunke_phone: string | null
    status: 'success' | 'failed' | 'skipped'
    message: string
    update_time: string
  }>
}

// ============================================================================
// 常量定义
// ============================================================================

/** 职位级别选项 */
export const POSITION_LEVELS = [
  { label: '专员', value: 1 },
  { label: '主管', value: 2 },
  { label: '经理', value: 3 },
  { label: '总监', value: 4 },
  { label: '副总裁', value: 5 },
  { label: '总裁', value: 6 }
] as const

/** 状态选项 */
export const STATUS_OPTIONS = [
  { label: '全部', value: undefined },
  { label: '启用', value: true },
  { label: '禁用', value: false }
] as const

// ============================================================================
// 来源渠道相关类型
// ============================================================================

/** 渠道字段配置 */
export interface ChannelFieldConfig {
  field_name: string
  field_label: string
  field_type: 'text' | 'select' | 'date' | 'datetime' | 'number' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: Array<{ label: string; value: string }>
  default_value?: unknown
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

/** 来源渠道 */
export interface SourceChannel {
  id: string
  name: string
  category: 'online' | 'offline' | 'referral' | 'event' | 'other'
  is_active: boolean
  sort_order: number
  description?: string
  extra_fields?: ChannelFieldConfig[]
  channel_config?: {
    fields?: ChannelFieldConfig[]
    extra_fields?: Record<string, {
      label: string
      type: string
      required?: boolean
      placeholder?: string
      default_value?: unknown
      max_length?: number
      min_length?: number
      error_message?: string
    }>
  }
  created_at: string
  updated_at: string
}

/** 来源渠道分类选项 */
export const SOURCE_CHANNEL_CATEGORIES = [
  { label: '线上', value: 'online' },
  { label: '线下', value: 'offline' },
  { label: '转介绍', value: 'referral' },
  { label: '活动', value: 'event' },
  { label: '其他', value: 'other' }
] as const

// ============================================================================
// 钉钉机器人相关类型
// ============================================================================

/** 消息类型 */
export type DingtalkMsgType = 'text' | 'markdown' | 'link' | 'actionCard' | 'feedCard'

/** 安全设置类型 */
export type DingtalkSecurityType = 'sign' | 'keyword' | 'ip'

/** 钉钉机器人 */
export interface DingtalkRobot {
  id: string
  name: string
  webhook: string
  security_type: DingtalkSecurityType
  secret_key?: string
  keywords?: string[]
  ip_whitelist?: string[]
  supported_msg_types: DingtalkMsgType[]
  description?: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  created_by_id: string
  updated_by_id?: string
}

/** 创建钉钉机器人 */
export interface DingtalkRobotCreate {
  name: string
  webhook: string
  security_type: DingtalkSecurityType
  secret_key?: string
  keywords?: string[]
  ip_whitelist?: string[]
  supported_msg_types: DingtalkMsgType[]
  description?: string
  is_active: boolean
  sort_order: number
}

/** 更新钉钉机器人 */
export interface DingtalkRobotUpdate {
  name?: string
  webhook?: string
  security_type?: DingtalkSecurityType
  secret_key?: string
  keywords?: string[]
  ip_whitelist?: string[]
  supported_msg_types?: DingtalkMsgType[]
  description?: string
  is_active?: boolean
  sort_order?: number
}

/** 钉钉机器人测试 */
export interface DingtalkRobotTest {
  webhook: string
  security_type: DingtalkSecurityType
  secret_key?: string
  keywords?: string[]
}

/** 消息类型选项 */
export const MESSAGE_TYPE_OPTIONS = [
  { label: '文本消息', value: 'text' },
  { label: 'Markdown消息', value: 'markdown' },
  { label: '链接消息', value: 'link' },
  { label: '卡片消息', value: 'actionCard' },
  { label: '订阅消息', value: 'feedCard' }
] as const

/** 安全设置类型选项 */
export const SECURITY_TYPE_OPTIONS = [
  { label: '加签验证', value: 'sign', description: '使用密钥进行加签验证，安全性高' },
  { label: '关键词验证', value: 'keyword', description: '消息内容必须包含指定关键词' },
  { label: 'IP白名单', value: 'ip', description: '限制发送消息的IP地址范围' }
] as const

// ============================================================================
// Webhook 钩子相关类型
// ============================================================================

/** 机器人信息 */
export interface RobotInfo {
  id: string
  name: string
  is_active: boolean
}

/** Webhook 钩子 */
export interface WebhookHook {
  id?: string
  name: string
  hook_key: string
  description?: string
  robot_ids: string[]
  robots?: RobotInfo[]
  message_template?: string
  message_type: 'text' | 'markdown'
  extra_config?: unknown
  is_active: boolean
  sort_order: number
  trigger_count?: number
  created_at?: string
  updated_at?: string
}

/** 创建 Webhook 钩子 */
export interface WebhookHookCreate {
  name: string
  hook_key: string
  description?: string
  robot_ids: string[]
  message_template?: string
  message_type: 'text' | 'markdown'
  extra_config?: unknown
  is_active?: boolean
  sort_order?: number
}

/** 更新 Webhook 钩子 */
export interface WebhookHookUpdate {
  name?: string
  description?: string
  robot_ids?: string[]
  message_template?: string
  message_type?: 'text' | 'markdown'
  extra_config?: unknown
  is_active?: boolean
  sort_order?: number
}

/** Webhook 触发响应 */
export interface WebhookTriggerResponse {
  success: boolean
  message: string
  sent_count: number
  failed_count: number
  details?: Array<{
    robot_id: string
    robot_name?: string
    success: boolean
    error?: string
  }>
}

// ============================================================================
// 课程相关类型
// ============================================================================

/** 课程 */
export interface Course {
  id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

/** 创建/更新课程 */
export interface CourseFormData {
  name: string
  is_active: boolean
  sort_order?: number
}

// ============================================================================
// 线索访问统计相关类型
// ============================================================================

/** 顾问访问统计 */
export interface AdvisorAccessStatistics {
  user_id: string
  user_name: string
  username: string
  campus_name: string
  area_name?: string
  district_name?: string
  region_name?: string
  view_count: number
  total_access: number
  daily_limit: number
  time_range: string
  start_date: string
  end_date: string
}

/** 统计汇总 */
export interface AccessStatisticsSummary {
  total_users: number
  active_users: number
  total_views: number
  total_access: number
  time_range: string
}

/** 访问日志 */
export interface AccessLog {
  id: string
  user_id: string
  user_name: string
  user_campus: string
  lead_id: string
  lead_name: string
  access_date: string
  access_time: string
  ip_address?: string
  user_agent?: string
}

/** 用户访问限制 */
export interface UserAccessLimit {
  user_id: string
  daily_limit: number
  is_active: boolean
}

/** 访问统计筛选 */
export interface AccessStatsFilters {
  time_range?: string
  campus_id?: string
  area_id?: string
  district_id?: string
  region_id?: string
}

/** 访问日志筛选 */
export interface AccessLogFilters {
  user_id?: string
  lead_id?: string
  start_date?: string
  end_date?: string
  campus_id?: string
  search?: string
  page?: number
  size?: number
}

/** 批量更新访问限制 */
export interface BatchUpdateLimit {
  user_id: string
  daily_limit: number
}

// ============================================================================
// 云客管理员相关类型
// ============================================================================

/** 云客管理员状态 */
export interface YunkeAdminStatus {
  logged_in: boolean
  cookies_count?: number
  cookies_keys?: string[]
}

/** 云客管理员登录响应 */
export interface YunkeAdminLoginResponse {
  cookies_saved: boolean
  ttl: number
  message: string
}

/** 云客子账号 */
export interface YunkeSubAccount {
  id: string
  phone: string
  username: string
  real_name: string
  department_name?: string
  position?: string
  status: 'active' | 'paused' | 'inactive'
  create_time?: string
  last_login_time?: string
  bound_employee?: {
    id: string
    name: string
    username: string
  }
}

/** 可绑定员工 */
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

/** 密码重置响应 */
export interface YunkePasswordResetResponse {
  new_password: string
  sync_status?: string
  bound_employee?: {
    id: string
    name: string
    username: string
  }
}

/** 批量登录更新结果 */
export interface YunkeBatchLoginResult {
  total: number
  success: number
  failed: number
  skipped: number
  details: Array<{
    employee_id: string
    employee_name: string
    employee_username: string
    yunke_phone?: string
    status: 'success' | 'failed' | 'skipped'
    message: string
    update_time?: string
  }>
}

/** 登录状态检查结果 */
export interface YunkeLoginStatusResult {
  total: number
  logged_in: number
  details: Array<{
    employee_id: string
    is_logged_in: boolean
    message: string
  }>
}

// ============================================================================
// API 密钥相关类型
// ============================================================================

/** API 密钥信息 */
export interface ApiKeyInfo {
  prefix: string
  name: string
  scopes: Record<string, string[]>
  created_at: string
  expires_at?: string
  last_used_at?: string
  is_expired: boolean
}

/** 员工 API 密钥信息 */
export interface EmployeeApiKeyInfo {
  employee_id: string
  username: string
  name: string
  is_active: boolean
  has_api_key: boolean
  api_key?: ApiKeyInfo
}

/** 创建 API 密钥请求 */
export interface ApiKeyCreate {
  name: string
  scopes?: Record<string, string[]>
  expires_in_days?: number
}

/** 创建 API 密钥响应 */
export interface ApiKeyCreateResponse {
  employee_id: string
  username: string
  name: string
  api_key: string
  info: ApiKeyInfo
  warning: string
}

/** 更新权限范围请求 */
export interface ApiKeyScopesUpdate {
  scopes: Record<string, string[]>
}

/** 默认权限范围定义 */
export const DEFAULT_API_SCOPES = {
  leads: {
    description: '线索管理',
    permissions: ['read', 'create', 'update', 'delete'],
  },
  customers: {
    description: '客户管理',
    permissions: ['read', 'create', 'update'],
  },
  statistics: {
    description: '统计数据',
    permissions: ['read'],
  },
  followups: {
    description: '跟进记录',
    permissions: ['read', 'create', 'update'],
  },
  exports: {
    description: '数据导出',
    permissions: ['read'],
  },
}

// ============================================================================
// 定时任务相关类型
// ============================================================================

/** 间隔调度周期类型 */
export type IntervalPeriod = 'seconds' | 'minutes' | 'hours' | 'days'

/** 间隔调度配置 */
export interface IntervalSchedule {
  id?: number
  every: number
  period: IntervalPeriod
}

/** Crontab 调度配置 */
export interface CrontabSchedule {
  id?: number
  minute: string
  hour: string
  day_of_week: string
  day_of_month: string
  month_of_year: string
}

/** 定时任务 */
export interface ScheduledTask {
  id: number
  name: string
  task: string
  enabled: boolean
  description?: string
  interval?: IntervalSchedule
  crontab?: CrontabSchedule
  args?: unknown[]
  kwargs?: Record<string, unknown>
  queue?: string
  one_off: boolean
  start_time?: string
  expires?: string
  last_run_at?: string
  total_run_count: number
  date_changed?: string
}

/** 创建定时任务 */
export interface ScheduledTaskCreate {
  name: string
  task: string
  enabled?: boolean
  description?: string
  interval?: Omit<IntervalSchedule, 'id'>
  crontab?: Omit<CrontabSchedule, 'id'>
  args?: unknown[]
  kwargs?: Record<string, unknown>
  queue?: string
  one_off?: boolean
  start_time?: string
  expires?: string
}

/** 更新定时任务 */
export interface ScheduledTaskUpdate {
  name?: string
  task?: string
  enabled?: boolean
  description?: string
  interval?: Omit<IntervalSchedule, 'id'>
  crontab?: Omit<CrontabSchedule, 'id'>
  args?: unknown[]
  kwargs?: Record<string, unknown>
  queue?: string
  one_off?: boolean
  start_time?: string
  expires?: string
}

/** 可用任务信息 */
export interface AvailableTask {
  name: string
  description?: string
  module: string
}

/** 间隔周期选项 */
export const INTERVAL_PERIOD_OPTIONS = [
  { label: '秒', value: 'seconds' },
  { label: '分钟', value: 'minutes' },
  { label: '小时', value: 'hours' },
  { label: '天', value: 'days' },
] as const

/** Crontab 预设模板 */
export const CRONTAB_PRESETS = [
  { label: '每分钟', value: { minute: '*', hour: '*', day_of_week: '*', day_of_month: '*', month_of_year: '*' } },
  { label: '每小时', value: { minute: '0', hour: '*', day_of_week: '*', day_of_month: '*', month_of_year: '*' } },
  { label: '每3小时', value: { minute: '0', hour: '*/3', day_of_week: '*', day_of_month: '*', month_of_year: '*' } },
  { label: '每天凌晨', value: { minute: '0', hour: '0', day_of_week: '*', day_of_month: '*', month_of_year: '*' } },
  { label: '每天早8点', value: { minute: '0', hour: '8', day_of_week: '*', day_of_month: '*', month_of_year: '*' } },
  { label: '每周一凌晨', value: { minute: '0', hour: '0', day_of_week: '1', day_of_month: '*', month_of_year: '*' } },
  { label: '每月1号凌晨', value: { minute: '0', hour: '0', day_of_week: '*', day_of_month: '1', month_of_year: '*' } },
] as const

/** 任务执行历史 */
export interface TaskExecutionHistory {
  id: number
  name: string
  task: string
  enabled: boolean
  last_run_at: string | null
  total_run_count: number
  date_changed: string | null
}

/** 任务执行结果 */
export interface TaskResult {
  task_id: string
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'
  result: string | null
  traceback: string | null
  date_done: string | null
}
