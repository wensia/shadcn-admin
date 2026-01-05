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
  OrderListParams
} from './types'

export const orderApi = {
  /**
   * 获取订单列表
   */
  async getOrders(params?: OrderListParams): Promise<ApiResponse<PaginatedResponse<OrderListItem>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<OrderListItem>>>('/orders', {
      params
    })
    return response
  },

  /**
   * 获取单个订单详情
   */
  async getOrder(id: string): Promise<ApiResponse<Order>> {
    const response = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`)
    return response
  },

  /**
   * 创建订单
   */
  async createOrder(data: OrderCreate): Promise<ApiResponse<Order>> {
    const response = await apiClient.post<ApiResponse<Order>>('/orders', data)
    return response
  },

  /**
   * 更新订单
   */
  async updateOrder(id: string, data: OrderUpdate): Promise<ApiResponse<Order>> {
    const response = await apiClient.put<ApiResponse<Order>>(`/orders/${id}`, data)
    return response
  },

  /**
   * 删除订单
   */
  async deleteOrder(id: string): Promise<ApiResponse<boolean>> {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/orders/${id}`)
    return response
  },

  /**
   * 获取订单统计
   */
  async getStats(params?: {
    date_from?: string
    date_to?: string
    campus_id?: string
    collector_id?: string
  }): Promise<ApiResponse<OrderStats>> {
    const response = await apiClient.get<ApiResponse<OrderStats>>('/orders/stats', {
      params
    })
    return response
  },

  /**
   * 获取指定学员的订单列表
   */
  async getLeadOrders(leadId: string): Promise<ApiResponse<Order[]>> {
    const response = await apiClient.get<ApiResponse<Order[]>>(`/orders/lead/${leadId}`)
    return response
  }
}

export default orderApi
