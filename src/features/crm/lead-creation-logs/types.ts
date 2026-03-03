/**
 * 线索创建日志类型定义
 */

/** 渠道提交日志列表项 */
export interface ChannelSubmitLogItem {
  id: string
  created_at: string
  source_channel_name: string
  status: string
  phone_masked: string
  message?: string | null
  submitter_name?: string | null
  campus_name?: string | null
  lead_id?: string | null
  submit_mode?: string | null
}

/** 手动创建线索日志列表项 */
export interface ManualLeadLogItem {
  id: string
  created_at: string
  source_channel_name: string
  phone_masked: string
  creator_name: string
  campus_name?: string | null
}

/** 渠道提交日志查询参数 */
export interface ChannelSubmitLogParams {
  page?: number
  size?: number
  source_channel_id?: string
  status?: string
  date_from?: string
  date_to?: string
}

/** 手动创建线索日志查询参数 */
export interface ManualLeadLogParams {
  page?: number
  size?: number
  source_channel_id?: string
  date_from?: string
  date_to?: string
}

/** 渠道提交状态配置 */
export const submitStatusConfig: Record<
  string,
  { label: string; color: string }
> = {
  created: { label: '新录入', color: 'green' },
  collision_taken: { label: '撞量接管', color: 'orange' },
  collision_active: { label: '撞量跟进中', color: 'yellow' },
  duplicate: { label: '重复', color: 'grey' },
  invalid: { label: '无效', color: 'red' },
  error: { label: '错误', color: 'red' },
}

/** 提交方式标签映射 */
export const submitModeLabels: Record<string, string> = {
  single: '单条',
  batch: '批量',
}
