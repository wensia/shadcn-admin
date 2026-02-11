/**
 * 订单管理 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type {
  Order,
  OrderListItem,
  OrderCreate,
  OrderUpdate,
  OrderStats,
  OrderListParams,
  ApprovalRequest,
  CancelRequest,
  ApprovalLog,
  PendingApprovalParams
} from './types'

export const orderApi = {
  /** 获取订单列表 */
  getOrders(params?: OrderListParams): Promise<ApiResponse<PaginatedResponse<OrderListItem>>> {
    return apiClient.get('/orders', { params })
  },

  /** 获取单个订单详情 */
  getOrder(id: string): Promise<ApiResponse<Order>> {
    return apiClient.get(`/orders/${id}`)
  },

  /** 创建订单 */
  createOrder(data: OrderCreate): Promise<ApiResponse<Order>> {
    return apiClient.post('/orders', data)
  },

  /** 更新订单 */
  updateOrder(id: string, data: OrderUpdate): Promise<ApiResponse<Order>> {
    return apiClient.put(`/orders/${id}`, data)
  },

  /** 删除订单 */
  deleteOrder(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/orders/${id}`)
  },

  /** 获取订单统计 */
  getStats(params?: {
    date_from?: string
    date_to?: string
    campus_id?: string
    collector_id?: string
  }): Promise<ApiResponse<OrderStats>> {
    return apiClient.get('/orders/stats', { params })
  },

  /** 获取指定学员的订单列表 */
  getLeadOrders(leadId: string): Promise<ApiResponse<Order[]>> {
    return apiClient.get(`/orders/lead/${leadId}`)
  },

  // ==================== 审批相关 API ====================

  /** 提交订单审批 */
  submitForApproval(orderId: string): Promise<ApiResponse<Order>> {
    return apiClient.post(`/orders/${orderId}/submit`)
  },

  /** 领导审批 */
  leaderApprove(orderId: string, data: ApprovalRequest): Promise<ApiResponse<Order>> {
    return apiClient.post(`/orders/${orderId}/leader-approve`, data)
  },

  /** 财务确认 */
  financeApprove(orderId: string, data: ApprovalRequest): Promise<ApiResponse<Order>> {
    return apiClient.post(`/orders/${orderId}/finance-approve`, data)
  },

  /** 取消订单 */
  cancelOrder(orderId: string, data?: CancelRequest): Promise<ApiResponse<Order>> {
    return apiClient.post(`/orders/${orderId}/cancel`, data || {})
  },

  /** 获取待领导审批的订单列表 */
  getPendingLeaderApprovals(params?: PendingApprovalParams): Promise<ApiResponse<PaginatedResponse<OrderListItem>>> {
    return apiClient.get('/orders/pending/leader', { params })
  },

  /** 获取待财务确认的订单列表 */
  getPendingFinanceApprovals(params?: PendingApprovalParams): Promise<ApiResponse<PaginatedResponse<OrderListItem>>> {
    return apiClient.get('/orders/pending/finance', { params })
  },

  /** 获取订单审批历史 */
  getApprovalLogs(orderId: string): Promise<ApiResponse<ApprovalLog[]>> {
    return apiClient.get(`/orders/${orderId}/approval-logs`)
  }
}
