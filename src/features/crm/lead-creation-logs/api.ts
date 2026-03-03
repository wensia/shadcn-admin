/**
 * 线索创建日志 API
 */
import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type {
  ChannelSubmitLogItem,
  ChannelSubmitLogParams,
  ManualLeadLogItem,
  ManualLeadLogParams,
} from './types'

export const leadCreationLogsApi = {
  /** 渠道提交日志列表 */
  getChannelSubmitLogs(
    params?: ChannelSubmitLogParams,
  ): Promise<ApiResponse<PaginatedResponse<ChannelSubmitLogItem>>> {
    return apiClient.get('/crm/channel-submit-logs', { params })
  },

  /** 手动创建线索日志列表 */
  getManualLeadLogs(
    params?: ManualLeadLogParams,
  ): Promise<ApiResponse<PaginatedResponse<ManualLeadLogItem>>> {
    return apiClient.get('/crm/channel-submit-logs/manual-leads', { params })
  },
}
