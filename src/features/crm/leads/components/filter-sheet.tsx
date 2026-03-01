/**
 * 高级筛选 SideSheet - Semi Design 版本
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  SideSheet,
  Button,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Typography,
  Divider,
  Tag,
} from '@douyinfe/semi-ui-19'
import { IconClose } from '@douyinfe/semi-icons'
import { leadsApi } from '../api'
import { apiClient } from '@/lib/api/client'
import type {
  LeadListParams,
  LeadStatus,
  IntentionLevel,
  SourceChannelExtraField,
  Grade,
  FollowupResult,
} from '../types'
import {
  leadStatusLabels,
  intentionLevelLabels,
  gradeLabels,
  followupResultLabels,
} from '../types'

const { Text, Title } = Typography

// 来源渠道响应类型
interface SourceChannelItem {
  id: string
  name: string
  category: string
  extra_fields?: SourceChannelExtraField[]
}

// ==================== 筛选字段包装 ====================
function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Text
        type="tertiary"
        style={{ fontSize: 13, marginBottom: 6, display: 'block' }}
      >
        {label}
      </Text>
      {children}
    </div>
  )
}

// ==================== 主组件 ====================
interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: LeadListParams
  onApplyFilters: (filters: LeadListParams) => void
  onClearQuickFilters?: () => void
}

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
  onClearQuickFilters,
}: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<LeadListParams>(filters)

  useEffect(() => {
    if (open) setLocalFilters(filters)
  }, [open, filters])

  // 获取来源渠道
  const { data: sourceChannels } = useQuery({
    queryKey: ['source-channels-active'],
    queryFn: async () => {
      const response = await apiClient.get<{
        code: number
        data: { items: SourceChannelItem[] }
      }>('/source-channels', { params: { page: 1, size: 100, is_active: true } })
      return response.data?.items || []
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  // 获取其他筛选选项
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const followupResultOptions = useMemo(() => {
    if (filterOptions?.followup_results && filterOptions.followup_results.length > 0) {
      return filterOptions.followup_results.map((item) => ({
        value: item.value,
        label: item.label,
      }))
    }
    return Object.entries(followupResultLabels).map(([value, label]) => ({
      value,
      label,
    }))
  }, [filterOptions])

  // 额外字段筛选
  const [sourceExtraFilters, setSourceExtraFilters] = useState<Record<string, string>>({})
  const [enableActivatedFilter, setEnableActivatedFilter] = useState(false)

  useEffect(() => {
    if (open) setEnableActivatedFilter(!!(filters.activated_from || filters.activated_to))
  }, [open, filters.activated_from, filters.activated_to])

  // 选中渠道的额外字段
  const selectedChannelExtraFields = useMemo<SourceChannelExtraField[]>(() => {
    if (localFilters.source_channel_id?.length === 1 && sourceChannels) {
      const ch = sourceChannels.find((c) => c.id === localFilters.source_channel_id?.[0])
      return ch?.extra_fields || []
    }
    return []
  }, [localFilters.source_channel_id, sourceChannels])

  useEffect(() => {
    if (localFilters.source_channel_id?.length !== 1) setSourceExtraFilters({})
  }, [localFilters.source_channel_id])

  // 计算活跃筛选数
  const activeFiltersCount =
    Object.keys(localFilters).filter((key) => {
      const value = localFilters[key as keyof LeadListParams]
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== '' && value !== null
    }).length + (Object.keys(sourceExtraFilters).length > 0 ? 1 : 0)

  const updateFilter = (key: keyof LeadListParams, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const updateExtraFilter = (fieldName: string, value: string) => {
    setSourceExtraFilters((prev) => {
      if (!value) {
        const { [fieldName]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [fieldName]: value }
    })
  }

  const handleApply = () => {
    const { collector_name, collection_location, ...otherExtraFilters } = sourceExtraFilters
    const filtersToApply: LeadListParams = {
      ...localFilters,
      collector_name: collector_name || undefined,
      collection_location: collection_location || undefined,
      source_extra_filters: Object.keys(otherExtraFilters).length > 0 ? otherExtraFilters : undefined,
    }
    if (filtersToApply.status?.length || filtersToApply.intention_level?.length) {
      onClearQuickFilters?.()
    }
    onApplyFilters(filtersToApply)
    onOpenChange(false)
  }

  const handleReset = () => {
    const emptyFilters: LeadListParams = {}
    setLocalFilters(emptyFilters)
    setSourceExtraFilters({})
    setEnableActivatedFilter(false)
    onClearQuickFilters?.()
    onApplyFilters(emptyFilters)
  }

  return (
    <SideSheet
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>高级筛选</span>
          {activeFiltersCount > 0 && (
            <Tag>{activeFiltersCount}个条件</Tag>
          )}
        </div>
      }
      visible={open}
      onCancel={() => onOpenChange(false)}
      placement="right"
      width={480}
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* 筛选表单 - 可滚动 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {/* 来源渠道 */}
        <FilterField label="来源渠道">
          <Select
            placeholder="全部渠道"
            multiple
            maxTagCount={3}
            value={localFilters.source_channel_id || []}
            onChange={(v) => updateFilter('source_channel_id', v)}
            style={{ width: '100%' }}
            showClear
          >
            {sourceChannels?.map((ch) => (
              <Select.Option key={ch.id} value={ch.id}>
                {ch.name}
              </Select.Option>
            ))}
          </Select>
        </FilterField>

        {/* 动态额外字段 */}
        {selectedChannelExtraFields.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Text type="tertiary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
              渠道额外字段（包含匹配）
            </Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {selectedChannelExtraFields.map((field) => (
                <FilterField key={field.field_name} label={field.field_label}>
                  {field.field_type === 'select' && field.options && field.options.length > 0 ? (
                    <Select
                      placeholder={field.placeholder || `选择${field.field_label}`}
                      value={sourceExtraFilters[field.field_name] || undefined}
                      onChange={(v) => updateExtraFilter(field.field_name, (v as string) || '')}
                      style={{ width: '100%' }}
                      showClear
                    >
                      {field.options.map((opt) => (
                        <Select.Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={sourceExtraFilters[field.field_name] || ''}
                      onChange={(v) => updateExtraFilter(field.field_name, v)}
                      placeholder={field.placeholder || `输入${field.field_label}`}
                    />
                  )}
                </FilterField>
              ))}
            </div>
          </div>
        )}

        <Divider />

        {/* 状态 + 意向等级 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FilterField label="线索状态">
            <Select
              placeholder="全部状态"
              multiple
              maxTagCount={2}
              value={localFilters.status || []}
              onChange={(v) => updateFilter('status', v as LeadStatus[])}
              style={{ width: '100%' }}
              showClear
            >
              {Object.entries(leadStatusLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="意向等级">
            <Select
              placeholder="全部意向"
              multiple
              value={localFilters.intention_level || []}
              onChange={(v) => updateFilter('intention_level', v as IntentionLevel[])}
              style={{ width: '100%' }}
              showClear
            >
              {Object.entries(intentionLevelLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </FilterField>
        </div>

        {/* 回访筛选 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FilterField label="回访筛选">
            <Select
              placeholder="筛选方式"
              value={localFilters.followup_result_mode || undefined}
              onChange={(v) => updateFilter('followup_result_mode', v || undefined)}
              style={{ width: '100%' }}
              showClear
            >
              <Select.Option value="include">包含</Select.Option>
              <Select.Option value="exclude">不包含</Select.Option>
              <Select.Option value="all">全部为</Select.Option>
            </Select>
          </FilterField>
          <FilterField label="回访状态">
            <Select
              placeholder="全部回访状态"
              multiple
              maxTagCount={2}
              value={localFilters.followup_results || []}
              onChange={(v) => {
                if (!v || (v as string[]).length === 0) {
                  updateFilter('followup_results', undefined)
                  updateFilter('followup_result_mode', undefined)
                  return
                }
                updateFilter('followup_results', v as FollowupResult[])
                if (!localFilters.followup_result_mode) {
                  updateFilter('followup_result_mode', 'include')
                }
              }}
              style={{ width: '100%' }}
              showClear
            >
              {followupResultOptions.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </FilterField>
        </div>

        <Divider />

        {/* 人员相关 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FilterField label="负责顾问">
            <Input
              value={localFilters.advisor_name || ''}
              onChange={(v) => updateFilter('advisor_name', v)}
              placeholder="输入顾问姓名"
            />
          </FilterField>
          <FilterField label="创建人">
            <Input
              value={localFilters.created_by_name || ''}
              onChange={(v) => updateFilter('created_by_name', v)}
              placeholder="输入创建人姓名"
            />
          </FilterField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FilterField label="归属校区">
            <Select
              placeholder="全部校区"
              multiple
              maxTagCount={2}
              value={localFilters.owner_campus_id || []}
              onChange={(v) => updateFilter('owner_campus_id', v)}
              style={{ width: '100%' }}
              showClear
            >
              {filterOptions?.campuses?.map((campus) => (
                <Select.Option key={campus.id} value={campus.id}>
                  {campus.name}
                </Select.Option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="无活动天数">
            <Input
              type="number"
              value={localFilters.days_without_activity?.toString() || ''}
              onChange={(v) =>
                updateFilter('days_without_activity', v ? parseInt(v) : undefined)
              }
              placeholder="如: 7"
            />
          </FilterField>
        </div>

        <Divider />

        {/* 年龄年级 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FilterField label="最小年龄">
            <Input
              type="number"
              value={localFilters.age_min?.toString() || ''}
              onChange={(v) =>
                updateFilter('age_min', v ? parseInt(v) : undefined)
              }
              placeholder="如: 3"
            />
          </FilterField>
          <FilterField label="最大年龄">
            <Input
              type="number"
              value={localFilters.age_max?.toString() || ''}
              onChange={(v) =>
                updateFilter('age_max', v ? parseInt(v) : undefined)
              }
              placeholder="如: 12"
            />
          </FilterField>
        </div>

        <FilterField label="年级">
          <Select
            placeholder="全部年级"
            multiple
            maxTagCount={3}
            value={localFilters.grade || []}
            onChange={(v) => updateFilter('grade', v as Grade[])}
            style={{ width: '100%' }}
            showClear
          >
            {Object.entries(gradeLabels).map(([value, label]) => (
              <Select.Option key={value} value={value}>
                {label}
              </Select.Option>
            ))}
          </Select>
        </FilterField>

        <Divider />

        {/* 时间条件 */}
        <FilterField label="创建时间">
          <DatePicker
            type="dateRange"
            value={
              localFilters.created_from || localFilters.created_to
                ? [
                    localFilters.created_from ? new Date(localFilters.created_from) : undefined,
                    localFilters.created_to ? new Date(localFilters.created_to) : undefined,
                  ] as any
                : undefined
            }
            onChange={(dates) => {
              if (dates && Array.isArray(dates) && dates.length === 2) {
                const [start, end] = dates as [Date | undefined, Date | undefined]
                updateFilter(
                  'created_from',
                  start ? start.toISOString().split('T')[0] : undefined
                )
                updateFilter(
                  'created_to',
                  end ? end.toISOString().split('T')[0] : undefined
                )
              } else {
                updateFilter('created_from', undefined)
                updateFilter('created_to', undefined)
              }
            }}
            placeholder={['开始日期', '结束日期']}
            style={{ width: '100%' }}
          />
        </FilterField>

        {/* 激活时间 */}
        <div style={{ marginBottom: 12 }}>
          <Checkbox
            checked={enableActivatedFilter}
            onChange={(e) => {
              const checked = e.target.checked
              setEnableActivatedFilter(checked)
              if (!checked) {
                updateFilter('activated_from', undefined)
                updateFilter('activated_to', undefined)
              }
            }}
          >
            <Text style={{ fontSize: 13 }}>包含激活时间筛选</Text>
          </Checkbox>
          {enableActivatedFilter && (
            <div style={{ marginTop: 8 }}>
              <DatePicker
                type="dateRange"
                value={
                  localFilters.activated_from || localFilters.activated_to
                    ? [
                        localFilters.activated_from ? new Date(localFilters.activated_from) : undefined,
                        localFilters.activated_to ? new Date(localFilters.activated_to) : undefined,
                      ] as any
                    : undefined
                }
                onChange={(dates) => {
                  if (dates && Array.isArray(dates) && dates.length === 2) {
                    const [start, end] = dates as [Date | undefined, Date | undefined]
                    updateFilter('activated_from', start ? start.toISOString().split('T')[0] : undefined)
                    updateFilter('activated_to', end ? end.toISOString().split('T')[0] : undefined)
                  } else {
                    updateFilter('activated_from', undefined)
                    updateFilter('activated_to', undefined)
                  }
                }}
                placeholder={['激活开始', '激活结束']}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        <Divider />

        {/* 其他条件 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FilterField label="标签">
            <Input
              value={localFilters.tag || ''}
              onChange={(v) => updateFilter('tag', v)}
              placeholder="输入标签"
            />
          </FilterField>
          <FilterField label="搜索关键词">
            <Input
              value={localFilters.search || ''}
              onChange={(v) => updateFilter('search', v)}
              placeholder="姓名/手机号"
            />
          </FilterField>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 20px',
          borderTop: '1px solid var(--semi-color-border)',
          flexShrink: 0,
        }}
      >
        <Button style={{ flex: 1 }} onClick={handleReset}>
          重置
        </Button>
        <Button style={{ flex: 1 }} theme="solid" onClick={handleApply}>
          应用筛选
        </Button>
      </div>
    </SideSheet>
  )
}
