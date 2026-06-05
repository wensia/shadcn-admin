/**
 * 通知模块类型定义
 */

// 通知类型枚举
export enum NotificationType {
  LEAD_ASSIGNED = 'lead_assigned',
  LEAD_ACCESS_LIMIT = 'lead_access_limit',
  ORDER_APPROVAL_PENDING = 'order_approval_pending',
  ORDER_APPROVAL_RESULT = 'order_approval_result',
  TASK_ASSIGNED = 'task_assigned',
  RESIGNATION_PENDING = 'resignation_pending',
  RESIGNATION_APPROVED = 'resignation_approved',
  RESIGNATION_REJECTED = 'resignation_rejected',
  IDENTITY_APPLICATION_PENDING = 'identity_application_pending',
  IDENTITY_APPLICATION_APPROVED = 'identity_application_approved',
  IDENTITY_APPLICATION_REJECTED = 'identity_application_rejected',
  SYSTEM = 'system',
}

// 通知类型标签
export const notificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.LEAD_ASSIGNED]: '线索分配',
  [NotificationType.LEAD_ACCESS_LIMIT]: '线索访问提醒',
  [NotificationType.ORDER_APPROVAL_PENDING]: '待审批订单',
  [NotificationType.ORDER_APPROVAL_RESULT]: '审批结果',
  [NotificationType.TASK_ASSIGNED]: '任务分配',
  [NotificationType.RESIGNATION_PENDING]: '离职申请待审批',
  [NotificationType.RESIGNATION_APPROVED]: '离职审批通过',
  [NotificationType.RESIGNATION_REJECTED]: '离职审批驳回',
  [NotificationType.IDENTITY_APPLICATION_PENDING]: '员工身份申请待审批',
  [NotificationType.IDENTITY_APPLICATION_APPROVED]: '员工身份申请通过',
  [NotificationType.IDENTITY_APPLICATION_REJECTED]: '员工身份申请驳回',
  [NotificationType.SYSTEM]: '系统通知',
}

// 通知分类
export type NotificationCategory = 'todo' | 'message'

// 待办类型（需要用户采取行动）
export const TODO_TYPES = new Set([
  NotificationType.LEAD_ASSIGNED,
  NotificationType.ORDER_APPROVAL_PENDING,
  NotificationType.TASK_ASSIGNED,
  NotificationType.RESIGNATION_PENDING,
  NotificationType.IDENTITY_APPLICATION_PENDING,
])

// 判断是否为待办通知
export function isTodoNotification(type: string): boolean {
  return TODO_TYPES.has(type as NotificationType)
}

// 通知响应
export interface Notification {
  id: string
  user_id: string
  notification_type: string
  notification_type_display: string
  title: string
  content: string
  entity_type?: string
  entity_id?: string
  is_read: boolean
  read_at?: string
  sender_id?: string
  sender_name?: string
  created_at: string
  updated_at: string
}

// 通知列表响应
export interface NotificationListResponse {
  items: Notification[]
  total: number
  page: number
  size: number
  pages: number
  unread_count: number
}

// 未读数量响应
export interface UnreadCountResponse {
  count: number
}

// 通知列表查询参数
export interface NotificationListParams {
  page?: number
  size?: number
  is_read?: boolean
  notification_type?: string
  category?: NotificationCategory
}

// 批量标记已读请求
export interface MarkReadRequest {
  notification_ids: string[]
}
