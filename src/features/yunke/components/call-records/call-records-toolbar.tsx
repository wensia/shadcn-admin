/**
 * 通话记录筛选工具栏
 * Semi Design 重构
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Input,
  Select,
  Button,
  DatePicker,
  Popover,
  Slider,
} from '@douyinfe/semi-ui-19'
import {
  IconSearch,
  IconClose,
  IconClock,
  IconStar,
  IconTick,
} from '@douyinfe/semi-icons'
import { callRecordsApi } from '../../api'
import { TranscriptCorrectionDialog } from './transcript-correction-dialog'
import type { CallRecordListParams } from '../../types'

function formatDurationShort(v: number): string {
  if (v >= 60) return `${Math.floor(v / 60)}m${v % 60 ? `${v % 60}s` : ''}`
  return `${v}s`
}

interface CallRecordsToolbarProps {
  filters: CallRecordListParams
  onFilterChange: <K extends keyof CallRecordListParams>(key: K, value: CallRecordListParams[K]) => void
  onReset: () => void
  isLoading?: boolean
}

type DateRangeValue = [Date | undefined, Date | undefined] | undefined
type SelectOptionNode = {
  label?: React.ReactNode
}

export function CallRecordsToolbar({
  filters,
  onFilterChange,
  onReset,
  isLoading,
}: CallRecordsToolbarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false)

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
    ? `${formatDurationShort(filters.min_duration ?? 0)} - ${filters.max_duration !== undefined ? formatDurationShort(filters.max_duration) : '不限'}`
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

  // 员工选项列表
  const staffOptions = [
    { value: '', label: '全部员工' },
    ...staffList.map((name) => ({ value: name, label: name })),
  ]

  // 部门选项列表
  const departmentOptions = departments.map((dept) => ({ value: dept, label: dept }))

  // 通话时长 Slider 当前值
  const durationSliderValue: [number, number] = [
    filters.min_duration ?? 0,
    filters.max_duration ?? 600,
  ]

  const formatDuration = (v: number | undefined) => {
    if (v === undefined) return ''
    if (v >= 60) return `${Math.floor(v / 60)}m${v % 60 ? `${v % 60}s` : ''}`
    return `${v}s`
  }

  // 通话时长弹出内容（拖拽条）
  const durationContent = (
    <div style={{ padding: '16px 20px', width: 280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>通话时长筛选</span>
        <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
          {formatDuration(durationSliderValue[0])} - {durationSliderValue[1] >= 600 ? '不限' : formatDuration(durationSliderValue[1])}
        </span>
      </div>
      <Slider
        range
        min={0}
        max={600}
        step={10}
        value={durationSliderValue}
        onChange={(val) => {
          const [min, max] = val as number[]
          onFilterChange('min_duration', min === 0 ? undefined : min)
          onFilterChange('max_duration', max >= 600 ? undefined : max)
        }}
        tipFormatter={(v) => v !== undefined && v >= 60 ? `${Math.floor(v / 60)}分${v % 60 ? `${v % 60}秒` : ''}` : `${v}秒`}
        marks={{ 0: '0', 60: '1m', 120: '2m', 300: '5m', 600: '10m' }}
        style={{ marginBottom: 8 }}
      />
      {hasDurationFilter && (
        <Button
          theme="borderless"
          size="small"
          onClick={() => {
            onFilterChange('min_duration', undefined)
            onFilterChange('max_duration', undefined)
          }}
          style={{ width: '100%', marginTop: 8, fontSize: 12 }}
        >
          重置时长范围
        </Button>
      )}
    </div>
  )

  // AI 评分 Slider 当前值
  const scoreSliderValue: [number, number] = [
    filters.min_score ?? 0,
    filters.max_score ?? 100,
  ]

  // AI 评分弹出内容（拖拽条）
  const scoreContent = (
    <div style={{ padding: '16px 20px', width: 280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>AI 分析评分筛选</span>
        <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
          {scoreSliderValue[0]} - {scoreSliderValue[1]} 分
        </span>
      </div>
      <Slider
        range
        min={0}
        max={100}
        step={1}
        value={scoreSliderValue}
        onChange={(val) => {
          const [min, max] = val as number[]
          onFilterChange('min_score', min === 0 ? undefined : min)
          onFilterChange('max_score', max === 100 ? undefined : max)
        }}
        tipFormatter={(v) => `${v}分`}
        marks={{ 0: '0', 25: '25', 50: '50', 75: '75', 100: '100' }}
        style={{ marginBottom: 8 }}
      />
      {hasScoreFilter && (
        <Button
          theme="borderless"
          size="small"
          onClick={() => {
            onFilterChange('min_score', undefined)
            onFilterChange('max_score', undefined)
          }}
          style={{ width: '100%', marginTop: 8, fontSize: 12 }}
        >
          重置评分范围
        </Button>
      )}
    </div>
  )

  // 日期范围值
  const dateRangeValue: DateRangeValue =
    filters.start_date || filters.end_date
      ? [
          filters.start_date ? new Date(filters.start_date) : undefined,
          filters.end_date ? new Date(filters.end_date) : undefined,
        ]
      : undefined

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {/* 搜索框 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Input
          prefix={<IconSearch />}
          placeholder="搜索号码/客户名..."
          value={searchInput}
          onChange={(val) => setSearchInput(val)}
          onKeyDown={handleKeyDown}
          style={{ width: 200 }}
          size="default"
        />
        <Button theme="solid" size="default" onClick={handleSearch} icon={<IconSearch />}>
          搜索
        </Button>
      </div>

      {/* 日期范围 */}
      <DatePicker
        type="dateRange"
        value={dateRangeValue}
        onChange={(dates) => {
          if (Array.isArray(dates) && dates.length === 2) {
            const [start, end] = dates as [Date | undefined, Date | undefined]
            onFilterChange('start_date', start ? start.toISOString().split('T')[0] : undefined)
            onFilterChange('end_date', end ? end.toISOString().split('T')[0] : undefined)
          } else {
            onFilterChange('start_date', undefined)
            onFilterChange('end_date', undefined)
          }
        }}
        placeholder={['开始日期', '结束日期']}
        style={{ width: 260 }}
      />

      {/* 部门筛选 */}
      {departments.length > 0 && (
        <Select
          placeholder="部门"
          value={filters.department || undefined}
          onChange={(val) => onFilterChange('department', (val as string) || undefined)}
          optionList={departmentOptions}
          showClear
          style={{ width: 130 }}
        />
      )}

      {/* 员工筛选（可搜索） */}
      {staffList.length > 0 && (
        <Select
          placeholder="全部员工"
          value={filters.staff_name || ''}
          onChange={(val) => onFilterChange('staff_name', (val as string) || undefined)}
          optionList={staffOptions}
          filter
          showClear
          style={{ width: 130 }}
          renderSelectedItem={(optionNode: SelectOptionNode) => {
            return <span>{optionNode.label || '全部员工'}</span>
          }}
        />
      )}

      {/* 通话类型 */}
      <Select
        placeholder="全部类型"
        value={filters.call_type || undefined}
        onChange={(val) => onFilterChange('call_type', (val as string) || undefined)}
        optionList={[
          { value: '外呼', label: '外呼' },
          { value: '呼入', label: '呼入' },
        ]}
        showClear
        style={{ width: 120 }}
      />

      {/* 是否有录音 */}
      <Select
        placeholder="全部录音"
        value={filters.has_recording === undefined ? undefined : String(filters.has_recording)}
        onChange={(val) =>
          onFilterChange('has_recording', val === undefined || val === '' ? undefined : val === 'true')
        }
        optionList={[
          { value: 'true', label: '有录音' },
          { value: 'false', label: '无录音' },
        ]}
        showClear
        style={{ width: 110 }}
      />

      {/* 转录状态 */}
      <Select
        placeholder="全部转录"
        value={filters.transcript_status || undefined}
        onChange={(val) => onFilterChange('transcript_status', (val as string) || undefined)}
        optionList={[
          { value: 'completed', label: '已转录' },
          { value: 'failed', label: '转录失败' },
          { value: 'pending', label: '待转录' },
          { value: 'processing', label: '转录中' },
          { value: 'none', label: '无转录' },
        ]}
        showClear
        style={{ width: 110 }}
      />

      {/* 通话时长筛选 */}
      <Popover
        trigger="click"
        position="bottomLeft"
        content={durationContent}
      >
        <span>
          <Button
            theme={hasDurationFilter ? 'solid' : 'light'}
            size="default"
            icon={<IconClock />}
          >
            {hasDurationFilter ? durationLabel : '通话时长'}
          </Button>
        </span>
      </Popover>

      {/* AI 分析状态 */}
      <Select
        placeholder="全部分析"
        value={filters.ai_analysis_status || undefined}
        onChange={(val) => onFilterChange('ai_analysis_status', (val as string) || undefined)}
        optionList={[
          { value: 'completed', label: '已分析' },
          { value: 'none', label: '未分析' },
          { value: 'processing', label: '分析中' },
          { value: 'failed', label: '分析失败' },
        ]}
        showClear
        style={{ width: 120 }}
      />

      {/* AI 分析评分筛选 */}
      <Popover
        trigger="click"
        position="bottomLeft"
        content={scoreContent}
      >
        <span>
          <Button
            theme={hasScoreFilter ? 'solid' : 'light'}
            size="default"
            icon={<IconStar />}
          >
            {hasScoreFilter ? scoreLabel : 'AI评分'}
          </Button>
        </span>
      </Popover>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        {hasFilters && (
          <Button theme="borderless" icon={<IconClose />} onClick={onReset}>
            清除筛选
          </Button>
        )}
        <Button
          theme="light"
          icon={<IconTick />}
          onClick={() => setCorrectionDialogOpen(true)}
        >
          文本纠错
        </Button>
      </div>

      <TranscriptCorrectionDialog
        open={correctionDialogOpen}
        onOpenChange={setCorrectionDialogOpen}
      />
    </div>
  )
}
