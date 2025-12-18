/**
 * 高级筛选Sheet组件
 * Mira风格: 紧凑布局、小字号
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { leadsApi } from '../api'
import type { LeadListParams, LeadStatus, IntentionLevel } from '../types'
import { leadStatusLabels, intentionLevelLabels, gradeLabels } from '../types'

interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: LeadListParams
  onApplyFilters: (filters: LeadListParams) => void
}

export function FilterSheet({ open, onOpenChange, filters, onApplyFilters }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<LeadListParams>(filters)

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
      <SheetContent className="w-full sm:max-w-md p-0">
        {/* Mira风格: 紧凑的Sheet Header */}
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base">高级筛选</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                多条件组合筛选线索
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs h-5">
                    {activeFiltersCount}个筛选条件
                  </Badge>
                )}
              </SheetDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* 筛选表单 - Mira风格 */}
        <ScrollArea className="h-[calc(100vh-130px)]">
          <div className="p-4 space-y-4">
            {/* 状态筛选 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">线索状态</Label>
              <Select
                value={localFilters.status || undefined}
                onValueChange={(value) => updateFilter('status', value === '__all__' ? '' : value as LeadStatus)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">全部状态</SelectItem>
                  {Object.entries(leadStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 来源渠道 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">来源渠道</Label>
              <Select
                value={localFilters.source_channel_id || undefined}
                onValueChange={(value) => updateFilter('source_channel_id', value === '__all__' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部渠道" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">全部渠道</SelectItem>
                  {filterOptions?.source_channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id} className="text-xs">
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 负责顾问 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">负责顾问</Label>
              <Select
                value={localFilters.advisor_id || undefined}
                onValueChange={(value) => updateFilter('advisor_id', value === '__all__' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部顾问" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">全部顾问</SelectItem>
                  {filterOptions?.advisors.map((advisor) => (
                    <SelectItem key={advisor.id} value={advisor.id} className="text-xs">
                      {advisor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 创建人 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">创建人</Label>
              <Select
                value={localFilters.created_by_id || undefined}
                onValueChange={(value) => updateFilter('created_by_id', value === '__all__' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部创建人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">全部创建人</SelectItem>
                  {filterOptions?.creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id} className="text-xs">
                      {creator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 归属校区 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">归属校区</Label>
              <Select
                value={localFilters.owner_campus_id || undefined}
                onValueChange={(value) => updateFilter('owner_campus_id', value === '__all__' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部校区" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">全部校区</SelectItem>
                  {/* TODO: 获取校区列表 */}
                  <SelectItem value="campus1" className="text-xs">校区1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 意向等级 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">意向等级</Label>
              <Select
                value={localFilters.intention_level || undefined}
                onValueChange={(value) => updateFilter('intention_level', value === '__all__' ? '' : value as IntentionLevel)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部意向" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">全部意向</SelectItem>
                  {Object.entries(intentionLevelLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 创建时间范围 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">创建时间</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={localFilters.created_from || ''}
                  onChange={(e) => updateFilter('created_from', e.target.value)}
                  placeholder="开始日期"
                />
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={localFilters.created_to || ''}
                  onChange={(e) => updateFilter('created_to', e.target.value)}
                  placeholder="结束日期"
                />
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">标签</Label>
              <Input
                className="h-8 text-xs"
                value={localFilters.tag || ''}
                onChange={(e) => updateFilter('tag', e.target.value)}
                placeholder="输入标签"
              />
            </div>

            {/* 无活动天数 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">无活动天数</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                value={localFilters.days_without_activity || ''}
                onChange={(e) =>
                  updateFilter('days_without_activity', e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="如: 7"
              />
              <p className="text-xs text-muted-foreground">筛选N天内无跟进/创建/激活记录的线索</p>
            </div>

            {/* 搜索关键词 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">搜索关键词</Label>
              <Input
                className="h-8 text-xs"
                value={localFilters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="姓名/手机号"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Mira风格: 紧凑的Sheet Footer */}
        <SheetFooter className="px-4 py-3 border-t gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs flex-1"
          >
            重置
          </Button>
          <Button size="sm" onClick={handleApply} className="h-8 text-xs flex-1">
            应用筛选
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
