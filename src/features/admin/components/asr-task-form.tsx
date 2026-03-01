/**
 * ASR 任务专用参数表单组件
 *
 * 用于配置 ASR 语音转录定时任务的参数
 */

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Info, ChevronDown, ChevronRight, Mic } from 'lucide-react'

import { Button, Select, Switch, Tag, Tooltip, Typography } from '@douyinfe/semi-ui-19'
import { Input as SemiInput, InputNumber } from '@douyinfe/semi-ui-19'
import { asrConfigApi } from '../api'
import { TIME_RANGE_PRESETS, ASR_PROVIDER_OPTIONS } from '../types'

const { Text } = Typography

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
function inferTimeRangeType(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return 'today'

  for (const preset of TIME_RANGE_PRESETS) {
    if (preset.start === startTime && preset.end === endTime) {
      return preset.value
    }
  }

  // 如果不匹配任何预设，判断是否是动态变量
  if (startTime.includes('{{') || endTime.includes('{{')) {
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

  // 表单状态
  const [asrConfigId, setAsrConfigId] = useState<string>(initialValues?.asr_config_id?.toString() || '')
  const [timeRangeType, setTimeRangeType] = useState<string>(initialTimeRangeType)
  const [customStartTime, setCustomStartTime] = useState<string>(initialTimeRangeType === 'custom' ? (initialValues?.start_time || '') : '')
  const [customEndTime, setCustomEndTime] = useState<string>(initialTimeRangeType === 'custom' ? (initialValues?.end_time || '') : '')
  const [skipExisting, setSkipExisting] = useState<boolean>(initialValues?.skip_existing ?? true)
  const [minDuration, setMinDuration] = useState<number>(initialValues?.min_duration ?? 0)
  const [batchSize, setBatchSize] = useState<number>(initialValues?.batch_size ?? 10)
  const [maxRecords, setMaxRecords] = useState<number>(initialValues?.max_records ?? 0)
  const [concurrency, setConcurrency] = useState<number>(initialValues?.concurrency ?? 5)

  // 高级选项展开状态
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // 构建 kwargs 并通知外部
  const buildAndNotify = useCallback(() => {
    if (!asrConfigId) return

    let startTime: string
    let endTime: string

    if (timeRangeType === 'custom') {
      startTime = customStartTime
      endTime = customEndTime
    } else {
      const preset = TIME_RANGE_PRESETS.find(p => p.value === timeRangeType)
      startTime = preset?.start || '{{today_start}}'
      endTime = preset?.end || '{{now}}'
    }

    const kwargs: Record<string, unknown> = {
      asr_config_id: asrConfigId || null,
      start_time: startTime,
      end_time: endTime,
      skip_existing: skipExisting,
      min_duration: minDuration,
      batch_size: batchSize,
      max_records: maxRecords,
      concurrency: concurrency,
    }

    onChange(kwargs)
  }, [asrConfigId, timeRangeType, customStartTime, customEndTime, skipExisting, minDuration, batchSize, maxRecords, concurrency, onChange])

  // 监听表单变化
  useEffect(() => {
    buildAndNotify()
  }, [buildAndNotify])

  // 时间范围预设选项
  const timeRangeOptions = TIME_RANGE_PRESETS.map((preset) => ({
    value: preset.value,
    label: preset.label,
  }))

  // ASR 配置下拉选项
  const asrConfigOptions = (asrConfigs || []).map((config) => ({
    value: config.id,
    label: config.name,
    provider: config.provider,
    is_default: config.is_default,
  }))

  return (
    <div className="space-y-4">
      {/* ASR 配置选择 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Mic className="h-4 w-4" />
          ASR 配置
        </label>
        {configsLoading ? (
          <div className="h-8 w-full bg-[var(--semi-color-fill-0)] rounded animate-pulse" />
        ) : (
          <Select
            value={asrConfigId}
            onChange={(value) => setAsrConfigId(value as string)}
            placeholder="选择 ASR 服务配置"
            style={{ width: '100%' }}
            optionList={asrConfigOptions}
            renderOptionItem={(renderProps) => {
              const { label, value: optValue, ...rest } = renderProps
              const config = asrConfigOptions.find(c => c.value === optValue)
              return (
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--semi-color-fill-0)]"
                  onClick={() => rest.onClick?.()}
                  style={rest.focused ? { backgroundColor: 'var(--semi-color-fill-0)' } : undefined}
                >
                  <span>{label}</span>
                  {config && (
                    <Tag size="small" color="blue" type="light">
                      {getProviderLabel(config.provider)}
                    </Tag>
                  )}
                  {config?.is_default && (
                    <Tag size="small" color="grey" type="light">
                      默认
                    </Tag>
                  )}
                </div>
              )
            }}
            emptyContent={
              <div className="py-2 px-2 text-sm" style={{ color: 'var(--semi-color-text-2)' }}>
                暂无可用的 ASR 配置
              </div>
            }
          />
        )}
      </div>

      {/* 时间范围选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">时间范围</label>
        <Select
          value={timeRangeType}
          onChange={(value) => setTimeRangeType(value as string)}
          placeholder="选择时间范围"
          style={{ width: '100%' }}
          optionList={timeRangeOptions}
        />
        {timeRangeType !== 'custom' && (
          <Text type="tertiary" size="small">
            将使用动态变量，执行时自动解析为实际日期
          </Text>
        )}
      </div>

      {/* 自定义时间范围 */}
      {timeRangeType === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">开始时间</label>
            <SemiInput
              type="datetime-local"
              value={customStartTime}
              onChange={(value) => setCustomStartTime(value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">结束时间</label>
            <SemiInput
              type="datetime-local"
              value={customEndTime}
              onChange={(value) => setCustomEndTime(value)}
            />
          </div>
        </div>
      )}

      {/* 跳过已转录 */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">跳过已转录</div>
          <Text type="tertiary" size="small">
            只处理未转录的通话记录
          </Text>
        </div>
        <Switch
          checked={skipExisting}
          onChange={(checked) => setSkipExisting(checked)}
        />
      </div>

      {/* 高级选项 */}
      <div>
        <Button
          theme="borderless"
          type="tertiary"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          style={{ padding: 0, height: 'auto' }}
          icon={advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          iconPosition="right"
        >
          <span className="text-sm font-medium">高级选项</span>
        </Button>

        {advancedOpen && (
          <div className="space-y-3 mt-3">
            {/* 最小通话时长 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                最小通话时长（秒）
                <Tooltip content="只转录时长大于此值的通话，0 表示不限制">
                  <Info className="h-3 w-3" style={{ color: 'var(--semi-color-text-2)' }} />
                </Tooltip>
              </label>
              <InputNumber
                min={0}
                value={minDuration}
                onChange={(value) => setMinDuration((value as number) || 0)}
                style={{ width: '100%' }}
              />
            </div>

            {/* 批次大小 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                批次大小
                <Tooltip content="每批处理的记录数量">
                  <Info className="h-3 w-3" style={{ color: 'var(--semi-color-text-2)' }} />
                </Tooltip>
              </label>
              <InputNumber
                min={1}
                max={100}
                value={batchSize}
                onChange={(value) => setBatchSize((value as number) || 10)}
                style={{ width: '100%' }}
              />
            </div>

            {/* 最大处理数量 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                最大处理数量
                <Tooltip content="单次任务最多处理的记录数，0 表示不限制">
                  <Info className="h-3 w-3" style={{ color: 'var(--semi-color-text-2)' }} />
                </Tooltip>
              </label>
              <InputNumber
                min={0}
                value={maxRecords}
                onChange={(value) => setMaxRecords((value as number) || 0)}
                style={{ width: '100%' }}
              />
            </div>

            {/* 并发数 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                并发数
                <Tooltip content="同时进行转录的并发请求数，建议 3-10">
                  <Info className="h-3 w-3" style={{ color: 'var(--semi-color-text-2)' }} />
                </Tooltip>
              </label>
              <InputNumber
                min={1}
                max={20}
                value={concurrency}
                onChange={(value) => setConcurrency((value as number) || 5)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
