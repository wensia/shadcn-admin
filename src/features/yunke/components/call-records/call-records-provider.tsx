/* eslint-disable react-refresh/only-export-components */
/**
 * 通话记录 Context Provider
 * 管理通话记录相关的状态和数据
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { callRecordsApi } from '../../api'
import type { CallRecord, CallRecordListParams, CallRecordStats } from '../../types'

interface CallRecordsContextValue {
  // 数据
  records: CallRecord[]
  total: number
  stats: CallRecordStats | null

  // 加载状态
  isLoading: boolean
  isStatsLoading: boolean

  // 筛选参数
  filters: CallRecordListParams
  setFilters: (filters: CallRecordListParams) => void
  updateFilter: <K extends keyof CallRecordListParams>(key: K, value: CallRecordListParams[K]) => void
  resetFilters: () => void

  // 分页
  page: number
  size: number
  setPage: (page: number) => void
  setSize: (size: number) => void

  // 刷新
  refetch: () => void
}

const CallRecordsContext = createContext<CallRecordsContextValue | null>(null)

const DEFAULT_FILTERS: CallRecordListParams = {
  page: 1,
  size: 20,
}

interface CallRecordsProviderProps {
  children: ReactNode
}

export function CallRecordsProvider({ children }: CallRecordsProviderProps) {
  const [filters, setFiltersState] = useState<CallRecordListParams>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)

  // 查询通话记录
  const { data: recordsData, isLoading, refetch } = useQuery({
    queryKey: ['call-records', { ...filters, page, size }],
    queryFn: () => callRecordsApi.getCallRecords({ ...filters, page, size }),
  })

  // 查询统计数据
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['call-records-stats'],
    queryFn: () => callRecordsApi.getCallStats(),
  })

  const setFilters = useCallback((newFilters: CallRecordListParams) => {
    setFiltersState(newFilters)
    setPage(1) // 重置页码
  }, [])

  const updateFilter = useCallback(<K extends keyof CallRecordListParams>(
    key: K,
    value: CallRecordListParams[K]
  ) => {
    setFiltersState(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
    setPage(1)
  }, [])

  const value = useMemo<CallRecordsContextValue>(() => ({
    records: recordsData?.items || [],
    total: recordsData?.total || 0,
    stats: statsData || null,
    isLoading,
    isStatsLoading,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    page,
    size,
    setPage,
    setSize,
    refetch,
  }), [
    recordsData,
    statsData,
    isLoading,
    isStatsLoading,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    page,
    size,
    refetch,
  ])

  return (
    <CallRecordsContext.Provider value={value}>
      {children}
    </CallRecordsContext.Provider>
  )
}

export function useCallRecords() {
  const context = useContext(CallRecordsContext)
  if (!context) {
    throw new Error('useCallRecords must be used within a CallRecordsProvider')
  }
  return context
}
