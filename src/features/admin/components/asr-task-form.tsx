/**
 * ASR 任务专用参数表单组件
 *
 * 用于配置 ASR 语音转录定时任务的参数
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, ChevronDown, Mic } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { asrConfigApi } from '../api'
import { TIME_RANGE_PRESETS, ASR_PROVIDER_OPTIONS } from '../types'

// 表单验证模式
const asrTaskFormSchema = z.object({
  asr_config_id: z.string().min(1, '请选择 ASR 配置'),
  time_range_type: z.enum(['today', 'yesterday', 'last_7_days', 'last_30_days', 'custom']),
  custom_start_time: z.string().optional(),
  custom_end_time: z.string().optional(),
  skip_existing: z.boolean().default(true),
  min_duration: z.coerce.number().int().min(0).default(0),
  batch_size: z.coerce.number().int().min(1).max(100).default(10),
  max_records: z.coerce.number().int().min(0).default(0),
  concurrency: z.coerce.number().int().min(1).max(20).default(5),
}).refine(
  (data) => {
    if (data.time_range_type === 'custom') {
      return data.custom_start_time && data.custom_end_time
    }
    return true
  },
  {
    message: '自定义时间范围需要填写开始和结束时间',
    path: ['custom_start_time'],
  }
)

type ASRTaskFormData = z.infer<typeof asrTaskFormSchema>

interface ASRTaskFormProps {
  /** 初始值（用于编辑） */
  initialValues?: {
    asr_config_id?: number | string
    start_time?: string
    end_time?: string
    skip_existing?: boolean
    min_duration?: number
    batch_size?: number
    max_records?: number
    concurrency?: number
  }
  /** 值变化时回调 */
  onChange: (kwargs: Record<string, unknown>) => void
}

/**
 * 从时间变量字符串推断预设类型
 */
function inferTimeRangeType(startTime?: string, endTime?: string): ASRTaskFormData['time_range_type'] {
  if (!startTime || !endTime) return 'today'

  for (const preset of TIME_RANGE_PRESETS) {
    if (preset.start === startTime && preset.end === endTime) {
      return preset.value as ASRTaskFormData['time_range_type']
    }
  }

  // 如果不匹配任何预设，判断是否是动态变量
  if (startTime.includes('{{') || endTime.includes('{{')) {
    // 可能是其他动态变量，默认返回 today
    return 'today'
  }

  return 'custom'
}

/**
 * 获取提供商的中文名称
 */
function getProviderLabel(provider: string): string {
  const option = ASR_PROVIDER_OPTIONS.find(opt => opt.value === provider)
  return option?.label || provider
}

export function ASRTaskForm({ initialValues, onChange }: ASRTaskFormProps) {
  // 查询 ASR 配置列表
  const { data: asrConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ['asr-configs-simple'],
    queryFn: () => asrConfigApi.getSimpleList(),
  })

  // 推断初始时间范围类型
  const initialTimeRangeType = inferTimeRangeType(
    initialValues?.start_time,
    initialValues?.end_time
  )

  // 表单
  const form = useForm<ASRTaskFormData>({
    resolver: zodResolver(asrTaskFormSchema),
    defaultValues: {
      asr_config_id: initialValues?.asr_config_id?.toString() || '',
      time_range_type: initialTimeRangeType,
      custom_start_time: initialTimeRangeType === 'custom' ? initialValues?.start_time : '',
      custom_end_time: initialTimeRangeType === 'custom' ? initialValues?.end_time : '',
      skip_existing: initialValues?.skip_existing ?? true,
      min_duration: initialValues?.min_duration ?? 0,
      batch_size: initialValues?.batch_size ?? 10,
      max_records: initialValues?.max_records ?? 0,
      concurrency: initialValues?.concurrency ?? 5,
    },
  })

  // 监听表单变化，转换为 kwargs 格式
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!values.asr_config_id) return

      // 根据时间范围类型获取实际的时间值
      let startTime: string
      let endTime: string

      if (values.time_range_type === 'custom') {
        startTime = values.custom_start_time || ''
        endTime = values.custom_end_time || ''
      } else {
        const preset = TIME_RANGE_PRESETS.find(p => p.value === values.time_range_type)
        startTime = preset?.start || '{{today_start}}'
        endTime = preset?.end || '{{now}}'
      }

      // 转换为 kwargs 格式
      const kwargs: Record<string, unknown> = {
        asr_config_id: values.asr_config_id || null,
        start_time: startTime,
        end_time: endTime,
        skip_existing: values.skip_existing,
        min_duration: values.min_duration || 0,
        batch_size: values.batch_size || 10,
        max_records: values.max_records || 0,
        concurrency: values.concurrency || 5,
      }

      onChange(kwargs)
    })

    return () => subscription.unsubscribe()
  }, [form, onChange])

  // 触发一次初始值变化
  useEffect(() => {
    const values = form.getValues()
    if (values.asr_config_id) {
      let startTime: string
      let endTime: string

      if (values.time_range_type === 'custom') {
        startTime = values.custom_start_time || ''
        endTime = values.custom_end_time || ''
      } else {
        const preset = TIME_RANGE_PRESETS.find(p => p.value === values.time_range_type)
        startTime = preset?.start || '{{today_start}}'
        endTime = preset?.end || '{{now}}'
      }

      const kwargs: Record<string, unknown> = {
        asr_config_id: values.asr_config_id || null,
        start_time: startTime,
        end_time: endTime,
        skip_existing: values.skip_existing,
        min_duration: values.min_duration || 0,
        batch_size: values.batch_size || 10,
        max_records: values.max_records || 0,
        concurrency: values.concurrency || 5,
      }

      onChange(kwargs)
    }
  }, [])

  const timeRangeType = form.watch('time_range_type')

  return (
    <Form {...form}>
      <div className="space-y-4">
        {/* ASR 配置选择 */}
        <FormField
          control={form.control}
          name="asr_config_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                ASR 配置
              </FormLabel>
              {configsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择 ASR 服务配置" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {asrConfigs?.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        <div className="flex items-center gap-2">
                          <span>{config.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getProviderLabel(config.provider)}
                          </Badge>
                          {config.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              默认
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    {(!asrConfigs || asrConfigs.length === 0) && (
                      <div className="py-2 px-2 text-sm text-muted-foreground">
                        暂无可用的 ASR 配置
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 时间范围选择 */}
        <FormField
          control={form.control}
          name="time_range_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>时间范围</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择时间范围" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIME_RANGE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {timeRangeType !== 'custom' && (
                  <span className="text-xs">
                    将使用动态变量，执行时自动解析为实际日期
                  </span>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 自定义时间范围 */}
        {timeRangeType === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="custom_start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>开始时间</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="custom_end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>结束时间</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* 跳过已转录 */}
        <FormField
          control={form.control}
          name="skip_existing"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>跳过已转录</FormLabel>
                <FormDescription>
                  只处理未转录的通话记录
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 高级选项 */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <span className="text-sm font-medium">高级选项</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {/* 最小通话时长 */}
            <FormField
              control={form.control}
              name="min_duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    最小通话时长（秒）
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          只转录时长大于此值的通话，0 表示不限制
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 批次大小 */}
            <FormField
              control={form.control}
              name="batch_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    批次大小
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          每批处理的记录数量
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 最大处理数量 */}
            <FormField
              control={form.control}
              name="max_records"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    最大处理数量
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          单次任务最多处理的记录数，0 表示不限制
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 并发数 */}
            <FormField
              control={form.control}
              name="concurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    并发数
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          同时进行转录的并发请求数，建议 3-10
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Form>
  )
}
