/**
 * 高级筛选Sheet组件
 * 遵循 Lyra 风格设计：方正锐利、分组布局、网格排列
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
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
                  <Select
                    value={localFilters.status || undefined}
                    onValueChange={(value) => updateFilter('status', value === '__all__' ? '' : value as LeadStatus)}
                  >
                    <SelectTrigger className={cn(s.height.control, s.text.xs, s.rounded)}>
                      <SelectValue placeholder="全部状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__" className={s.text.xs}>全部状态</SelectItem>
                      {Object.entries(leadStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className={s.text.xs}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="意向等级">
                  <Select
                    value={localFilters.intention_level || undefined}
                    onValueChange={(value) => updateFilter('intention_level', value === '__all__' ? '' : value as IntentionLevel)}
                  >
                    <SelectTrigger className={cn(s.height.control, s.text.xs, s.rounded)}>
                      <SelectValue placeholder="全部意向" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__" className={s.text.xs}>全部意向</SelectItem>
                      {Object.entries(intentionLevelLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className={s.text.xs}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              </div>

              {/* 来源渠道 单独一行 */}
              <FilterField label="来源渠道">
                <Select
                  value={localFilters.source_channel_id || undefined}
                  onValueChange={(value) => updateFilter('source_channel_id', value === '__all__' ? '' : value)}
                >
                  <SelectTrigger className={cn(s.height.control, s.text.xs, s.rounded)}>
                    <SelectValue placeholder="全部渠道" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className={s.text.xs}>全部渠道</SelectItem>
                    {filterOptions?.source_channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id} className={s.text.xs}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </FilterGroup>

            {/* ========== 人员相关 ========== */}
            <FilterGroup>
              {/* 负责顾问 + 创建人 并排 */}
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="负责顾问">
                  <Select
                    value={localFilters.advisor_id || undefined}
                    onValueChange={(value) => updateFilter('advisor_id', value === '__all__' ? '' : value)}
                  >
                    <SelectTrigger className={cn(s.height.control, s.text.xs, s.rounded)}>
                      <SelectValue placeholder="全部顾问" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__" className={s.text.xs}>全部顾问</SelectItem>
                      {filterOptions?.advisors.map((advisor) => (
                        <SelectItem key={advisor.id} value={advisor.id} className={s.text.xs}>
                          {advisor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="创建人">
                  <Select
                    value={localFilters.created_by_id || undefined}
                    onValueChange={(value) => updateFilter('created_by_id', value === '__all__' ? '' : value)}
                  >
                    <SelectTrigger className={cn(s.height.control, s.text.xs, s.rounded)}>
                      <SelectValue placeholder="全部创建人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__" className={s.text.xs}>全部创建人</SelectItem>
                      {filterOptions?.creators.map((creator) => (
                        <SelectItem key={creator.id} value={creator.id} className={s.text.xs}>
                          {creator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              </div>

              {/* 归属校区 单独一行 */}
              <FilterField label="归属校区">
                <Select
                  value={localFilters.owner_campus_id || undefined}
                  onValueChange={(value) => updateFilter('owner_campus_id', value === '__all__' ? '' : value)}
                >
                  <SelectTrigger className={cn(s.height.control, s.text.xs, s.rounded)}>
                    <SelectValue placeholder="全部校区" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className={s.text.xs}>全部校区</SelectItem>
                    {filterOptions?.campuses?.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id} className={s.text.xs}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
