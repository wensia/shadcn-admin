/**
 * 小地推（深互动）API
 * 后端：app/apps/xiaoditui/api/main.py
 */
import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'

export interface XiaoditangBindingView {
  bound: boolean
  phone?: string
  has_password?: boolean
  has_token?: boolean
  token_preview?: string | null
  device_token?: string | null
  status?: number
  last_login?: string | null
  last_check_at?: string | null
  last_error?: string | null
}

export interface XiaoditangStatusView extends XiaoditangBindingView {
  valid?: boolean
  message?: string
  auto_relogin?: boolean
  master_account?: unknown
}

export interface XiaodituiSyncMeta {
  source?: 'database'
  status?: string
  syncing?: boolean
  last_synced_at?: string | null
  last_error?: string | null
}

export interface XiaodituiSyncRequest {
  mode?: 'full' | 'incremental'
}

export interface XiaodituiSyncSubmitResult {
  action: 'submitted' | 'running' | 'skipped' | 'failed'
  status?: string
  mode?: string | null
  syncing?: boolean
  task_id?: string | null
  last_started_at?: string | null
  last_synced_at?: string | null
  last_error?: string | null
}

export interface XiaodituiSyncActivityState {
  activity_id: number
  activity_name?: string | null
  status: string
  mode?: string | null
  remote_total: number
  synced_count: number
  page_count: number
  latest_lead_created_at?: string | null
  last_started_at?: string | null
  last_finished_at?: string | null
  last_synced_at?: string | null
  last_error?: string | null
}

export interface XiaodituiSyncStatus {
  status: string
  mode?: string | null
  syncing: boolean
  task_id?: string | null
  last_started_at?: string | null
  last_finished_at?: string | null
  last_synced_at?: string | null
  last_error?: string | null
  activities: XiaodituiSyncActivityState[]
}

export interface XiaoditangBindRequest {
  phone: string
  password: string
  /** 默认 true：保存后立刻调用一次登录，把 token / cookies 落库 */
  login_now?: boolean
}

export const xiaoditangApi = {
  /** 获取当前员工的绑定信息（脱敏） */
  getMyBinding(): Promise<ApiResponse<XiaoditangBindingView>> {
    return apiClient.get('/xiaoditui/me/binding')
  },

  /** 绑定 / 更新账号 */
  bindMyAccount(
    payload: XiaoditangBindRequest
  ): Promise<ApiResponse<XiaoditangBindingView>> {
    return apiClient.post('/xiaoditui/me/binding', payload)
  },

  /** 解绑 */
  unbindMyAccount(): Promise<ApiResponse<{ bound: false }>> {
    return apiClient.delete('/xiaoditui/me/binding')
  },

  /** 用已保存的账号密码重新登录 */
  reloginMyAccount(): Promise<ApiResponse<XiaoditangBindingView>> {
    return apiClient.post('/xiaoditui/me/login', {})
  },

  /**
   * 校验上次登录保存的状态
   * 页面打开时调用：调用真实小地推 API 探活，必要时自动重登
   */
  checkMyStatus(): Promise<ApiResponse<XiaoditangStatusView>> {
    return apiClient.get('/xiaoditui/me/status')
  },

  /** 提交小地推名单数据同步任务 */
  submitSync(
    payload: XiaodituiSyncRequest = { mode: 'incremental' }
  ): Promise<ApiResponse<XiaodituiSyncSubmitResult>> {
    return apiClient.post('/xiaoditui/me/sync', payload)
  },

  /** 获取小地推名单数据同步状态 */
  getSyncStatus(): Promise<ApiResponse<XiaodituiSyncStatus>> {
    return apiClient.get('/xiaoditui/me/sync/status')
  },

  /** 当前账号下的活动列表 */
  listActivities(): Promise<ApiResponse<XiaoditangActivityOption[]>> {
    return apiClient.get('/xiaoditui/me/activities')
  },

  /** 当前账号下跨活动的推广员列表 */
  listMarkets(): Promise<ApiResponse<XiaodituiMarketList>> {
    return apiClient.get('/xiaoditui/me/markets')
  },

  /** 当前账号下推广员水印相机链接 */
  listWatermarkCameraLinks(): Promise<ApiResponse<XiaodituiWatermarkLinkList>> {
    return apiClient.get('/xiaoditui/me/watermark-camera/links')
  },

  /** 为推广员启用水印相机链接 */
  enableWatermarkCameraLink(
    marketId: number
  ): Promise<ApiResponse<XiaodituiWatermarkLink>> {
    return apiClient.post(
      `/xiaoditui/me/watermark-camera/links/${marketId}/enable`,
      {}
    )
  },

  /** 停用推广员水印相机链接 */
  disableWatermarkCameraLink(
    linkId: string
  ): Promise<ApiResponse<XiaodituiWatermarkLink>> {
    return apiClient.post(
      `/xiaoditui/me/watermark-camera/links/${linkId}/disable`,
      {}
    )
  },

  /** 重置推广员水印相机链接 */
  rotateWatermarkCameraLink(
    linkId: string
  ): Promise<ApiResponse<XiaodituiWatermarkLink>> {
    return apiClient.post(
      `/xiaoditui/me/watermark-camera/links/${linkId}/rotate`,
      {}
    )
  },

  /** 推广员水印相机打卡记录 */
  listWatermarkCameraCheckins(params: {
    page?: number
    size?: number
    marketId?: number
  }): Promise<ApiResponse<PaginatedResponse<XiaodituiWatermarkCheckin>>> {
    return apiClient.get('/xiaoditui/me/watermark-camera/checkins', {
      params: {
        page: params.page,
        size: params.size,
        market_id: params.marketId,
      },
    })
  },

  /** 验证公开水印相机链接 */
  validateWatermarkCameraToken(
    token: string
  ): Promise<ApiResponse<XiaodituiWatermarkPublicSession>> {
    return apiClient.get('/public/xiaoditui/watermark-camera/validate', {
      params: { token },
    })
  },

  /** 解析公开水印相机定位 */
  resolveWatermarkCameraLocation(
    payload: XiaodituiWatermarkLocationPayload
  ): Promise<ApiResponse<XiaodituiWatermarkLocationResult>> {
    return apiClient.post(
      '/public/xiaoditui/watermark-camera/resolve-location',
      toBackendPayload(payload)
    )
  },

  /** 提交公开水印相机打卡 */
  submitWatermarkCameraCheckin(
    payload: FormData
  ): Promise<ApiResponse<XiaodituiWatermarkCheckin>> {
    return apiClient.post('/public/xiaoditui/watermark-camera/checkins', payload)
  },

  /** 当前账号的小地推全局概览 */
  getOverview(): Promise<ApiResponse<XiaoditangOverviewStats>> {
    return apiClient.get('/xiaoditui/me/overview')
  },

  /** 小地推名单明细（本地数据库分页） */
  listLeadDetails(params: {
    activityId?: number
    startDate?: string
    endDate?: string
    marketId?: number
    keyword?: string
    page?: number
    size?: number
  }): Promise<ApiResponse<PaginatedResponse<XiaodituiLeadDetail>>> {
    return apiClient.get('/xiaoditui/me/leads', {
      params: {
        activity_id: params.activityId,
        start_date: params.startDate,
        end_date: params.endDate,
        market_id: params.marketId,
        keyword: params.keyword,
        page: params.page,
        size: params.size,
      },
    })
  },

  /** 数据收集统计（按日期范围） */
  getStats(params: {
    activityId: number
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<XiaoditangStats>> {
    return apiClient.get('/xiaoditui/me/stats', {
      params: {
        activity_id: params.activityId,
        start_date: params.startDate,
        end_date: params.endDate,
      },
    })
  },

  /** 兼职工资报表（按日期范围） */
  getSalaryReport(params: {
    activityId: number
    startDate?: string
    endDate?: string
    marketId?: number
  }): Promise<ApiResponse<XiaodituiSalaryReport>> {
    return apiClient.get('/xiaoditui/me/salary/report', {
      params: {
        activity_id: params.activityId,
        start_date: params.startDate,
        end_date: params.endDate,
        market_id: params.marketId,
      },
    })
  },

  /** 获取推广员工资标准历史 */
  listSalaryStandards(params?: {
    marketId?: number
  }): Promise<ApiResponse<XiaodituiSalaryStandard[]>> {
    return apiClient.get('/xiaoditui/me/salary/standards', {
      params: {
        market_id: params?.marketId,
      },
    })
  },

  /** 新增推广员工资标准 */
  createSalaryStandard(
    payload: XiaodituiSalaryStandardPayload
  ): Promise<ApiResponse<XiaodituiSalaryStandard>> {
    return apiClient.post(
      '/xiaoditui/me/salary/standards',
      toBackendPayload(payload)
    )
  },

  /** 更新推广员工资标准 */
  updateSalaryStandard(
    standardId: string,
    payload: XiaodituiSalaryStandardUpdatePayload
  ): Promise<ApiResponse<XiaodituiSalaryStandard>> {
    return apiClient.put(
      `/xiaoditui/me/salary/standards/${standardId}`,
      toBackendPayload(payload)
    )
  },

  /** 删除推广员工资标准 */
  deleteSalaryStandard(
    standardId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.delete(`/xiaoditui/me/salary/standards/${standardId}`)
  },

  /** 批量标记推广员日工资已结算 */
  settleSalaryDates(
    payload: XiaodituiSalarySettlementPayload
  ): Promise<ApiResponse<XiaodituiSalarySettlementResult>> {
    return apiClient.post(
      '/xiaoditui/me/salary/settlements',
      toBackendPayload(payload)
    )
  },

  /** 批量取消推广员日工资结算标记 */
  unsettleSalaryDates(
    payload: XiaodituiSalarySettlementPayload
  ): Promise<ApiResponse<XiaodituiSalarySettlementResult>> {
    return apiClient.post(
      '/xiaoditui/me/salary/settlements/unsettle',
      toBackendPayload(payload)
    )
  },

  /** 检查导入字段与映射建议 */
  inspectImport(
    payload: XiaodituiInspectPayload
  ): Promise<ApiResponse<XiaodituiImportInspectResult>> {
    return apiClient.post(
      '/xiaoditui/me/import/inspect',
      toBackendPayload(payload)
    )
  },

  /** 预览导入结果 */
  previewImport(
    payload: XiaodituiImportPayload
  ): Promise<ApiResponse<XiaodituiImportPreviewResult>> {
    return apiClient.post(
      '/xiaoditui/me/import/preview',
      toBackendPayload(payload)
    )
  },

  /** 提交后台导入批次 */
  applyImport(
    payload: XiaodituiApplyPayload
  ): Promise<ApiResponse<XiaodituiImportApplyResult>> {
    return apiClient.post(
      '/xiaoditui/me/import/apply',
      toBackendPayload(payload)
    )
  },

  /** 当前用户的个人字段映射模板 */
  listImportTemplates(): Promise<ApiResponse<XiaodituiImportTemplate[]>> {
    return apiClient.get('/xiaoditui/me/import/templates')
  },

  /** 保存个人字段映射模板 */
  saveImportTemplate(
    payload: XiaodituiImportTemplateSavePayload
  ): Promise<ApiResponse<XiaodituiImportTemplate>> {
    return apiClient.post(
      '/xiaoditui/me/import/templates',
      toBackendPayload(payload)
    )
  },

  /** 删除个人字段映射模板 */
  deleteImportTemplate(
    templateId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.delete(`/xiaoditui/me/import/templates/${templateId}`)
  },
}

function toBackendPayload<T extends object>(
  payload: T
): Record<string, unknown> {
  const next = Object.assign({}, payload) as Record<string, unknown>
  if ('activityId' in next) {
    next.activity_id = next.activityId
    delete next.activityId
  }
  if ('startDate' in next) {
    next.start_date = next.startDate
    delete next.startDate
  }
  if ('endDate' in next) {
    next.end_date = next.endDate
    delete next.endDate
  }
  if ('sourceChannelId' in next) {
    next.source_channel_id = next.sourceChannelId
    delete next.sourceChannelId
  }
  if ('ownerCampusId' in next) {
    next.owner_campus_id = next.ownerCampusId || undefined
    delete next.ownerCampusId
  }
  if ('batchName' in next) {
    next.batch_name = next.batchName
    delete next.batchName
  }
  if ('templateName' in next) {
    next.template_name = next.templateName
    delete next.templateName
  }
  if ('saveTemplate' in next) {
    next.save_template = next.saveTemplate
    delete next.saveTemplate
  }
  if ('importMode' in next) {
    next.import_mode = next.importMode
    delete next.importMode
  }
  if ('previewValidCount' in next) {
    next.preview_valid_count = next.previewValidCount
    delete next.previewValidCount
  }
  if ('marketId' in next) {
    next.market_id = next.marketId
    delete next.marketId
  }
  if ('unitPrice' in next) {
    next.unit_price = next.unitPrice
    delete next.unitPrice
  }
  if ('baseSalary' in next) {
    next.base_salary = next.baseSalary
    delete next.baseSalary
  }
  if ('guaranteedCount' in next) {
    next.guaranteed_count = next.guaranteedCount
    delete next.guaranteedCount
  }
  if ('startCount' in next) {
    next.start_count = next.startCount
    delete next.startCount
  }
  if ('effectiveDate' in next) {
    next.effective_date = next.effectiveDate
    delete next.effectiveDate
  }
  if ('marketName' in next) {
    next.market_name = next.marketName
    delete next.marketName
  }
  if ('marketMobile' in next) {
    next.market_mobile = next.marketMobile
    delete next.marketMobile
  }
  if ('accuracyM' in next) {
    next.accuracy_m = next.accuracyM
    delete next.accuracyM
  }
  return next
}

export interface XiaoditangActivityOption {
  activity_id: number
  name: string
}

export interface XiaodituiMarketOption {
  activity_id: number
  activity_name: string
  market_id: number
  nickname?: string | null
  name: string
  mobile: string | null
  remark?: string | null
  avatar: string | null
  joined_at?: string | null
  current_activity_count?: number
  total_activity_count?: number
  lead_count: number
  last_collected_at: string | null
  unbound?: boolean
  unbound_at?: string | null
}

export interface XiaodituiMarketList {
  items: XiaodituiMarketOption[]
  activity_count: number
  page_count: number
  truncated: boolean
  markets_total?: number
  sync?: XiaodituiSyncMeta
}

export interface XiaodituiWatermarkLink {
  id: string
  market_id: number
  market_name?: string | null
  market_mobile?: string | null
  token: string
  is_active: boolean
  last_used_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface XiaodituiWatermarkMarketLink {
  market_id: number
  market_name: string
  market_mobile?: string | null
  lead_count: number
  last_collected_at?: string | null
  link?: XiaodituiWatermarkLink | null
}

export interface XiaodituiWatermarkLinkList {
  items: XiaodituiWatermarkMarketLink[]
  map_configured: boolean
}

export interface XiaodituiWatermarkCheckin {
  id: string
  link_id: string
  market_id: number
  market_name?: string | null
  checkin_at: string
  latitude: number
  longitude: number
  accuracy_m?: number | null
  address: string
  photo_path: string
  photo_url: string
  ip_address?: string | null
  user_agent?: string | null
}

export interface XiaodituiWatermarkPublicSession extends XiaodituiWatermarkLink {
  server_time: string
  map_configured: boolean
}

export interface XiaodituiWatermarkLocationPayload {
  token: string
  latitude: number
  longitude: number
  accuracyM?: number | null
}

export interface XiaodituiWatermarkLocationResult {
  address: string
  latitude: number
  longitude: number
  accuracy_m?: number | null
  server_time: string
}

export interface XiaodituiLeadDetail {
  id: string
  activity_id: number
  activity_name?: string | null
  external_lead_id: string
  lead_created_at?: string | null
  lead_date?: string | null
  market_id?: number | null
  market_name?: string | null
  market_nickname?: string | null
  market_mobile?: string | null
  nickname?: string | null
  mobile?: string | null
  address?: string | null
  channel?: string | null
  is_repeat?: string | null
  raw_data: Record<string, unknown>
  last_seen_at?: string | null
}

export interface XiaoditangMarketGroup {
  market_id: number
  name: string
  mobile: string | null
  avatar: string | null
  count: number
  last_collected_at: string | null
}

export interface XiaoditangSampleItem {
  id: number
  nickname: string | null
  mobile: string | null
  col: string | null
  address: string | null
  channel: string | null
  is_repeat: string | null
  created_at: string | null
  market_name: string | null
}

export interface XiaoditangOverviewStats {
  leads_total: number
  leads_today: number
  markets_total: number
  activities_total: number
}

export interface XiaoditangStats {
  start_date: string
  end_date: string
  activity_id: number
  all_time_total: number
  range_total: number
  by_market: XiaoditangMarketGroup[]
  samples: XiaoditangSampleItem[]
  page_count: number
  truncated: boolean
  sync?: XiaodituiSyncMeta
}

export interface XiaodituiSalaryStandard {
  id: string
  market_id: number
  effective_date: string
  base_salary: number
  guaranteed_count: number
  unit_price: number
  start_count: number
  market_name?: string | null
  market_mobile?: string | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface XiaodituiSalaryDailyItem {
  date: string
  count: number
  salary: number
  standard?: XiaodituiSalaryStandard | null
  settled: boolean
  settled_at?: string | null
}

export interface XiaodituiSalaryMarketRow {
  market_id: number
  name: string
  mobile: string | null
  count: number
  salary: number
  configured: boolean
  missing_days: string[]
  current_standard?: XiaodituiSalaryStandard | null
  daily: XiaodituiSalaryDailyItem[]
  last_collected_at?: string | null
  settled_day_count: number
  unsettled_day_count: number
  settled_salary: number
  unsettled_salary: number
  settlement_status: 'none' | 'partial' | 'settled'
}

export interface XiaodituiSalaryReport {
  start_date: string
  end_date: string
  activity_id: number
  range_total: number
  total_salary: number
  configured_market_count: number
  unconfigured_market_count: number
  by_market: XiaodituiSalaryMarketRow[]
  page_count?: number
  truncated?: boolean
  sync?: XiaodituiSyncMeta
}

export interface XiaodituiSalaryStandardPayload {
  marketId: number
  marketName?: string | null
  marketMobile?: string | null
  effectiveDate: string
  baseSalary: number
  guaranteedCount: number
  unitPrice: number
  startCount: number
  notes?: string | null
}

export type XiaodituiSalaryStandardUpdatePayload = Partial<
  Omit<XiaodituiSalaryStandardPayload, 'marketId'>
>

export interface XiaodituiSalarySettlementPayload {
  marketId: number
  marketName?: string | null
  marketMobile?: string | null
  dates: string[]
}

export interface XiaodituiSalarySettlementResult {
  market_id: number
  dates: string[]
  settled_count?: number
  unsettled_count?: number
}

export interface XiaodituiFieldMapping {
  source_field: string
  target_type: 'lead' | 'source_extra'
  target_field: string
}

export interface XiaodituiInspectPayload {
  activityId: number
  startDate?: string
  endDate?: string
  sourceChannelId?: string
}

export interface XiaodituiImportPayload extends XiaodituiInspectPayload {
  sourceChannelId: string
  ownerCampusId?: string
  mappings: XiaodituiFieldMapping[]
}

export interface XiaodituiApplyPayload extends XiaodituiImportPayload {
  batchName?: string
  templateName?: string
  saveTemplate?: boolean
  importMode?: 'sync' | 'async'
  previewValidCount?: number
}

export interface XiaodituiImportTemplateSavePayload {
  id?: string
  name: string
  sourceChannelId?: string
  ownerCampusId?: string
  mappings: XiaodituiFieldMapping[]
}

export interface XiaodituiImportTemplate {
  id: string
  name: string
  source_channel_id?: string | null
  owner_campus_id?: string | null
  mappings: XiaodituiFieldMapping[]
  updated_at?: string
}

export interface XiaodituiImportField {
  field: string
  label: string
  samples: string[]
  type?: string | null
  required?: boolean
  show?: boolean
  is_custom?: boolean
  options?: string[] | null
}

export interface XiaodituiLeadTarget {
  field: string
  label: string
}

export interface XiaodituiImportInspectResult {
  activity_id: number
  start_date: string
  end_date: string
  row_count: number
  all_time_total: number
  page_count: number
  truncated: boolean
  fields: XiaodituiImportField[]
  suggested_mappings: XiaodituiFieldMapping[]
  lead_targets: XiaodituiLeadTarget[]
}

export interface XiaodituiImportFailurePreview {
  row_number: number
  type: string
  reason: string
  phone?: string | null
  sample?: {
    nickname?: string | null
    mobile?: string | null
    created_at?: string | null
  }
}

export interface XiaodituiImportPreviewResult {
  activity_id: number
  start_date: string
  end_date: string
  owner_campus_id: string
  total_count: number
  valid_count: number
  create_count: number
  activate_count: number
  failed_count: number
  duplicate_blocked_count: number
  duplicate_in_range_count: number
  missing_required_count: number
  invalid_phone_count: number
  sync_threshold: number
  recommended_mode: 'sync' | 'async'
  failures: XiaodituiImportFailurePreview[]
}

export interface XiaodituiImportApplyResult {
  mode: 'sync' | 'async'
  batch_id: string
  batch_name: string
  task_id?: string
  status?: 'processing' | 'completed' | 'failed'
  total_count?: number
  success_count?: number
  failed_count?: number
  activated_count?: number
}
