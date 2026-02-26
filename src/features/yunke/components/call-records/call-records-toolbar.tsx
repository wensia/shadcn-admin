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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Search, X, RefreshCw, Timer, BrainCircuit, SpellCheck, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { callRecordsApi } from '../../api'
import { TranscriptCorrectionDialog } from './transcript-correction-dialog'
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
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false)
  const [staffPopoverOpen, setStaffPopoverOpen] = useState(false)

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

  const hasDurationFilter = filters.min_duration !== undefined || filters.max_duration !== undefined
  const durationLabel = hasDurationFilter
    ? `${filters.min_duration ?? 0}s${filters.max_duration !== undefined ? ` - ${filters.max_duration}s` : '+'}`
    : ''

  const hasScoreFilter = filters.min_score !== undefined || filters.max_score !== undefined
  const scoreLabel = hasScoreFilter
    ? `${filters.min_score ?? 0}${filters.max_score !== undefined ? ` - ${filters.max_score}` : '+'}`
    : ''

  const hasFilters = !!(
    filters.start_date ||
    filters.end_date ||
    filters.department ||
    filters.staff_name ||
    filters.call_type ||
    filters.call_result ||
    filters.has_recording !== undefined ||
    filters.transcript_status ||
    hasDurationFilter ||
    filters.search ||
    filters.ai_analysis_status ||
    hasScoreFilter
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
            className="pl-8 w-[200px] h-9"
          />
        </div>
        <Button variant="default" size="sm" className="h-9" onClick={handleSearch}>
          <Search className="h-4 w-4" />
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

      {/* 员工筛选（可搜索） */}
      {staffList.length > 0 && (
        <Popover open={staffPopoverOpen} onOpenChange={setStaffPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={staffPopoverOpen}
              className="w-[130px] justify-between h-9 px-3 font-normal"
            >
              <span className="truncate">
                {filters.staff_name || '全部员工'}
              </span>
              <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="搜索员工..." />
              <CommandList>
                <CommandEmpty>未找到员工</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="全部员工"
                    onSelect={() => {
                      onFilterChange('staff_name', undefined)
                      setStaffPopoverOpen(false)
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', !filters.staff_name ? 'opacity-100' : 'opacity-0')} />
                    全部员工
                  </CommandItem>
                  {staffList.map((name) => (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => {
                        onFilterChange('staff_name', name)
                        setStaffPopoverOpen(false)
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', filters.staff_name === name ? 'opacity-100' : 'opacity-0')} />
                      {name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* 通话类型 */}
      <Select
        value={filters.call_type || 'all'}
        onValueChange={(v) => onFilterChange('call_type', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          <SelectItem value="外呼">外呼</SelectItem>
          <SelectItem value="呼入">呼入</SelectItem>
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

      {/* 通话时长筛选 */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={hasDurationFilter ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-1.5"
          >
            <Timer className="h-4 w-4" />
            {hasDurationFilter ? durationLabel : '通话时长'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <p className="text-sm font-medium">通话时长筛选（秒）</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">最小</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={filters.min_duration ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    onFilterChange('min_duration', val === '' ? undefined : Number(val))
                  }}
                  className="h-8"
                />
              </div>
              <span className="text-muted-foreground mt-5">—</span>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">最大</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="不限"
                  value={filters.max_duration ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    onFilterChange('max_duration', val === '' ? undefined : Number(val))
                  }}
                  className="h-8"
                />
              </div>
            </div>
            {hasDurationFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => {
                  onFilterChange('min_duration', undefined)
                  onFilterChange('max_duration', undefined)
                }}
              >
                清除时长筛选
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* AI 分析状态 */}
      <Select
        value={filters.ai_analysis_status || 'all'}
        onValueChange={(v) => onFilterChange('ai_analysis_status', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="AI分析" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部分析</SelectItem>
          <SelectItem value="completed">已分析</SelectItem>
          <SelectItem value="none">未分析</SelectItem>
          <SelectItem value="processing">分析中</SelectItem>
          <SelectItem value="failed">分析失败</SelectItem>
        </SelectContent>
      </Select>

      {/* AI 分析评分筛选 */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={hasScoreFilter ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-1.5"
          >
            <BrainCircuit className="h-4 w-4" />
            {hasScoreFilter ? scoreLabel : 'AI评分'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <p className="text-sm font-medium">AI 分析评分筛选</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">最低分</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0"
                  value={filters.min_score ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    onFilterChange('min_score', val === '' ? undefined : Number(val))
                  }}
                  className="h-8"
                />
              </div>
              <span className="text-muted-foreground mt-5">—</span>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">最高分</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="100"
                  value={filters.max_score ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    onFilterChange('max_score', val === '' ? undefined : Number(val))
                  }}
                  className="h-8"
                />
              </div>
            </div>
            {hasScoreFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => {
                  onFilterChange('min_score', undefined)
                  onFilterChange('max_score', undefined)
                }}
              >
                清除评分筛选
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={onReset}>
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setCorrectionDialogOpen(true)}
        >
          <SpellCheck className="h-4 w-4 mr-1" />
          文本纠错
        </Button>
        <Button variant="outline" size="sm" className="h-9" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <TranscriptCorrectionDialog
        open={correctionDialogOpen}
        onOpenChange={setCorrectionDialogOpen}
      />
    </div>
  )
}
