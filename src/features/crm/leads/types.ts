/**
 * CRM线索管理类型定义
 * 从旧版前端线索类型迁移
 */

// ==================== 样式配置接口 ====================
// Semi Badge 兼容的 variant 类型（包含语义化扩展和状态颜色）
export type BadgeVariant =
  | 'default' | 'secondary' | 'destructive' | 'outline'
  | 'success' | 'warning' | 'info' | 'purple'
  | 'status-blue' | 'status-amber' | 'status-cyan' | 'status-gray'
  | 'status-purple' | 'status-green' | 'status-emerald' | 'status-red' | 'status-slate'

// 枚举样式配置（旧版，保留兼容）
export interface EnumStyleConfig {
  label: string        // 中文标签
  variant: BadgeVariant // badge variant
  color?: string       // 自定义颜色（可选）
}

// ==================== 枚举定义 ====================

export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export enum LeadStatus {
  PENDING_ASSIGN = 'pending_assign',
  PENDING_FOLLOWUP = 'pending_followup',
  FOLLOWING_UP = 'following_up',
  FOLLOWED_UP = 'followed_up',
  TRIAL_SCHEDULED = 'trial_scheduled',
  INVITED_NO_SHOW = 'invited_no_show',
  VISITED = 'visited',
  VISITED_NOT_SIGNED = 'visited_not_signed',
  PAID = 'paid',
  INVALID = 'invalid',
  CLOSED = 'closed'
}

export enum IntentionLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// 年级枚举（与后端保持一致）
export enum Grade {
  KINDERGARTEN_SMALL = 'kindergarten_small',
  KINDERGARTEN_MIDDLE = 'kindergarten_middle',
  KINDERGARTEN_LARGE = 'kindergarten_large',
  PRIMARY_1 = 'primary_1',
  PRIMARY_2 = 'primary_2',
  PRIMARY_3 = 'primary_3',
  PRIMARY_4 = 'primary_4',
  PRIMARY_5 = 'primary_5',
  PRIMARY_6 = 'primary_6',
  JUNIOR_1 = 'junior_1',
  JUNIOR_2 = 'junior_2',
  JUNIOR_3 = 'junior_3',
  SENIOR_1 = 'senior_1',
  SENIOR_2 = 'senior_2',
  SENIOR_3 = 'senior_3',
  UNIVERSITY = 'university'
}

export enum FollowupMethod {
  PHONE = 'phone',
  WECHAT = 'wechat',
  FACE_TO_FACE = 'face_to_face',
  SMS = 'sms',
  EMAIL = 'email'
}

export enum FollowupResult {
  NOT_CONNECTED = 'not_connected',
  HUNG_UP = 'hung_up',
  NO_NEED = 'no_need',
  WRONG_NUMBER = 'wrong_number',
  YUNKE_RISK_CONTROL = 'yunke_risk_control',
  NO_CHILD = 'no_child',
  AGE_MISMATCH = 'age_mismatch',
  TEMPORARILY_UNAVAILABLE = 'temporarily_unavailable',
  CAN_CONTINUE = 'can_continue',
  APPOINTMENT_SCHEDULED = 'appointment_scheduled',
  WECHAT_ADDED = 'wechat_added',
  OTHER = 'other'
}

export enum InfoChangeType {
  INFO_UPDATE = 'info_update',
  STATUS_CHANGE = 'status_change',
  INTENTION_CHANGE = 'intention_change',
  CONTACT_UPDATE = 'contact_update',
  COURSE_INTEREST_UPDATE = 'course_interest_update',
  ADDRESS_UPDATE = 'address_update',
  NOTES_UPDATE = 'notes_update',
  INVALID_REASON_UPDATE = 'invalid_reason_update',
  NEXT_FOLLOWUP_UPDATE = 'next_followup_update'
}

export enum OwnershipChangeType {
  CREATE = 'create',
  ASSIGN = 'assign',
  RELEASE_TO_POOL = 'release_to_pool',
  CLAIM_FROM_POOL = 'claim_from_pool',
  TRANSFER_CAMPUS = 'transfer_campus',
  TRANSFER_ADVISOR = 'transfer_advisor',
  SYSTEM_RELEASE = 'system_release',
  MANUAL_RELEASE = 'manual_release',
  MANUAL_RELEASE_TO_POOL = 'manual_release_to_pool',
  MANUAL_CLAIM_FROM_POOL = 'manual_claim_from_pool',
  SYSTEM_ACTIVATE_CLAIM = 'system_activate_claim',
  ADVISOR_LEAVE_RELEASE = 'advisor_leave_release',
  ADVISOR_TRANSFER_RELEASE = 'advisor_transfer_release'
}

export type LeadNoteSource = 'legacy_migration' | 'legacy_string' | 'create' | 'manual_update' | 'import' | 'public_submit'

export interface LeadNoteTimelineEntry {
  id: string
  content: string
  created_at: string
  created_by_id?: string | null
  created_by_name?: string | null
  source: LeadNoteSource
}

// ==================== 线索类型定义 ====================

export interface Lead {
  id: string
  created_at: string
  updated_at: string

  // 儿童信息
  child_name?: string
  child_gender?: Gender
  child_birthday?: string
  age: number
  school_name?: string
  grade?: Grade
  course_interests: string[]

  // 家长信息
  parent_name?: string
  parent_phone: string
  parent_wechat?: string
  parent_email?: string
  parent_relation?: string  // 家长与孩子的关系

  // 备用联系人
  backup_contact_name?: string
  backup_contact_phone?: string
  backup_contact_relation?: string

  // 地址
  province?: string
  city?: string
  district?: string
  address_detail?: string

  // 线索信息
  source_channel_id: string
  source_channel_name?: string
  source_detail?: string
  source_extra_info?: Record<string, unknown>  // 渠道额外信息（根据channel_config动态字段）
  batch_remark?: string  // 批次备注

  // 状态信息
  status: LeadStatus
  intention_level?: IntentionLevel
  notes?: LeadNoteTimelineEntry[]
  next_followup_at?: string  // 下次跟进时间

  // 顾问和校区信息
  advisor_id?: string
  advisor_name?: string
  advisor_username?: string  // 顾问用户名
  advisor_campus_id?: string
  advisor_campus_name?: string
  creator_campus_id: string
  creator_campus_name?: string
  owner_campus_id: string
  owner_campus_name?: string

  // 创建和修改人信息
  created_by_id: string
  created_by_name?: string
  updated_by_id?: string
  updated_by_name?: string

  // 激活信息
  activated_at?: string
  activated_by_id?: string
  activated_by_name?: string

  // 关联记录数量
  followup_count: number
  last_followup_at?: string

  // 公海状态
  is_in_pool?: boolean

  // 标签
  tag?: string

  // 星标
  is_starred?: boolean

  // 样式配置（可选，由include_styles参数控制）
  status_style?: EnumStyleConfig
  intention_level_style?: EnumStyleConfig
}

export interface LeadListItem {
  id: string
  child_name: string
  parent_name: string
  parent_phone?: string  // 手机号（需脱敏显示）
  grade?: Grade
  source_channel_id: string
  source_channel_name?: string
  status: LeadStatus
  intention_level?: IntentionLevel
  advisor_name?: string
  owner_campus_name: string
  created_by_name?: string
  created_at: string
  next_followup_at?: string
  age: number
  tag?: string
  is_starred: boolean
  last_followup_at?: string
  last_followup_result?: FollowupResult
  last_followup_content?: string  // 最后跟进内容
  followup_count: number
  import_batch_id?: string
  batch_remark?: string | null
  batch_name?: string | null
  notes?: LeadNoteTimelineEntry[]

  // 样式配置（可选，由include_styles参数控制）
  status_style?: EnumStyleConfig
  intention_level_style?: EnumStyleConfig
  last_followup_result_style?: EnumStyleConfig
}

export interface LeadCreate {
  // 儿童信息
  child_name?: string
  child_gender?: Gender
  child_birthday?: string
  school_name?: string
  grade?: Grade
  course_interests?: string[]

  // 家长信息
  parent_name?: string
  parent_phone: string
  parent_wechat?: string
  parent_email?: string
  parent_relation?: string  // 家长与孩子的关系

  // 备用联系人
  backup_contact_name?: string
  backup_contact_phone?: string
  backup_contact_relation?: string

  // 地址
  province?: string
  city?: string
  district?: string
  address_detail?: string

  // 线索信息
  notes?: string
  source_channel_id: string
  source_detail?: string
  source_extra_info?: Record<string, unknown>  // 渠道额外信息
  intention_level?: IntentionLevel  // 意向等级
  next_followup_at?: string  // 下次跟进时间
  status?: LeadStatus  // 线索状态

  // 新增：校区和顾问
  owner_campus_id?: string    // 线索归属校区ID
  advisor_id?: string         // 指定的课程顾问ID（可选）
}

export interface LeadUpdate {
  child_name?: string
  child_gender?: Gender
  child_birthday?: string
  school_name?: string
  grade?: Grade
  course_interests?: string[]
  parent_name?: string
  parent_phone?: string
  parent_wechat?: string
  parent_email?: string
  parent_relation?: string  // 家长与孩子的关系
  backup_contact_name?: string
  backup_contact_phone?: string
  backup_contact_relation?: string
  province?: string
  city?: string
  district?: string
  address_detail?: string
  notes?: string
  intention_level?: IntentionLevel
  next_followup_at?: string
  source_extra_info?: Record<string, unknown>  // 渠道额外信息（更新时可修改）
  status?: LeadStatus  // 线索状态
}

// ==================== 跟进记录接口 ====================

export interface LeadFollowup {
  id: string
  lead_id: string
  followup_at: string
  method: FollowupMethod
  content?: string
  result?: FollowupResult
  result_remark?: string
  next_action?: string
  next_followup_at?: string
  followup_by_id: string
  followup_by_name?: string
  created_at: string
  /** 来源: manual=人工填写, ai_auto=AI自动生成, ai_supplement=AI补充记录 */
  source?: 'manual' | 'ai_auto' | 'ai_supplement'
  yunke_call_id?: string
  parent_followup_id?: string
  // 跨校区记录字段
  source_campus_id?: string
  source_campus_name?: string
  is_current_campus: boolean
}

export interface LeadFollowupCreate {
  followup_at: string
  method: FollowupMethod
  content?: string
  result: FollowupResult
  result_remark?: string
  next_action?: string
  next_followup_at?: string
  send_dingtalk?: boolean
  yunke_call_id?: string
}

// ==================== 变更记录接口 ====================

export interface LeadInfoChangeLog {
  id: string
  lead_id: string
  changed_at: string
  changed_by_id: string
  changed_by_name?: string
  change_type: InfoChangeType
  field_name?: string  // 单字段变更时使用
  old_value?: string  // 单字段变更时使用
  new_value?: string  // 单字段变更时使用
  changes?: Array<{  // 多字段变更时使用
    field_name: string
    old_value?: string
    new_value?: string
  }>
  change_reason?: string
  change_summary: string
  extra_data?: Record<string, unknown>
  // 跨校区记录字段
  source_campus_id?: string
  source_campus_name?: string
  is_current_campus: boolean
}

export interface LeadOwnershipChangeLog {
  id: string
  lead_id: string
  changed_at: string
  changed_by_id: string
  changed_by_name?: string
  change_type: OwnershipChangeType
  previous_advisor_id?: string
  previous_advisor_name?: string
  current_advisor_id?: string
  current_advisor_name?: string
  previous_campus_id?: string
  previous_campus_name?: string
  current_campus_id?: string
  current_campus_name?: string
  is_in_pool_before: boolean
  is_in_pool_after: boolean
  change_reason?: string
  change_summary: string
  extra_data?: Record<string, unknown>
  // 跨校区记录字段
  source_campus_id?: string
  source_campus_name?: string
  is_current_campus: boolean
}

// ==================== 查询参数 ====================

export interface LeadListParams {
  page?: number
  size?: number
  status?: LeadStatus[]  // 多选
  source_channel_id?: string[]  // 多选
  intention_level?: IntentionLevel[]  // 多选
  advisor_id?: string[]  // 多选（保留兼容）
  advisor_name?: string  // 顾问姓名文本搜索
  created_by_id?: string[]  // 多选（保留兼容）
  created_by_name?: string  // 创建人姓名文本搜索
  owner_campus_id?: string[]  // 多选
  created_from?: string
  created_to?: string
  next_followup_from?: string
  next_followup_to?: string
  sort_by?: 'created_at' | 'next_followup_at'
  sort_order?: 'asc' | 'desc'
  search?: string
  tag?: string
  followup_result_filter?: string
  last_followup_result?: FollowupResult
  followup_result_mode?: 'include' | 'exclude' | 'all'
  followup_results?: FollowupResult[]
  import_batch_id?: string
  days_without_activity?: number  // X天内无活动（无跟进/创建/激活记录）
  include_styles?: boolean  // 是否包含样式配置
  collector_name?: string  // 地推采单人姓名
  collection_location?: string  // 地推采单地点
  source_extra_filters?: Record<string, string>  // 来源渠道额外字段筛选（其他字段）
  // 年龄和年级筛选
  age_min?: number  // 最小年龄
  age_max?: number  // 最大年龄
  grade?: Grade[]   // 年级筛选（多选）
  // 激活时间筛选
  activated_from?: string  // 激活开始时间
  activated_to?: string    // 激活结束时间
}

// ==================== 来源渠道额外字段配置 ====================

// options 选项格式（后端返回的格式）
export interface SourceChannelExtraFieldOption {
  label: string
  value: string
}

export interface SourceChannelExtraField {
  field_name: string
  field_label: string
  field_type: 'text' | 'select' | 'date' | 'datetime' | 'number' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: SourceChannelExtraFieldOption[]  // 选项列表（仅 select 类型使用）
}

// ==================== 统计数据接口 ====================

export interface ChannelStatItem {
  channel_id: string
  channel_name: string
  lead_count: number
  percentage: number
  category?: string
}

export interface MarketStaffStatItem {
  staff_id: string
  staff_name: string
  campus_name?: string
  total_count: number
  pending_followup_count: number
  pending_assign_count: number
  channels: ChannelStatItem[]
  pending_followup_channels: ChannelStatItem[]
  pending_assign_channels: ChannelStatItem[]
}

export interface ChannelTotalItem {
  channel_name: string
  category: string
  total: number
}

export interface MarketStatisticsResponse {
  staff_statistics: MarketStaffStatItem[]
  channel_totals: ChannelTotalItem[]
  total_leads: number
  total_staff: number
  date_from?: string
  date_to?: string
}

export interface MarketStaffDetailStaff {
  staff_id: string
  staff_name: string
  campus_id?: string
  campus_name?: string
}

export interface MarketStaffDetailSummary {
  total_count: number
  pending_followup_count: number
  channel_count: number
}

export interface MarketStaffDailyDistributionItem {
  date: string
  count: number
}

export interface MarketStaffPendingChannelItem {
  channel_id?: string
  channel_name: string
  category?: string
  count: number
}

export interface MarketStaffPendingFollowup {
  total_count: number
  channels: MarketStaffPendingChannelItem[]
}

export interface MarketStaffChannelBreakdownItem {
  channel_id?: string
  channel_name: string
  category?: string
  total_count: number
  pending_followup_count: number
  pending_assign_count: number
  invalid_count: number
  paid_count: number
}

export interface MarketStaffRecentImportBatchChannelItem {
  channel_id?: string
  channel_name: string
  category?: string
  count: number
}

export interface MarketStaffRecentImportBatchItem {
  batch_id: string
  batch_name: string
  batch_description?: string
  import_method: string
  status: string
  started_at: string
  completed_at?: string
  total_count: number
  success_count: number
  activated_count: number
  failed_count: number
  lead_count: number
  channel_count: number
  channels: MarketStaffRecentImportBatchChannelItem[]
}

export interface MarketStaffDetailResponse {
  staff: MarketStaffDetailStaff
  summary: MarketStaffDetailSummary
  daily_distribution: MarketStaffDailyDistributionItem[]
  pending_followup: MarketStaffPendingFollowup
  channel_breakdown: MarketStaffChannelBreakdownItem[]
  recent_import_batches: MarketStaffRecentImportBatchItem[]
  date_from: string
  date_to: string
}

export interface DituiFirstFollowupStats {
  unconnected: number
  invalid_number: number
  can_continue: number
}

export interface DituiPendingStats {
  pending_followup: number
  pending_assign: number
}

export interface DituiCollectionTimeStat {
  date: string
  count: number
}

export interface AdvisorTodayActivityItem {
  advisor_id: string
  advisor_name: string
  followup_count: number
  access_count: number
}

export interface AdvisorTodayActivityResponse {
  date: string
  items: AdvisorTodayActivityItem[]
  total_followup: number
  total_access: number
}

export interface AdvisorLeadSummaryItem {
  advisor_id: string
  advisor_name: string
  total_leads: number
  pending_followup: number
}

export interface AdvisorLeadSummaryResponse {
  items: AdvisorLeadSummaryItem[]
  total_leads: number
  total_pending: number
}

export interface ChannelPendingCount {
  channel_id: string | null
  channel_name: string
  count: number
}

export interface AdvisorPendingByChannelItem {
  advisor_id: string
  advisor_name: string
  total_pending: number
  channels: ChannelPendingCount[]
}

export interface ChannelTotalCount {
  channel_id: string | null
  channel_name: string
  total: number
}

export interface AdvisorPendingByChannelResponse {
  items: AdvisorPendingByChannelItem[]
  channel_totals: ChannelTotalCount[]
  total_pending: number
}

// ==================== 标签映射 ====================

export const leadStatusLabels: Record<LeadStatus, string> = {
  [LeadStatus.PENDING_ASSIGN]: '待分配',
  [LeadStatus.PENDING_FOLLOWUP]: '待回访',
  [LeadStatus.FOLLOWING_UP]: '跟进中',
  [LeadStatus.FOLLOWED_UP]: '已回访',
  [LeadStatus.TRIAL_SCHEDULED]: '已预约试听',
  [LeadStatus.INVITED_NO_SHOW]: '已邀约未到访',
  [LeadStatus.VISITED]: '已到访',
  [LeadStatus.VISITED_NOT_SIGNED]: '到访未签约',
  [LeadStatus.PAID]: '已缴费',
  [LeadStatus.INVALID]: '无效',
  [LeadStatus.CLOSED]: '关闭'
}

export const intentionLevelLabels: Record<IntentionLevel, string> = {
  [IntentionLevel.HIGH]: '高意向',
  [IntentionLevel.MEDIUM]: '中等',
  [IntentionLevel.LOW]: '低意向'
}

export const followupMethodLabels: Record<FollowupMethod, string> = {
  [FollowupMethod.PHONE]: '电话',
  [FollowupMethod.WECHAT]: '微信',
  [FollowupMethod.FACE_TO_FACE]: '当面拜访',
  [FollowupMethod.SMS]: '短信',
  [FollowupMethod.EMAIL]: '邮件'
}

export const followupResultLabels: Record<FollowupResult, string> = {
  [FollowupResult.NOT_CONNECTED]: '未接通',
  [FollowupResult.HUNG_UP]: '秒挂',
  [FollowupResult.NO_NEED]: '不需要',
  [FollowupResult.WRONG_NUMBER]: '空错号',
  [FollowupResult.YUNKE_RISK_CONTROL]: '云客风控',
  [FollowupResult.NO_CHILD]: '没孩子',
  [FollowupResult.AGE_MISMATCH]: '年龄不符',
  [FollowupResult.TEMPORARILY_UNAVAILABLE]: '暂时不便接听',
  [FollowupResult.CAN_CONTINUE]: '可持续跟进',
  [FollowupResult.APPOINTMENT_SCHEDULED]: '预约到访',
  [FollowupResult.WECHAT_ADDED]: '添加微信',
  [FollowupResult.OTHER]: '其他'
}

export const infoChangeTypeLabels: Record<InfoChangeType, string> = {
  [InfoChangeType.INFO_UPDATE]: '信息更新',
  [InfoChangeType.STATUS_CHANGE]: '状态变更',
  [InfoChangeType.INTENTION_CHANGE]: '意向等级变更',
  [InfoChangeType.CONTACT_UPDATE]: '联系方式更新',
  [InfoChangeType.COURSE_INTEREST_UPDATE]: '课程意向更新',
  [InfoChangeType.ADDRESS_UPDATE]: '地址信息更新',
  [InfoChangeType.NOTES_UPDATE]: '备注更新',
  [InfoChangeType.INVALID_REASON_UPDATE]: '无效原因更新',
  [InfoChangeType.NEXT_FOLLOWUP_UPDATE]: '下次跟进时间更新'
}

export const ownershipChangeTypeLabels: Record<OwnershipChangeType, string> = {
  [OwnershipChangeType.CREATE]: '新建',
  [OwnershipChangeType.ASSIGN]: '分配给顾问',
  [OwnershipChangeType.RELEASE_TO_POOL]: '释放到公海',
  [OwnershipChangeType.CLAIM_FROM_POOL]: '从公海领取',
  [OwnershipChangeType.TRANSFER_CAMPUS]: '校区间转移',
  [OwnershipChangeType.TRANSFER_ADVISOR]: '顾问间转移',
  [OwnershipChangeType.SYSTEM_RELEASE]: '系统自动释放',
  [OwnershipChangeType.MANUAL_RELEASE]: '手动释放',
  [OwnershipChangeType.MANUAL_RELEASE_TO_POOL]: '手动释放入中心公海维度',
  [OwnershipChangeType.MANUAL_CLAIM_FROM_POOL]: '手动从中心公海中领取',
  [OwnershipChangeType.SYSTEM_ACTIVATE_CLAIM]: '营销系统激活从中心公海领取',
  [OwnershipChangeType.ADVISOR_LEAVE_RELEASE]: '顾问离职释放到公海',
  [OwnershipChangeType.ADVISOR_TRANSFER_RELEASE]: '顾问调岗释放到公海'
}

// 为了兼容性，提供 changeTypeLabels 作为 ownershipChangeTypeLabels 的别名
export const changeTypeLabels = ownershipChangeTypeLabels

// 字段名称映射
export const fieldNameLabels: Record<string, string> = {
  parent_name: '父母姓名',
  child_name: '孩子姓名',
  parent_phone: '家长电话',
  parent_wechat: '家长微信',
  parent_email: '家长邮箱',
  grade: '年级',
  child_birthday: '孩子生日',
  status: '状态',
  intention_level: '意向等级',
  province: '省份',
  city: '城市',
  district: '区县',
  address_detail: '详细地址',
  course_interests: '意向课程',
  notes: '备注',
  next_followup_date: '下次跟进时间',
  invalid_reason: '无效原因',
  remark: '备注',
  source_extra_info: '来源额外信息',
  gender: '性别',
  school: '学校',
  interests: '兴趣爱好',
  parent_occupation: '家长职业',
  family_income: '家庭收入',
  learning_needs: '学习需求',
  available_time: '方便时间',
  preferred_campus: '意向校区'
}

// 年级标签（前端展示）
export const gradeLabels: Record<Grade, string> = {
  [Grade.KINDERGARTEN_SMALL]: '幼儿园小班',
  [Grade.KINDERGARTEN_MIDDLE]: '幼儿园中班',
  [Grade.KINDERGARTEN_LARGE]: '幼儿园大班',
  [Grade.PRIMARY_1]: '一年级',
  [Grade.PRIMARY_2]: '二年级',
  [Grade.PRIMARY_3]: '三年级',
  [Grade.PRIMARY_4]: '四年级',
  [Grade.PRIMARY_5]: '五年级',
  [Grade.PRIMARY_6]: '六年级',
  [Grade.JUNIOR_1]: '初一',
  [Grade.JUNIOR_2]: '初二',
  [Grade.JUNIOR_3]: '初三',
  [Grade.SENIOR_1]: '高一',
  [Grade.SENIOR_2]: '高二',
  [Grade.SENIOR_3]: '高三',
  [Grade.UNIVERSITY]: '大学'
}
