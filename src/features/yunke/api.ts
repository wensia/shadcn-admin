/**
 * 云客模块 API
 */
import { apiClient } from '@/lib/api/client'
import {
  unwrapData,
  type ApiResponse,
  type PaginatedResponse,
} from '@/lib/api/types'
import type {
  YunkeAdminStatus,
  YunkeAdminLoginResponse,
  YunkeSubAccount,
  YunkeAvailableEmployee,
  YunkePasswordResetResponse,
  YunkeBatchLoginResult,
  YunkeLoginStatusResult,
  YunkeAutoSyncResult,
  YunkeDashboardStats,
  YunkeCredential,
  YunkeCredentialCreate,
  YunkeCredentialUpdate,
  YunkeCredentialStatus,
  YunkeCredentialListResponse,
  CallRecord,
  CallRecordListParams,
  CallRecordStats,
  RecordUrlResponse,
  YunkeCallLogItem,
  AIAnalysisResult,
  YunkeOnboardingOptions,
  OnboardingCreateConsultantRequest,
  OnboardingConsultantResult,
  YunkeDeviceUnbindResult,
} from './types'

export interface AnalyzeCallRecordOptions {
  config_name?: string
  model_name?: string
  prompt_name?: string
  prompt_version?: number
}

/**
 * 云客管理 API
 */
export const yunkeApi = {
  // ========================================================================
  // 管理员认证
  // ========================================================================

  /** 管理员登录 */
  async login(data?: {
    phone?: string
    password?: string
  }): Promise<YunkeAdminLoginResponse> {
    const response = await apiClient.post<ApiResponse<YunkeAdminLoginResponse>>(
      '/yunke/admin/login',
      data
    )
    return unwrapData(response)
  },

  /** 获取管理员状态 */
  async getStatus(): Promise<YunkeAdminStatus> {
    const response = await apiClient.get<ApiResponse<YunkeAdminStatus>>(
      '/yunke/admin/status'
    )
    return unwrapData(response)
  },

  /** 管理员登出 */
  async logout(): Promise<boolean> {
    const response = await apiClient.post<
      ApiResponse<{ cookies_cleared: boolean }>
    >('/yunke/admin/logout')
    return response.data?.cookies_cleared ?? false
  },

  // ========================================================================
  // 子账号管理
  // ========================================================================

  /** 获取子账号列表 */
  async getSubAccounts(params?: {
    page?: number
    page_size?: number
    real_name?: string
    auth_status?: string
    department_id?: string
  }): Promise<{
    users: YunkeSubAccount[]
    total: number
    page: number
    page_size: number
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        users: YunkeSubAccount[]
        total: number
        page: number
        page_size: number
      }>
    >('/yunke/admin/sub-accounts', params)
    return unwrapData(response)
  },

  /** 获取可绑定的员工列表 */
  async getAvailableEmployees(): Promise<YunkeAvailableEmployee[]> {
    const response = await apiClient.get<ApiResponse<YunkeAvailableEmployee[]>>(
      '/yunke/admin/available-employees'
    )
    return response.data || []
  },

  /** 绑定员工 */
  async bindEmployee(data: {
    yunke_phone: string
    yunke_user_id: string
    employee_id: string
    source_account_id?: string
    company_code?: string | null
    real_name?: string
  }): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<
      ApiResponse<{ success: boolean; message?: string }>
    >('/yunke/admin/bind-employee', data)
    return unwrapData(response)
  },

  /** 解绑员工 */
  async unbindEmployee(data: {
    employee_id: string
    yunke_phone?: string
    yunke_user_id?: string
  }): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<
      ApiResponse<{ success: boolean; message?: string }>
    >('/yunke/admin/unbind-employee', data)
    return unwrapData(response)
  },

  /** 重置密码 */
  async resetPassword(data: {
    yunke_user_id: string
    phone: string
    credential_id?: string // 凭证ID，用于获取对应凭证的cookies
  }): Promise<YunkePasswordResetResponse> {
    const response = await apiClient.post<
      ApiResponse<YunkePasswordResetResponse>
    >('/yunke/auth/reset-password', data)
    return unwrapData(response)
  },

  /** 为员工执行云客登录 */
  async loginForEmployee(data: {
    employee_id: string
    yunke_phone?: string
    yunke_user_id?: string
  }): Promise<{
    success: boolean
    message?: string
    employee_name?: string
    yunke_phone?: string
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        employee_id: string
        employee_name: string
        yunke_phone: string
        cookies_saved: boolean
      }>
    >('/yunke/admin/login-for-employee', data)
    return {
      success: true,
      message: '登录成功',
      employee_name: response.data?.employee_name,
      yunke_phone: response.data?.yunke_phone,
    }
  },

  /** 自动同步绑定（根据姓名匹配） */
  async autoSyncBindings(): Promise<YunkeAutoSyncResult> {
    const response = await apiClient.post<ApiResponse<YunkeAutoSyncResult>>(
      '/yunke/admin/auto-sync-bindings'
    )
    return unwrapData(response)
  },

  // ========================================================================
  // 登录状态管理
  // ========================================================================

  /** 检查所有员工的云客登录状态 */
  async checkAllLoginStatus(): Promise<YunkeLoginStatusResult> {
    const response = await apiClient.get<ApiResponse<YunkeLoginStatusResult>>(
      '/yunke/admin/check-login-status'
    )
    return unwrapData(response)
  },

  /** 批量更新登录状态 */
  async batchUpdateLogin(): Promise<YunkeBatchLoginResult> {
    const response = await apiClient.post<ApiResponse<YunkeBatchLoginResult>>(
      '/yunke/admin/batch-update-login'
    )
    return unwrapData(response)
  },

  // ========================================================================
  // 仪表盘统计
  // ========================================================================

  /** 获取仪表盘统计数据 */
  async getDashboardStats(): Promise<YunkeDashboardStats> {
    const response = await apiClient.get<ApiResponse<YunkeDashboardStats>>(
      '/yunke/admin/dashboard-stats'
    )
    return (
      response.data || {
        total_accounts: 0,
        active_accounts: 0,
        logged_in_accounts: 0,
        bound_employees: 0,
        today_calls: 0,
        today_duration: 0,
      }
    )
  },
}

/**
 * 云客账号凭证管理 API
 */
export const yunkeCredentialsApi = {
  /** 获取账号凭证列表 */
  async getCredentials(params?: {
    company_id?: string
    status?: number
    skip?: number
    limit?: number
  }): Promise<YunkeCredentialListResponse> {
    const response = await apiClient.get<
      ApiResponse<YunkeCredentialListResponse>
    >('/external/yunke-accounts', { params })
    return unwrapData(response)
  },

  /** 获取单个账号凭证 */
  async getCredential(id: string): Promise<YunkeCredential> {
    const response = await apiClient.get<ApiResponse<YunkeCredential>>(
      `/external/yunke-accounts/${id}`
    )
    return unwrapData(response)
  },

  /** 创建账号凭证（Upsert） */
  async createCredential(
    data: YunkeCredentialCreate
  ): Promise<YunkeCredential> {
    const response = await apiClient.post<ApiResponse<YunkeCredential>>(
      '/external/yunke-accounts',
      data
    )
    return unwrapData(response)
  },

  /** 更新账号密码 */
  async updateCredential(
    id: string,
    data: YunkeCredentialUpdate
  ): Promise<YunkeCredential> {
    const response = await apiClient.put<ApiResponse<YunkeCredential>>(
      `/external/yunke-accounts/${id}`,
      data
    )
    return unwrapData(response)
  },

  /** 删除账号凭证 */
  async deleteCredential(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<
      ApiResponse<{ success: boolean; message: string }>
    >(`/external/yunke-accounts/${id}`)
    return unwrapData(response)
  },

  /** 手动登录/刷新登录 */
  async loginCredential(
    id: string
  ): Promise<{ success: boolean; message: string; status?: number }> {
    const response = await apiClient.post<ApiResponse<{ status: number }>>(
      `/external/yunke-accounts/${id}/refresh`
    )
    // apiClient 返回的是完整的 ApiResponse，需要根据 success 字段判断
    const apiResponse = response as unknown as ApiResponse<{ status: number }>
    return {
      success: apiResponse.success,
      message: apiResponse.message || '',
      status: apiResponse.data?.status,
    }
  },

  /** 检查账号状态 */
  async checkCredentialStatus(id: string): Promise<YunkeCredentialStatus> {
    const response = await apiClient.get<ApiResponse<YunkeCredentialStatus>>(
      `/external/yunke-accounts/${id}/status`
    )
    return unwrapData(response)
  },

  /** 获取所有凭证的子账号列表 */
  async getSubAccountsFromCredentials(params?: {
    page?: number
    page_size?: number
    real_name?: string
    crm_binding_status?: 'bound' | 'unbound'
    campus_id?: string
    department_id?: string
  }): Promise<{
    users: YunkeSubAccount[]
    total: number
    accounts_count: number
    errors?: Array<{ account_id: string; account_phone: string; error: string }>
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        users: YunkeSubAccount[]
        total: number
        accounts_count: number
        errors?: Array<{
          account_id: string
          account_phone: string
          error: string
        }>
      }>
    >('/external/yunke-accounts/sub-accounts', params)
    return unwrapData(response)
  },

  /** 获取指定凭证的子账号列表 */
  async getSubAccountsByCredential(
    accountId: string,
    params?: {
      page?: number
      page_size?: number
      real_name?: string
      crm_binding_status?: 'bound' | 'unbound'
      campus_id?: string
      department_id?: string
    }
  ): Promise<{
    users: YunkeSubAccount[]
    total: number
    account: {
      id: string
      phone: string
      company_code: string | null
      company_name: string | null
    }
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        users: YunkeSubAccount[]
        total: number
        account: {
          id: string
          phone: string
          company_code: string | null
          company_name: string | null
        }
      }>
    >(`/external/yunke-accounts/${accountId}/sub-accounts`, params)
    return unwrapData(response)
  },
}

/**
 * 一键建咨询师（onboarding）API
 */
export const yunkeOnboardingApi = {
  /** 拉取 credential 对应的云客部门树 + 角色列表，填充弹窗级联下拉 */
  async getOptions(
    yunkeAdminAccountId: string
  ): Promise<YunkeOnboardingOptions> {
    const response = await apiClient.get<ApiResponse<YunkeOnboardingOptions>>(
      '/yunke/admin/onboarding/yunke-options',
      { params: { yunke_admin_account_id: yunkeAdminAccountId } }
    )
    return unwrapData(response)
  },

  /** 一键创建：已有 CRM 员工 + 云客咨询师 + 绑定 + 登录 */
  async createConsultant(
    payload: OnboardingCreateConsultantRequest
  ): Promise<OnboardingConsultantResult> {
    const response = await apiClient.post<
      ApiResponse<OnboardingConsultantResult>
    >('/yunke/admin/onboarding/create-consultant', payload)
    return unwrapData(response)
  },

  /** 云客子账号「离职处理」：调用云客 unBindMemberAndDevice 并同步清空 RuiMF employee.yunke */
  async offboardSubAccount(payload: {
    yunke_admin_account_id: string
    yunke_user_id: string
    area_flag?: string
  }): Promise<{
    yunke_user_id: string
    yunke_raw: unknown
    rmf_unbound_employees: Array<{ id: string; name: string }>
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        yunke_user_id: string
        yunke_raw: unknown
        rmf_unbound_employees: Array<{ id: string; name: string }>
      }>
    >('/yunke/admin/offboard-sub-account', payload)
    return unwrapData(response)
  },

  /** 云客设备批量解绑：调用云客 unBindDeviceBatch */
  async unbindDevices(payload: {
    yunke_admin_account_id: string
    device_ids: string[]
  }): Promise<YunkeDeviceUnbindResult> {
    const response = await apiClient.post<
      ApiResponse<YunkeDeviceUnbindResult>
    >('/yunke/admin/unbind-devices', payload)
    return unwrapData(response)
  },
}

/**
 * 云客通话记录 API
 */
export const callRecordsApi = {
  /** 获取通话记录列表 */
  async getCallRecords(
    params?: CallRecordListParams
  ): Promise<PaginatedResponse<CallRecord>> {
    const response = await apiClient.get<
      ApiResponse<PaginatedResponse<CallRecord>>
    >('/yunke/call-records', { params })
    return unwrapData(response)
  },

  /** 获取通话统计 */
  async getCallStats(): Promise<CallRecordStats> {
    const response = await apiClient.get<ApiResponse<CallRecordStats>>(
      '/yunke/call-records/stats'
    )
    return unwrapData(response)
  },

  /** 获取通话记录详情 */
  async getCallRecord(id: string): Promise<CallRecord> {
    const response = await apiClient.get<ApiResponse<CallRecord>>(
      `/yunke/call-records/${id}`
    )
    return unwrapData(response)
  },

  /** 重新提交 ASR 转写任务 */
  async retranscribeCallRecord(recordId: string): Promise<{
    task_id: string
    record_id: string
    status: string
    provider: string
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        task_id: string
        record_id: string
        status: string
        provider: string
      }>
    >(`/yunke/call-records/${recordId}/retranscribe`)
    return unwrapData(response)
  },

  /** 获取录音 URL */
  async getRecordUrl(voiceId: string): Promise<RecordUrlResponse> {
    const response = await apiClient.post<ApiResponse<RecordUrlResponse>>(
      '/yunke/call-records/record-url',
      { voice_id: voiceId }
    )
    return unwrapData(response)
  },

  /** 提交 AI 分析任务（异步，立即返回） */
  async analyzeCallRecord(recordId: string, options?: AnalyzeCallRecordOptions): Promise<{
    task_id: string
    record_id: string
    status: string
    config_name?: string | null
    model_name?: string | null
    prompt_name?: string | null
    prompt_version?: number | null
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        task_id: string
        record_id: string
        status: string
        config_name?: string | null
        model_name?: string | null
        prompt_name?: string | null
        prompt_version?: number | null
      }>
    >(`/yunke/call-records/${recordId}/analyze`, options ?? {})
    return unwrapData(response)
  },

  /** 查询 AI 分析状态（轻量级轮询） */
  async getAnalysisStatus(recordId: string): Promise<{
    status: string
    analysis: AIAnalysisResult | null
    error: string | null
    analyzed_at: string | null
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        status: string
        analysis: AIAnalysisResult | null
        error: string | null
        analyzed_at: string | null
      }>
    >(`/yunke/call-records/${recordId}/analysis-status`)
    return unwrapData(response)
  },

  /** 获取录音流代理 URL */
  getRecordStreamUrl(voiceId: string): string {
    return `/api/v1/yunke/call-records/record-stream?voice_id=${encodeURIComponent(voiceId)}`
  },

  /** 下载录音文件（带认证，返回 Blob） */
  async downloadRecordBlob(voiceId: string, filename: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/yunke/call-records/record-stream`,
      {
        params: { voice_id: voiceId, download: 1, filename },
        responseType: 'blob',
      }
    )
    return response
  },

  /** 获取部门列表 */
  async getDepartments(): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<string[]>>(
      '/yunke/call-records/departments/list'
    )
    return response.data || []
  },

  /** 获取员工列表 */
  async getStaffList(): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<string[]>>(
      '/yunke/call-records/staff/list'
    )
    return response.data || []
  },

  /** 按电话号码搜索云客通话记录（实时查询） */
  async searchByPhone(params: {
    phone: string
    page?: number
    size?: number
    department_id?: string
    call_type?: string
  }): Promise<{
    items: YunkeCallLogItem[]
    total: number
    page: number
    size: number
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        items: YunkeCallLogItem[]
        total: number
        page: number
        size: number
      }>
    >('/yunke/call-records/search', { params })
    return unwrapData(response)
  },

  /** 获取通话统计数据（从云客 API 实时获取） */
  async getCallStatistics(params: {
    department_id: string
    flag?: 'department' | 'user'
    period?: number
    /** 云客原始 type 参数。0 返回总电话量/通话时长，1 返回联系人数。 */
    stat_type?: number
    user_id?: string
    start_date?: string
    end_date?: string
    incoming_call_type?: string
    account_id?: string // 云客账号ID，用于指定使用哪个账号的凭证
  }): Promise<CallStatisticsData> {
    const response = await apiClient.get<ApiResponse<CallStatisticsData>>(
      '/yunke/call-records/statistics',
      { params }
    )
    return unwrapData(response)
  },

  /** 获取手机统计页“使用状态分析”数据 */
  async getAppCallAndMsgStatistics(params: {
    department_id: string
    time: string
    account_id?: string
  }): Promise<AppCallAndMsgStatisticsData> {
    const response = await apiClient.get<
      ApiResponse<AppCallAndMsgStatisticsData>
    >('/yunke/call-records/app-statistics/call-and-msg', { params })
    return unwrapData(response)
  },

  /** 获取顾问30秒以上外呼排行（本地通话记录聚合） */
  async getEffectiveOutboundRanking(params: {
    start_date: string
    end_date: string
    campus_id?: string
    min_duration?: number
  }): Promise<EffectiveOutboundRankingData> {
    const response = await apiClient.get<ApiResponse<EffectiveOutboundRankingData>>(
      '/yunke/call-records/effective-outbound-ranking',
      { params }
    )
    return unwrapData(response)
  },

  /** 获取员工-校区映射关系 */
  async getEmployeeCampusMapping(): Promise<EmployeeCampusMapping> {
    const response = await apiClient.get<ApiResponse<EmployeeCampusMapping>>(
      '/yunke/call-records/employee-campus-mapping'
    )
    return unwrapData(response)
  },

  /** 获取转录纠错词库 */
  async getTranscriptDictionary(): Promise<{
    corrections: Record<string, string>
    total: number
    source?: string
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        corrections: Record<string, string>
        total: number
        source?: string
      }>
    >('/yunke/call-records/transcript-correction/dictionary')
    return unwrapData(response)
  },

  /** 保存转录纠错词库 */
  async saveTranscriptDictionary(
    corrections: Record<string, string>
  ): Promise<{
    corrections: Record<string, string>
    total: number
    source?: string
  }> {
    const response = await apiClient.put<
      ApiResponse<{
        corrections: Record<string, string>
        total: number
        source?: string
      }>
    >('/yunke/call-records/transcript-correction/dictionary', { corrections })
    return unwrapData(response)
  },

  /** 预览转录纠错结果 */
  async previewTranscriptCorrection(
    corrections: Record<string, string>
  ): Promise<{
    total_records_affected: number
    total_replacements: number
    details: Array<{ wrong: string; correct: string; count: number }>
    sample_records: Array<{
      record_id: string
      staff_name: string
      call_time: string
      original_text: string
      corrected_text: string
    }>
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        total_records_affected: number
        total_replacements: number
        details: Array<{ wrong: string; correct: string; count: number }>
        sample_records: Array<{
          record_id: string
          staff_name: string
          call_time: string
          original_text: string
          corrected_text: string
        }>
      }>
    >('/yunke/call-records/transcript-correction/preview', { corrections })
    return unwrapData(response)
  },

  /** 执行转录纠错 */
  async applyTranscriptCorrection(
    corrections: Record<string, string>
  ): Promise<{
    total_records_updated: number
    total_replacements: number
    details: Array<{ wrong: string; correct: string; replaced: number }>
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        total_records_updated: number
        total_replacements: number
        details: Array<{ wrong: string; correct: string; replaced: number }>
      }>
    >('/yunke/call-records/transcript-correction/apply', { corrections })
    return unwrapData(response)
  },
}

/** 通话统计数据类型 */
export interface CallStatisticsData {
  /** 总电话量姓名列表（stat_type=0） */
  chart2Names1?: string[]
  /** 联系人数姓名列表（stat_type=1） */
  chart2Names2?: string[]
  /** 通话时长姓名列表（stat_type=0） */
  chart2Names3?: string[]
  /** 总电话量数据（stat_type=0） */
  chart2Counts1?: Array<{ name: string; value: number; url?: string }>
  /** 联系人数数据（stat_type=1） */
  chart2Counts2?: Array<{ name: string; value: number; url?: string }>
  /** 通话时长数据（stat_type=0） */
  chart2Counts3?: Array<{ name: string; value: number; url?: string }>
  /** 总通话次数 */
  totalCallCount?: number
  /** 外呼次数 */
  outboundCallCount?: number
  /** 呼入次数 */
  inboundCallCount?: number
  /** 接通次数 */
  connectedCount?: number
  /** 接通率 */
  connectRate?: number
  /** 总通话时长（秒） */
  totalDuration?: number
  /** 平均通话时长（秒） */
  avgDuration?: number
  /** 员工统计列表 */
  userList?: CallStatisticsUserItem[]
  /** 其他原始字段 */
  [key: string]: unknown
}

/** 员工通话统计项 */
export interface CallStatisticsUserItem {
  userId?: string
  userName?: string
  departmentId?: string
  departmentName?: string
  totalCallCount?: number
  outboundCallCount?: number
  inboundCallCount?: number
  connectedCount?: number
  connectRate?: number
  totalDuration?: number
  avgDuration?: number
  [key: string]: unknown
}

/** 手机统计页“使用状态分析”响应 */
export interface AppCallAndMsgStatisticsData {
  companyCode?: string
  startTime?: string
  endTime?: string
  time?: string
  data?: AppCallAndMsgStatisticsRow[]
}

export interface AppCallAndMsgStatisticsRow {
  id: string
  nm: string
  hc: number
  hr: number
  hcsc: number
  hrsc: number
  wjld: number
}

/** 顾问30秒以上外呼排行响应 */
export interface EffectiveOutboundRankingData {
  dateFrom: string
  dateTo: string
  minDuration: number
  totalEffectiveOutboundCallCount: number
  rows: EffectiveOutboundRankingRow[]
}

export interface EffectiveOutboundRankingRow {
  staffName: string
  employeeId: string | null
  campusId: string | null
  campusName: string
  effectiveOutboundCallCount: number
}

/** 员工-校区映射关系 */
export interface EmployeeCampusMapping {
  [employeeName: string]: Array<{
    campus_id: string
    campus_name: string
  }>
}
