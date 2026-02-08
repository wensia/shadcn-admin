/**
 * 通话记录筛选工具栏
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/date-picker'
import { Search, X, RefreshCw } from 'lucide-react'
import { callRecordsApi } from '../../api'
import type { CallRecordListParams } from '../../types'

interface CallRecordsToolbarProps {
  filters: CallRecordListParams
  onFilterChange: <K extends keyof CallRecordListParams>(key: K, value: CallRecordListParams[K]) => void
  onReset: () => void
  onRefresh: () => void
  isLoading?: boolean
}

export function CallRecordsToolbar({
  filters,
  onFilterChange,
  onReset,
  onRefresh,
  isLoading,
}: CallRecordsToolbarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '')

  // 获取部门列表
  const { data: departments = [] } = useQuery({
    queryKey: ['call-records-departments'],
    queryFn: () => callRecordsApi.getDepartments(),
    staleTime: 5 * 60 * 1000,
  })

  // 获取员工列表
  const { data: staffList = [] } = useQuery({
    queryKey: ['call-records-staff'],
    queryFn: () => callRecordsApi.getStaffList(),
    staleTime: 5 * 60 * 1000,
  })

  const handleSearch = () => {
    onFilterChange('search', searchInput || undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const hasFilters = !!(
    filters.start_date ||
    filters.end_date ||
    filters.department ||
    filters.staff_name ||
    filters.call_type ||
    filters.call_result ||
    filters.has_recording !== undefined ||
    filters.transcript_status ||
    filters.search
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 搜索框 */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索号码/客户名..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-8 w-[200px]"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={handleSearch}>
          搜索
        </Button>
      </div>

      {/* 日期范围 */}
      <DateRangePicker
        startDate={filters.start_date}
        endDate={filters.end_date}
        onStartDateChange={(date) => onFilterChange('start_date', date)}
        onEndDateChange={(date) => onFilterChange('end_date', date)}
        startPlaceholder="开始日期"
        endPlaceholder="结束日期"
      />

      {/* 部门筛选 */}
      {departments.length > 0 && (
        <Select
          value={filters.department || 'all'}
          onValueChange={(v) => onFilterChange('department', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="部门" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部部门</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 员工筛选 */}
      {staffList.length > 0 && (
        <Select
          value={filters.staff_name || 'all'}
          onValueChange={(v) => onFilterChange('staff_name', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="员工" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部员工</SelectItem>
            {staffList.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 通话类型 */}
      <Select
        value={filters.call_type || 'all'}
        onValueChange={(v) => onFilterChange('call_type', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          <SelectItem value="s">外呼</SelectItem>
          <SelectItem value="i">呼入</SelectItem>
        </SelectContent>
      </Select>

      {/* 是否有录音 */}
      <Select
        value={filters.has_recording === undefined ? 'all' : String(filters.has_recording)}
        onValueChange={(v) =>
          onFilterChange('has_recording', v === 'all' ? undefined : v === 'true')
        }
      >
        <SelectTrigger className="w-[110px]">
          <SelectValue placeholder="录音" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部录音</SelectItem>
          <SelectItem value="true">有录音</SelectItem>
          <SelectItem value="false">无录音</SelectItem>
        </SelectContent>
      </Select>

      {/* 转录状态 */}
      <Select
        value={filters.transcript_status || 'all'}
        onValueChange={(v) => onFilterChange('transcript_status', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[110px]">
          <SelectValue placeholder="转录状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部转录</SelectItem>
          <SelectItem value="completed">已转录</SelectItem>
          <SelectItem value="failed">转录失败</SelectItem>
          <SelectItem value="pending">待转录</SelectItem>
          <SelectItem value="processing">转录中</SelectItem>
          <SelectItem value="none">无转录</SelectItem>
        </SelectContent>
      </Select>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>
    </div>
  )
}
