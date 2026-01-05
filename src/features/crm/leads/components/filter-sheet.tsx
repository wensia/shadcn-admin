/**
 * 高级筛选Sheet组件
 * 遵循 Lyra 风格设计：方正锐利、分组布局、网格排列
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon } from '@radix-ui/react-icons'
import { ChevronDown, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DateRangePicker } from '@/components/date-picker'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { leadsApi } from '../api'
import { apiClient } from '@/lib/api/client'
import type { LeadListParams, LeadStatus, IntentionLevel, SourceChannelExtraField, Grade } from '../types'
import { leadStatusLabels, intentionLevelLabels, gradeLabels } from '../types'

// 来源渠道响应类型
interface SourceChannelItem {
  id: string
  name: string
  category: string
  extra_fields?: SourceChannelExtraField[]
}

// ==================== FilterGroup 子组件 ====================
interface FilterGroupProps {
  children: React.ReactNode
  className?: string
}

function FilterGroup({ children, className }: FilterGroupProps) {
  return (
    <div className={cn('space-y-3 py-4 first:pt-0 last:pb-0', className)}>
      {children}
    </div>
  )
}

// ==================== FilterField 子组件 ====================
interface FilterFieldProps {
  label: string
  children: React.ReactNode
  description?: string
  className?: string
}

function FilterField({ label, children, description, className }: FilterFieldProps) {
  const s = useStyleClasses()

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className={cn(s.text.xs, 'text-muted-foreground')}>{label}</Label>
      {children}
      {description && (
        <p className={cn(s.text.xs, 'text-muted-foreground')}>{description}</p>
      )}
    </div>
  )
}

// ==================== FormFacetedFilter 子组件（多选模式）====================
interface FilterOption {
  label: string
  value: string
}

interface FormFacetedFilterProps {
  placeholder: string
  options: FilterOption[]
  value?: string[]  // 改为数组
  onChange: (value: string[] | undefined) => void
  className?: string
}

function FormFacetedFilter({
  placeholder,
  options,
  value = [],
  onChange,
  className
}: FormFacetedFilterProps) {
  const [open, setOpen] = useState(false)
  const s = useStyleClasses()

  const selectedValues = new Set(value)

  // 获取选中项的标签用于显示
  const selectedLabels = options
    .filter(opt => selectedValues.has(opt.value))
    .map(opt => opt.label)

  const handleSelect = (optionValue: string) => {
    const newSelectedValues = new Set(selectedValues)
    if (newSelectedValues.has(optionValue)) {
      newSelectedValues.delete(optionValue)
    } else {
      newSelectedValues.add(optionValue)
    }
    const result = Array.from(newSelectedValues)
    onChange(result.length > 0 ? result : undefined)
  }

  const handleClear = () => {
    onChange(undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            s.height.control,
            s.text.xs,
            s.rounded,
            selectedValues.size === 0 && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {selectedValues.size === 0
              ? placeholder
              : selectedValues.size <= 2
                ? selectedLabels.join(', ')
                : `已选 ${selectedValues.size} 项`
            }
          </span>
          <ChevronDown className={cn('shrink-0 opacity-50', s.size.icon)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[200px] p-0', s.rounded)} align="start">
        <Command>
          <CommandInput placeholder="搜索..." className={s.text.xs} />
          <CommandList>
            <CommandEmpty className={s.text.xs}>未找到结果</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className={s.text.xs}
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center border border-primary mr-2',
                        s.rounded,
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {selectedValues.size > 0 && (
            <>
              <CommandSeparator />
              <div className="p-1">
                <CommandGroup>
                  <CommandItem
                    onSelect={handleClear}
                    className={cn('justify-center text-center', s.text.xs)}
                  >
                    清除选择
                  </CommandItem>
                </CommandGroup>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ==================== 主组件 ====================
interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: LeadListParams
  onApplyFilters: (filters: LeadListParams) => void
  /** 清空快捷筛选的回调（状态和意向等级） */
  onClearQuickFilters?: () => void
}

export function FilterSheet({ open, onOpenChange, filters, onApplyFilters, onClearQuickFilters }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<LeadListParams>(filters)
  const s = useStyleClasses()

  // 当 Sheet 打开时，同步父组件的 filters 到 localFilters
  useEffect(() => {
    if (open) {
      setLocalFilters(filters)
    }
  }, [open, filters])

  // 获取来源渠道（使用专门的 API，包含 extra_fields）
  const { data: sourceChannels } = useQuery({
    queryKey: ['source-channels-active'],
    queryFn: async () => {
      const response = await apiClient.get<{ code: number; data: { items: SourceChannelItem[] } }>(
        '/source-channels',
        { params: { page: 1, size: 100, is_active: true } }
      )
      return response.data?.items || []
    },
    enabled: open,
    staleTime: 5 * 60 * 1000 // 5分钟缓存
  })

  // 获取其他筛选选项（校区等）
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    enabled: open,
    staleTime: 5 * 60 * 1000
  })

  // 额外字段筛选状态
  const [sourceExtraFilters, setSourceExtraFilters] = useState<Record<string, string>>({})

  // 计算当前选中渠道的 extra_fields（仅单选时显示）
  const selectedChannelExtraFields = useMemo<SourceChannelExtraField[]>(() => {
    if (localFilters.source_channel_id?.length === 1 && sourceChannels) {
      const selectedChannel = sourceChannels.find(
        (ch) => ch.id === localFilters.source_channel_id?.[0]
      )
      return selectedChannel?.extra_fields || []
    }
    return []
  }, [localFilters.source_channel_id, sourceChannels])

  // 渠道变更时清空额外字段筛选
  useEffect(() => {
    if (localFilters.source_channel_id?.length !== 1) {
      setSourceExtraFilters({})
    }
  }, [localFilters.source_channel_id])

  // 计算活跃筛选数
  const activeFiltersCount = Object.keys(localFilters).filter((key) => {
    const value = localFilters[key as keyof LeadListParams]
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== '' && value !== null
  }).length + (Object.keys(sourceExtraFilters).length > 0 ? 1 : 0)

  // 应用筛选
  const handleApply = () => {
    // 分离已有独立参数的字段和需要放入 source_extra_filters 的字段
    const { collector_name, collection_location, collection_method, collection_time, ...otherExtraFilters } = sourceExtraFilters

    const filtersToApply: LeadListParams = {
      ...localFilters,
      // 采单人和采单地点使用独立参数（后端已支持）
      collector_name: collector_name || undefined,
      collection_location: collection_location || undefined,
      // 其他额外字段（如采单方式、采单时间）放入 source_extra_filters
      source_extra_filters: Object.keys(otherExtraFilters).length > 0
        ? otherExtraFilters
        : undefined
    }

    // 如果高级筛选设置了状态或意向等级，清空快捷筛选以避免冲突
    if (filtersToApply.status?.length || filtersToApply.intention_level?.length) {
      onClearQuickFilters?.()
    }

    onApplyFilters(filtersToApply)
    onOpenChange(false)
  }

  // 重置筛选
  const handleReset = () => {
    const emptyFilters: LeadListParams = {}
    setLocalFilters(emptyFilters)
    setSourceExtraFilters({})
    // 同时清空快捷筛选
    onClearQuickFilters?.()
    onApplyFilters(emptyFilters)
  }

  // 更新筛选项
  const updateFilter = (key: keyof LeadListParams, value: any) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  // 更新额外字段筛选
  const updateExtraFilter = (fieldName: string, value: string) => {
    setSourceExtraFilters(prev => {
      if (!value) {
        const { [fieldName]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [fieldName]: value }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('w-full sm:max-w-lg p-0 flex flex-col [&>button:last-child]:hidden', s.rounded)}>
        {/* ==================== Header ==================== */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle className={s.text.base}>高级筛选</SheetTitle>
              <SheetDescription className={cn(s.text.xs, 'mt-0.5')}>
                多条件组合筛选线索
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className={cn('ml-2', s.text.xs, s.height.badge, s.rounded)}>
                    {activeFiltersCount}个条件
                  </Badge>
                )}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={cn('shrink-0', s.size.button, s.size.button)}
            >
              <X className={s.size.icon} />
              <span className="sr-only">关闭</span>
            </Button>
          </div>
        </SheetHeader>

        {/* ==================== 筛选表单 ==================== */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 divide-y divide-border">

            {/* ========== 来源渠道（独立分组） ========== */}
            <FilterGroup>
              <FilterField label="来源渠道">
                <FormFacetedFilter
                  placeholder="全部渠道"
                  options={sourceChannels?.map((channel) => ({
                    value: channel.id,
                    label: channel.name
                  })) || []}
                  value={localFilters.source_channel_id}
                  onChange={(value) => updateFilter('source_channel_id', value)}
                />
              </FilterField>

              {/* 动态额外字段（仅单选渠道时显示） */}
              {selectedChannelExtraFields.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className={cn(s.text.xs, 'text-muted-foreground')}>
                    渠道额外字段（包含匹配）
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedChannelExtraFields.map((field) => (
                      <FilterField key={field.field_name} label={field.field_label}>
                        {field.field_type === 'select' && field.options && field.options.length > 0 ? (
                          <FormFacetedFilter
                            placeholder={field.placeholder || `选择${field.field_label}`}
                            options={field.options}
                            value={sourceExtraFilters[field.field_name] ? [sourceExtraFilters[field.field_name]] : []}
                            onChange={(val) => updateExtraFilter(field.field_name, val?.[0] || '')}
                          />
                        ) : (
                          <Input
                            className={cn(s.height.control, s.text.xs, s.rounded)}
                            value={sourceExtraFilters[field.field_name] || ''}
                            onChange={(e) => updateExtraFilter(field.field_name, e.target.value)}
                            placeholder={field.placeholder || `输入${field.field_label}`}
                          />
                        )}
                      </FilterField>
                    ))}
                  </div>
                </div>
              )}
            </FilterGroup>

            {/* ========== 基本信息 ========== */}
            <FilterGroup>
              {/* 状态 + 意向等级 并排 */}
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="线索状态">
                  <FormFacetedFilter
                    placeholder="全部状态"
                    options={Object.entries(leadStatusLabels).map(([value, label]) => ({
                      value,
                      label
                    }))}
                    value={localFilters.status}
                    onChange={(value) => updateFilter('status', value as LeadStatus)}
                  />
                </FilterField>

                <FilterField label="意向等级">
                  <FormFacetedFilter
                    placeholder="全部意向"
                    options={Object.entries(intentionLevelLabels).map(([value, label]) => ({
                      value,
                      label
                    }))}
                    value={localFilters.intention_level}
                    onChange={(value) => updateFilter('intention_level', value as IntentionLevel)}
                  />
                </FilterField>
              </div>

              {/* 回访状态筛选 */}
              <FilterField label="回访状态">
                <FormFacetedFilter
                  placeholder="全部"
                  options={[
                    { value: 'all_not_connected', label: '所有都未接通' }
                  ]}
                  value={localFilters.followup_result_filter ? [localFilters.followup_result_filter] : []}
                  onChange={(value) => updateFilter('followup_result_filter', value?.[0] || undefined)}
                />
              </FilterField>
            </FilterGroup>

            {/* ========== 人员相关 ========== */}
            <FilterGroup>
              {/* 负责顾问 + 创建人 并排 - 改为文本输入 */}
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="负责顾问">
                  <Input
                    className={cn(s.height.control, s.text.xs, s.rounded)}
                    value={localFilters.advisor_name || ''}
                    onChange={(e) => updateFilter('advisor_name', e.target.value)}
                    placeholder="输入顾问姓名"
                  />
                </FilterField>

                <FilterField label="创建人">
                  <Input
                    className={cn(s.height.control, s.text.xs, s.rounded)}
                    value={localFilters.created_by_name || ''}
                    onChange={(e) => updateFilter('created_by_name', e.target.value)}
                    placeholder="输入创建人姓名"
                  />
                </FilterField>
              </div>

              {/* 归属校区 + 无活动天数 并排 */}
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="归属校区">
                  <FormFacetedFilter
                    placeholder="全部校区"
                    options={filterOptions?.campuses?.map((campus) => ({
                      value: campus.id,
                      label: campus.name
                    })) || []}
                    value={localFilters.owner_campus_id}
                    onChange={(value) => updateFilter('owner_campus_id', value)}
                  />
                </FilterField>

                <FilterField label="无活动天数">
                  <Input
                    type="number"
                    className={cn(s.height.control, s.text.xs, s.rounded)}
                    value={localFilters.days_without_activity || ''}
                    onChange={(e) =>
                      updateFilter('days_without_activity', e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="如: 7"
                  />
                </FilterField>
              </div>
            </FilterGroup>

            {/* ========== 年龄年级 ========== */}
            <FilterGroup>
              {/* 年龄范围 */}
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="最小年龄">
                  <Input
                    type="number"
                    className={cn(s.height.control, s.text.xs, s.rounded)}
                    value={localFilters.age_min || ''}
                    onChange={(e) =>
                      updateFilter('age_min', e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="如: 3"
                    min={0}
                    max={30}
                  />
                </FilterField>

                <FilterField label="最大年龄">
                  <Input
                    type="number"
                    className={cn(s.height.control, s.text.xs, s.rounded)}
                    value={localFilters.age_max || ''}
                    onChange={(e) =>
                      updateFilter('age_max', e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="如: 12"
                    min={0}
                    max={30}
                  />
                </FilterField>
              </div>

              {/* 年级筛选 */}
              <FilterField label="年级">
                <FormFacetedFilter
                  placeholder="全部年级"
                  options={Object.entries(gradeLabels).map(([value, label]) => ({
                    value,
                    label
                  }))}
                  value={localFilters.grade}
                  onChange={(value) => updateFilter('grade', value as Grade[])}
                />
              </FilterField>
            </FilterGroup>

            {/* ========== 时间条件 ========== */}
            <FilterGroup>
              <FilterField label="创建时间">
                <DateRangePicker
                  startDate={localFilters.created_from}
                  endDate={localFilters.created_to}
                  onStartDateChange={(date) => updateFilter('created_from', date)}
                  onEndDateChange={(date) => updateFilter('created_to', date)}
                  startPlaceholder="开始日期"
                  endPlaceholder="结束日期"
                />
              </FilterField>
            </FilterGroup>

            {/* ========== 其他条件 ========== */}
            <FilterGroup>
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="标签">
                  <Input
                    className={cn(s.height.control, s.text.xs, s.rounded)}
                    value={localFilters.tag || ''}
                    onChange={(e) => updateFilter('tag', e.target.value)}
                    placeholder="输入标签"
                  />
                </FilterField>

                <FilterField label="搜索关键词">
                  <Input
                    className={cn(s.height.control, s.text.xs, s.rounded)}
                    value={localFilters.search || ''}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    placeholder="姓名/手机号"
                  />
                </FilterField>
              </div>
            </FilterGroup>

          </div>
        </ScrollArea>

        {/* ==================== Footer ==================== */}
        <SheetFooter className="px-4 py-3 border-t flex flex-row gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={handleReset}
            className={cn(s.height.control, s.text.sm, s.rounded, 'flex-1')}
          >
            重置
          </Button>
          <Button
            onClick={handleApply}
            className={cn(s.height.control, s.text.sm, s.rounded, 'flex-1')}
          >
            应用筛选
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
