export interface ToolUserQuotaListItem {
  id: string
  user_id: string
  user_name: string
  user_username: string
  tool_id: string
  daily_limit: number
  is_active: boolean
  today_used: number
  updated_by_name: string | null
  updated_at: string
  created_at: string
}

export interface SetQuotaRequest {
  user_id: string
  tool_id: string
  daily_limit: number
}

export interface UserOption {
  id: string
  name: string
  username: string
}
