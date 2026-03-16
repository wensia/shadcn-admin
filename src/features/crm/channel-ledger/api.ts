import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type { ChannelLedgerParams, ChannelLedgerResponse } from './types'

export const channelLedgerApi = {
  getChannelLedger(
    params?: ChannelLedgerParams,
  ): Promise<ApiResponse<ChannelLedgerResponse>> {
    return apiClient.get('/leads/channel-ledger', { params })
  },
}
