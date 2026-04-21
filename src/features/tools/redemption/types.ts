/**
 * 兑换码管理 - 类型定义
 */

export interface RedemptionCodeListItem {
  id: string
  code: string
  tool_id: string
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  max_uses: number
  used_count: number
  expires_at: string | null
  last_redeemed_at: string | null
  created_at: string
  revoked_at: string | null
  revoked_reason: string | null
  notes: string | null
  batch_id: string | null
  is_exhausted: boolean
}

export interface BatchCreateResponse {
  batch_id: string
  created: number
  codes: string[]
  tool_id: string
  max_uses: number
  expires_at: string | null
  notes: string | null
}

export interface VerifyCodeResponse {
  valid: boolean
  tool_id: string
  access_ticket: string | null
  ticket_expires_at: string | null
  remaining_uses: number | null
}

export interface CreateCodesRequest {
  tool_id: string
  count: number
  max_uses: number
  expires_hours?: number | null
  notes?: string | null
}

export interface CodeUsageItem {
  id: string
  redeemed_at: string
  ip_address: string | null
  user_agent: string | null
}
