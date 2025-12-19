/**
 * 高级筛选Sheet组件
 * 遵循 Lyra 风格设计：方正锐利、分组布局、网格排列
 */

import { useState } from 'react'
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
import type { LeadListParams, LeadStatus, IntentionLevel } from '../types'
import { leadStatusLabels, intentionLevelLabels } from '../types'

// ==================== FilterGroup 子组件 ====================
interface FilterGroupProps {
  children: React.ReactNode
  className?: string
}

function FilterGroup({ children, className }: FilterGroupProps) {
  const s = useStyleClasses()

  return (
    <div className={cn('border border-border p-3', s.rounded, className)}>
      <div className={cn('space-y-3')}>
        {children}
      </div>
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

// ==================== FormFacetedFilter 子组件 ====================
interface FilterOption {
  label: string
  value: string
}

interface FormFacetedFilterProps {
  placeholder: string
  options: FilterOption[]
  value?: string
  onChange: (value: string | undefined) => void
  className?: string
}

function FormFacetedFilter({
  placeholder,
  options,
  value,
  onChange,
  className
}: FormFacetedFilterProps) {
  const [open, setOpen] = useState(false)
  const s = useStyleClasses()

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className={cn('shrink-0 opacity-50', s.size.icon)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[200px] p-0', s.rounded)} align="start">
        <Command>
          <CommandInput placeholder={`搜索...`} className={s.text.xs} />
          <CommandList>
            <CommandEmpty className={s.text.xs}>未找到结果</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value === option.value
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onChange(isSelected ? undefined : option.value)
                      setOpen(false)
                    }}
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
            {value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onChange(undefined)
                      setOpen(false)
                    }}
                    className={cn('justify-center text-center', s.text.xs)}
                  >
                    清除选择
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
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
}

export function FilterSheet({ open, onOpenChange, filters, onApplyFilters }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<LeadListParams>(filters)
  const s = useStyleClasses()

  // 获取筛选选项
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    enabled: open
  })

  // 计算活跃筛选数
  const activeFiltersCount = Object.keys(localFilters).filter((key) => {
    const value = localFilters[key as keyof LeadListParams]
    return value !== undefined && value !== '' && value !== null
  }).length

  // 应用筛选
  const handleApply = () => {
    onApplyFilters(localFilters)
    onOpenChange(false)
  }

  // 重置筛选
  const handleReset = () => {
    const emptyFilters: LeadListParams = {}
    setLocalFilters(emptyFilters)
    onApplyFilters(emptyFilters)
  }

  // 更新筛选项
  const updateFilter = (key: keyof LeadListParams, value: any) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value || undefined
    }))
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
          <div className={cn('p-4', s.gap.normal, 'space-y-4')}>

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

              {/* 来源渠道 单独一行 */}
              <FilterField label="来源渠道">
                <FormFacetedFilter
                  placeholder="全部渠道"
                  options={filterOptions?.source_channels.map((channel) => ({
                    value: channel.id,
                    label: channel.name
                  })) || []}
                  value={localFilters.source_channel_id}
                  onChange={(value) => updateFilter('source_channel_id', value)}
                />
              </FilterField>
            </FilterGroup>

            {/* ========== 人员相关 ========== */}
            <FilterGroup>
              {/* 负责顾问 + 创建人 并排 */}
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="负责顾问">
                  <FormFacetedFilter
                    placeholder="全部顾问"
                    options={filterOptions?.advisors.map((advisor) => ({
                      value: advisor.id,
                      label: advisor.name
                    })) || []}
                    value={localFilters.advisor_id}
                    onChange={(value) => updateFilter('advisor_id', value)}
                  />
                </FilterField>

                <FilterField label="创建人">
                  <FormFacetedFilter
                    placeholder="全部创建人"
                    options={filterOptions?.creators.map((creator) => ({
                      value: creator.id,
                      label: creator.name
                    })) || []}
                    value={localFilters.created_by_id}
                    onChange={(value) => updateFilter('created_by_id', value)}
                  />
                </FilterField>
              </div>

              {/* 归属校区 单独一行 */}
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

              <FilterField
                label="无活动天数"
                description="筛选N天内无跟进/创建/激活记录的线索"
              >
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
