import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  IconDownload,
  IconDelete,
  IconExternalOpen,
  IconRefresh,
  IconSave,
  IconSend,
  IconTickCircle,
} from '@douyinfe/semi-icons'
import {
  Banner,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  Modal,
  Progress,
  Select,
  SideSheet,
  Table,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import { batchImportApi } from '@/features/crm/batch-import/api'
import {
  failureTypeLabels,
  type BatchProgress,
  type FailureType,
  type ImportFailureItem,
} from '@/features/crm/batch-import/types'
import {
  xiaoditangApi,
  type XiaoditangActivityOption,
  type XiaodituiFieldMapping,
  type XiaodituiImportField,
  type XiaodituiImportFailurePreview,
  type XiaodituiImportApplyResult,
  type XiaodituiImportPreviewResult,
  type XiaodituiImportTemplate,
} from './api'

const { Text } = Typography

const failureTypeColorMap: Record<FailureType, 'grey' | 'red' | 'orange'> = {
  duplicate: 'grey',
  duplicate_in_file: 'grey',
  validation_error: 'red',
  system_error: 'red',
  database_error: 'red',
  format_error: 'orange',
  permission_error: 'red',
  other: 'orange',
  unknown: 'orange',
}

const previewFailureTypeLabels: Record<string, string> = {
  duplicate: '重复数据',
  duplicate_in_file: '区间内重复',
  validation_error: '验证错误',
  invalid_phone: '手机号错误',
  system_error: '系统错误',
  database_error: '数据库错误',
  format_error: '格式错误',
  permission_error: '权限错误',
  other: '其他错误',
  unknown: '未知错误',
}

const previewFailureTypeColorMap: Record<string, 'grey' | 'red' | 'orange'> = {
  duplicate: 'grey',
  duplicate_in_file: 'grey',
  validation_error: 'red',
  invalid_phone: 'orange',
  system_error: 'red',
  database_error: 'red',
  format_error: 'orange',
  permission_error: 'red',
  other: 'orange',
  unknown: 'orange',
}

interface SourceChannelOption {
  id: string
  name: string
  extra_fields?: SourceExtraField[]
  channel_config?: {
    fields?: SourceExtraField[]
  }
}

interface SourceExtraField {
  field_name: string
  field_label: string
  field_type?: string
  required?: boolean
}

interface CampusOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  activities: XiaoditangActivityOption[]
  defaultActivityId?: number
  defaultStartDate: string
  defaultEndDate: string
  onSuccess?: () => void
}

interface ImportResultSummary {
  mode: 'sync' | 'async'
  batchId: string
  batchName: string
  status?: string
  totalCount: number
  successCount: number
  createdCount: number
  activatedCount: number
  failedCount: number
  errorMessage?: string | null
}

function toDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function targetValue(mapping?: XiaodituiFieldMapping): string | undefined {
  if (!mapping) return undefined
  return `${mapping.target_type}:${mapping.target_field}`
}

function parseTargetValue(
  value?: string
): Pick<XiaodituiFieldMapping, 'target_type' | 'target_field'> | null {
  if (!value) return null
  const [targetType, targetField] = value.split(':')
  if ((targetType !== 'lead' && targetType !== 'source_extra') || !targetField)
    return null
  return { target_type: targetType, target_field: targetField }
}

function progressPercent(
  preview?: XiaodituiImportPreviewResult,
  progress?: Record<string, unknown>
): number {
  const total = Number(progress?.total_count || preview?.total_count || 0)
  if (!total) return 0
  const success = Number(progress?.success_count || 0)
  const failed = Number(progress?.failed_count || 0)
  return Math.min(100, Math.round(((success + failed) / total) * 100))
}

function countValue(value: unknown): number {
  const count = Number(value || 0)
  return Number.isFinite(count) ? count : 0
}

function resultFromApply(
  data: XiaodituiImportApplyResult
): ImportResultSummary {
  const createdCount = countValue(data.success_count)
  const activatedCount = countValue(data.activated_count)
  return {
    mode: data.mode,
    batchId: data.batch_id,
    batchName: data.batch_name,
    status: data.status,
    totalCount: countValue(data.total_count),
    successCount: createdCount + activatedCount,
    createdCount,
    activatedCount,
    failedCount: countValue(data.failed_count),
  }
}

function resultFromProgress(data: BatchProgress): ImportResultSummary {
  const progress = data.progress || {}
  const createdCount = countValue(progress.created_count ?? data.success_count)
  const activatedCount = countValue(
    progress.activated_count ?? data.activated_count
  )
  return {
    mode: 'async',
    batchId: data.batch_id,
    batchName: data.batch_name,
    status: data.status,
    totalCount: countValue(data.total_count ?? progress.total_count),
    successCount: createdCount + activatedCount,
    createdCount,
    activatedCount,
    failedCount: countValue(data.failed_count ?? progress.failed_count),
    errorMessage: data.error_message,
  }
}

export function XiaodituiImportLeadsDialog({
  open,
  onOpenChange,
  activities,
  defaultActivityId,
  defaultStartDate,
  defaultEndDate,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activityId, setActivityId] = useState<number | undefined>(
    defaultActivityId
  )
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    toDate(defaultStartDate),
    toDate(defaultEndDate),
  ])
  const [sourceChannelId, setSourceChannelId] = useState('')
  const [ownerCampusId, setOwnerCampusId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [mappings, setMappings] = useState<XiaodituiFieldMapping[]>([])
  const [templateName, setTemplateName] = useState('')
  const [saveTemplateOnApply, setSaveTemplateOnApply] = useState(false)
  const [preview, setPreview] = useState<XiaodituiImportPreviewResult | null>(
    null
  )
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [resultSummary, setResultSummary] =
    useState<ImportResultSummary | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [failurePagination, setFailurePagination] = useState({
    page: 1,
    pageSize: 10,
  })

  useEffect(() => {
    if (!open) return
    setActivityId(defaultActivityId)
    setDateRange([toDate(defaultStartDate), toDate(defaultEndDate)])
    setPreview(null)
    setPreviewSheetOpen(false)
    setResultDialogOpen(false)
    setResultSummary(null)
    setBatchId(null)
    setFailurePagination({ page: 1, pageSize: 10 })
  }, [defaultActivityId, defaultEndDate, defaultStartDate, open])

  useEffect(() => {
    if (!open) setPreviewSheetOpen(false)
  }, [open])

  useEffect(() => {
    if (!preview) setPreviewSheetOpen(false)
  }, [preview])

  useEffect(() => {
    setFailurePagination({ page: 1, pageSize: 10 })
  }, [resultSummary?.batchId])

  const startDate = toYMD(dateRange[0])
  const endDate = toYMD(dateRange[1])

  const sourceChannelsQuery = useQuery({
    queryKey: ['source-channels-active-for-xiaoditui-import'],
    queryFn: async () => {
      const res = await apiClient.get<
        ApiResponse<{ items: SourceChannelOption[] }>
      >('/source-channels', { params: { page: 1, size: 100, is_active: true } })
      return res.data?.items || []
    },
    enabled: open,
    staleTime: 5 * 60_000,
  })

  const campusesQuery = useQuery({
    queryKey: ['campuses-simple-for-xiaoditui-import'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CampusOption[]>>(
        '/organization/campuses/simple'
      )
      return res.data || []
    },
    enabled: open,
    staleTime: 5 * 60_000,
  })

  const templatesQuery = useQuery({
    queryKey: ['xiaoditui', 'import-templates'],
    queryFn: () => xiaoditangApi.listImportTemplates(),
    enabled: open,
    staleTime: 30_000,
  })

  const inspectQuery = useQuery({
    queryKey: [
      'xiaoditui',
      'import-inspect',
      activityId,
      startDate,
      endDate,
      sourceChannelId,
    ],
    queryFn: () =>
      xiaoditangApi.inspectImport({
        activityId: activityId!,
        startDate,
        endDate,
        sourceChannelId: sourceChannelId || undefined,
      }),
    enabled: open && !!activityId,
    staleTime: 30_000,
  })

  const selectedChannel = useMemo(
    () => sourceChannelsQuery.data?.find((item) => item.id === sourceChannelId),
    [sourceChannelId, sourceChannelsQuery.data]
  )
  const defaultSourceChannelId = useMemo(() => {
    const channels = sourceChannelsQuery.data || []
    return (
      channels.find((item) => item.name.trim() === '地推')?.id ||
      channels.find((item) => item.name.includes('地推'))?.id ||
      ''
    )
  }, [sourceChannelsQuery.data])
  const selectedActivity = useMemo(
    () => activities.find((item) => item.activity_id === activityId),
    [activities, activityId]
  )
  const autoTemplateName = useMemo(() => {
    const activityName = selectedActivity?.name || `活动 ${activityId || ''}`.trim()
    return `${activityName || '小地推'} · 字段映射`.slice(0, 80)
  }, [activityId, selectedActivity?.name])

  const selectedExtraFields = useMemo<SourceExtraField[]>(() => {
    return (
      selectedChannel?.extra_fields ||
      selectedChannel?.channel_config?.fields ||
      []
    )
  }, [selectedChannel])

  useEffect(() => {
    if (!open || sourceChannelId || selectedTemplateId || !defaultSourceChannelId)
      return
    setSourceChannelId(defaultSourceChannelId)
    setPreview(null)
  }, [defaultSourceChannelId, open, selectedTemplateId, sourceChannelId])

  useEffect(() => {
    if (!inspectQuery.data?.data || mappings.length > 0) return
    setMappings(inspectQuery.data.data.suggested_mappings || [])
  }, [inspectQuery.data, mappings.length])

  const previewMutation = useMutation({
    mutationFn: () => {
      if (!activityId) throw new Error('请选择活动')
      if (!sourceChannelId) throw new Error('请选择 CRM 来源渠道')
      return xiaoditangApi.previewImport({
        activityId,
        startDate,
        endDate,
        sourceChannelId,
        ownerCampusId: ownerCampusId || undefined,
        mappings,
      })
    },
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        Toast.error(res.message || '预览失败')
        return
      }
      setPreview(res.data)
      setPreviewSheetOpen(true)
      Toast.success('预览完成')
    },
    onError: (err: Error) => Toast.error(err.message || '预览失败'),
  })

  const applyMutation = useMutation({
    mutationFn: () => {
      if (!activityId) throw new Error('请选择活动')
      if (!sourceChannelId) throw new Error('请选择 CRM 来源渠道')
      return xiaoditangApi.applyImport({
        activityId,
        startDate,
        endDate,
        sourceChannelId,
        ownerCampusId: ownerCampusId || preview?.owner_campus_id || undefined,
        mappings,
        templateName: saveTemplateOnApply
          ? templateName.trim() || autoTemplateName
          : undefined,
        saveTemplate: saveTemplateOnApply,
        importMode: preview?.recommended_mode || 'async',
        previewValidCount: preview?.valid_count,
      })
    },
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        Toast.error(res.message || '提交失败')
        return
      }
      setPreviewSheetOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['xiaoditui', 'import-templates'],
      })
      queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
      if (res.data.mode === 'sync') {
        setBatchId(null)
        setResultSummary(resultFromApply(res.data))
        setResultDialogOpen(true)
        onOpenChange(false)
        onSuccess?.()
        Toast.success('导入完成')
        return
      }
      setBatchId(res.data.batch_id)
      setResultSummary(null)
      Toast.success('已提交后台导入')
    },
    onError: (err: Error) => Toast.error(err.message || '提交失败'),
  })

  const saveTemplateMutation = useMutation({
    mutationFn: () => {
      if (!templateName.trim()) throw new Error('请输入模板名称')
      return xiaoditangApi.saveImportTemplate({
        id: selectedTemplateId || undefined,
        name: templateName.trim(),
        sourceChannelId: sourceChannelId || undefined,
        ownerCampusId: ownerCampusId || undefined,
        mappings,
      })
    },
    onSuccess: (res) => {
      if (!res.success) {
        Toast.error(res.message || '保存模板失败')
        return
      }
      Toast.success('模板已保存')
      queryClient.invalidateQueries({
        queryKey: ['xiaoditui', 'import-templates'],
      })
    },
    onError: (err: Error) => Toast.error(err.message || '保存模板失败'),
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => xiaoditangApi.deleteImportTemplate(id),
    onSuccess: () => {
      Toast.success('模板已删除')
      setSelectedTemplateId('')
      queryClient.invalidateQueries({
        queryKey: ['xiaoditui', 'import-templates'],
      })
    },
  })

  const progressQuery = useQuery({
    queryKey: ['xiaoditui-import-progress', batchId],
    queryFn: () => batchImportApi.getProgress(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'completed' || status === 'failed' ? false : 2000
    },
  })

  useEffect(() => {
    if (!batchId) return
    const progressData = progressQuery.data?.data
    const status = progressData?.status
    if (status === 'completed' || status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
      if (progressData) {
        setResultSummary(resultFromProgress(progressData))
        setResultDialogOpen(true)
        setPreviewSheetOpen(false)
        setBatchId(null)
        onOpenChange(false)
      }
      onSuccess?.()
    }
  }, [batchId, onOpenChange, onSuccess, progressQuery.data?.data, queryClient])

  const inspect = inspectQuery.data?.data
  const fields = useMemo(() => {
    return [...(inspect?.fields || [])].sort((a, b) => {
      if (Boolean(a.is_custom) !== Boolean(b.is_custom))
        return a.is_custom ? -1 : 1
      return (
        a.label.localeCompare(b.label, 'zh-CN') ||
        a.field.localeCompare(b.field)
      )
    })
  }, [inspect?.fields])
  const mappingBySource = useMemo(
    () => new Map(mappings.map((mapping) => [mapping.source_field, mapping])),
    [mappings]
  )

  const targetOptions = useMemo(() => {
    const leadTargets = inspect?.lead_targets || [
      { field: 'parent_phone', label: '家长电话' },
      { field: 'parent_wechat', label: '家长微信' },
      { field: 'parent_name', label: '家长姓名' },
      { field: 'child_name', label: '学生姓名' },
      { field: 'grade', label: '年级' },
      { field: 'school_name', label: '学校' },
      { field: 'address_detail', label: '详细地址' },
      { field: 'notes', label: '备注' },
    ]
    return [
      ...leadTargets.map((item) => ({
        label: `线索字段 · ${item.label}`,
        value: `lead:${item.field}`,
      })),
      ...selectedExtraFields.map((item) => ({
        label: `来源额外字段 · ${item.field_label || item.field_name}${item.required ? ' *' : ''}`,
        value: `source_extra:${item.field_name}`,
      })),
    ]
  }, [inspect?.lead_targets, selectedExtraFields])

  const columns = useMemo<ColumnProps<XiaodituiImportField>[]>(
    () => [
      {
        title: '小地推字段',
        dataIndex: 'label',
        width: 180,
        render: (_value: string, record) => (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong>{record.label}</Text>
              {record.is_custom ? (
                <Tag color='blue' size='small'>
                  自定义
                </Tag>
              ) : null}
            </div>
            <div>
              <Text type='tertiary' size='small' code>
                {record.field}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: '样本值',
        dataIndex: 'samples',
        render: (samples: string[]) => (
          <Text type='tertiary' ellipsis={{ showTooltip: true }}>
            {samples?.join(' / ') || '-'}
          </Text>
        ),
      },
      {
        title: '映射到 CRM',
        dataIndex: 'field',
        width: 280,
        render: (_field: string, record) => {
          const current = mappingBySource.get(record.field)
          return (
            <Select
              placeholder='不导入'
              value={targetValue(current)}
              optionList={targetOptions}
              style={{ width: '100%' }}
              filter
              showClear
              onChange={(value) => {
                const parsed = parseTargetValue(value as string | undefined)
                setPreview(null)
                setMappings((prev) => {
                  const rest = prev.filter(
                    (item) => item.source_field !== record.field
                  )
                  if (!parsed) return rest
                  return [
                    ...rest,
                    {
                      source_field: record.field,
                      target_type: parsed.target_type,
                      target_field: parsed.target_field,
                    },
                  ]
                })
              }}
            />
          )
        },
      },
    ],
    [mappingBySource, targetOptions]
  )

  const templates = templatesQuery.data?.data || []
  const progress = progressQuery.data?.data
  const progressExtra = progress?.progress || {}
  const progressCreated = countValue(
    progressExtra.created_count ?? progress?.success_count
  )
  const progressActivated = countValue(
    progressExtra.activated_count ?? progress?.activated_count
  )
  const progressSuccess = countValue(
    progressExtra.success_count ?? progressCreated + progressActivated
  )
  const progressSnapshot = {
    ...progressExtra,
    total_count: progress?.total_count ?? progressExtra.total_count,
    success_count: progressSuccess,
    failed_count: progress?.failed_count ?? progressExtra.failed_count,
  }
  const percent = progressPercent(preview || undefined, progressSnapshot)
  const importFinished =
    progress?.status === 'completed' || progress?.status === 'failed'
  const progressMessage = String(
    progressExtra.message ||
      progress?.error_message ||
      (importFinished ? '导入已完成' : '正在处理')
  )
  const resultBatchId = resultSummary?.batchId
  const resultFailed = resultSummary?.failedCount || 0

  const failuresQuery = useQuery({
    queryKey: [
      'xiaoditui-import-result-failures',
      resultBatchId,
      failurePagination.page,
      failurePagination.pageSize,
    ],
    queryFn: () =>
      batchImportApi.getFailureList(resultBatchId!, {
        page: failurePagination.page,
        page_size: failurePagination.pageSize,
      }),
    enabled: resultDialogOpen && !!resultBatchId && resultFailed > 0,
  })

  const failureList = failuresQuery.data?.data?.items || []
  const failureTotal = countValue(
    failuresQuery.data?.data?.total ?? resultFailed
  )
  const failurePages = Math.max(
    1,
    countValue(failuresQuery.data?.data?.pages) ||
      Math.ceil(failureTotal / failurePagination.pageSize)
  )
  const failureTypeCounts = failuresQuery.data?.data?.type_counts || {}

  const failureColumns = useMemo<ColumnProps<ImportFailureItem>[]>(
    () => [
      { title: '行号', dataIndex: 'row_number', width: 70 },
      {
        title: '孩子姓名',
        dataIndex: 'child_name',
        width: 100,
        render: (value: string) => value || '-',
      },
      {
        title: '家长电话',
        dataIndex: 'parent_phone',
        width: 130,
        render: (value: string) => value || '-',
      },
      {
        title: '失败类型',
        dataIndex: 'failure_type',
        width: 120,
        render: (type: FailureType) => (
          <Tag color={failureTypeColorMap[type] || 'grey'} type='light'>
            {failureTypeLabels[type] || type}
          </Tag>
        ),
      },
      {
        title: '失败原因',
        dataIndex: 'failure_reason',
        render: (text: string, record) => (
          <Text type='tertiary' size='small'>
            {text || '-'}
            {record.failure_type === 'duplicate_in_file' &&
            record.duplicate_count_in_batch ? (
              <span style={{ marginLeft: 8 }}>
                文件内重复 {record.duplicate_count_in_batch} 次
              </span>
            ) : null}
          </Text>
        ),
      },
    ],
    []
  )

  const previewFailures = preview?.failures || []
  const previewRecommendedMode = preview?.recommended_mode || 'async'
  const applyButtonText =
    previewRecommendedMode === 'sync' ? '开始导入' : '开始后台导入'
  const previewFailureTotal = countValue(
    preview?.failed_count ?? previewFailures.length
  )
  const previewFailureTypeCounts = useMemo(() => {
    return previewFailures.reduce<Record<string, number>>((acc, item) => {
      const type = item.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
  }, [previewFailures])

  const previewFailureColumns = useMemo<
    ColumnProps<XiaodituiImportFailurePreview>[]
  >(
    () => [
      { title: '行号', dataIndex: 'row_number', width: 70 },
      {
        title: '手机号',
        dataIndex: 'phone',
        width: 130,
        render: (value: string, record) =>
          value || record?.sample?.mobile || '-',
      },
      {
        title: '异常类型',
        dataIndex: 'type',
        width: 120,
        render: (type: string) => (
          <Tag color={previewFailureTypeColorMap[type] || 'grey'} type='light'>
            {previewFailureTypeLabels[type] || type || '未知错误'}
          </Tag>
        ),
      },
      {
        title: '异常原因',
        dataIndex: 'reason',
        render: (reason: string) => (
          <Text type='tertiary' size='small'>
            {reason || '-'}
          </Text>
        ),
      },
      {
        title: '样本值',
        dataIndex: 'sample',
        width: 180,
        render: (_value: unknown, record) => {
          const sample = record?.sample
          const values = [
            sample?.nickname,
            sample?.mobile,
            sample?.created_at,
          ].filter(Boolean)
          return (
            <Text type='tertiary' size='small' ellipsis={{ showTooltip: true }}>
              {values.join(' / ') || '-'}
            </Text>
          )
        },
      },
    ],
    []
  )

  const downloadFailuresMutation = useMutation({
    mutationFn: () => {
      if (!resultBatchId) throw new Error('批次不存在')
      return batchImportApi.downloadFailures(resultBatchId)
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `小地推导入失败记录_${resultBatchId}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      Toast.success('下载成功')
    },
    onError: (err: Error) => Toast.error(err.message || '下载失败'),
  })

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    setTemplateName(template.name)
    setSourceChannelId(template.source_channel_id || '')
    setOwnerCampusId(template.owner_campus_id || '')
    setMappings(template.mappings || [])
    setPreview(null)
  }

  const footer = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <Button onClick={() => onOpenChange(false)}>关闭</Button>
      <div style={{ display: 'flex', gap: 8 }}>
        {!batchId && (
          <>
            <Button
              theme='light'
              icon={<IconRefresh />}
              loading={inspectQuery.isFetching}
              onClick={() => inspectQuery.refetch()}
              disabled={!activityId}
            >
              重新读取字段
            </Button>
            <Button
              theme='light'
              icon={<IconSave />}
              loading={saveTemplateMutation.isPending}
              onClick={() => saveTemplateMutation.mutate()}
              disabled={mappings.length === 0}
            >
              保存模板
            </Button>
            <Button
              theme='solid'
              type='primary'
              loading={previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              预览导入
            </Button>
            {preview ? (
              <Button theme='light' onClick={() => setPreviewSheetOpen(true)}>
                查看预览结果
              </Button>
            ) : null}
            <Button
              theme='solid'
              type='primary'
              icon={<IconSend />}
              loading={applyMutation.isPending}
              disabled={!preview || preview.valid_count <= 0}
              onClick={() => applyMutation.mutate()}
            >
              {applyButtonText}
            </Button>
          </>
        )}
        {batchId && (
          <Button
            theme='solid'
            type='primary'
            icon={<IconTickCircle />}
            disabled={!importFinished}
            onClick={() => onOpenChange(false)}
          >
            完成
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Modal
        title='小地推录入 CRM'
        visible={open}
        width={1080}
        footer={footer}
        onCancel={() => onOpenChange(false)}
        closeOnEsc={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={controlGridStyle}>
            <Field label='活动'>
              <Select
                value={activityId}
                optionList={activities.map((item) => ({
                  label: item.name,
                  value: item.activity_id,
                }))}
                placeholder='选择小地推活动'
                style={{ width: '100%' }}
                filter
                onChange={(value) => {
                  setActivityId(value as number)
                  setPreview(null)
                }}
              />
            </Field>
            <Field label='日期区间'>
              <DatePicker
                type='dateRange'
                value={dateRange}
                density='compact'
                format='yyyy-MM-dd'
                showClear={false}
                style={{ width: '100%' }}
                onChange={(value) => {
                  if (Array.isArray(value) && value.length === 2) {
                    const [start, end] = value as [Date, Date]
                    if (start && end) {
                      setDateRange([start, end])
                      setPreview(null)
                    }
                  }
                }}
              />
            </Field>
            <Field label='CRM 来源渠道'>
              <Select
                value={sourceChannelId}
                optionList={(sourceChannelsQuery.data || []).map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                placeholder='选择来源渠道'
                style={{ width: '100%' }}
                filter
                loading={sourceChannelsQuery.isPending}
                onChange={(value) => {
                  setSourceChannelId((value as string) || '')
                  setPreview(null)
                }}
              />
            </Field>
            <Field label='归属校区'>
              <Select
                value={ownerCampusId}
                optionList={(campusesQuery.data || []).map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                placeholder='多个校区身份时必选'
                style={{ width: '100%' }}
                filter
                showClear
                loading={campusesQuery.isPending}
                onChange={(value) => {
                  setOwnerCampusId((value as string) || '')
                  setPreview(null)
                }}
              />
            </Field>
          </div>

          <div style={templateRowStyle}>
            <Field label='字段映射模板' compact>
              <Select
                value={selectedTemplateId}
                optionList={templates.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                placeholder='选择个人模板'
                style={{ width: 240 }}
                showClear
                onChange={(value) => applyTemplate((value as string) || '')}
              />
            </Field>
            <Input
              value={templateName}
              placeholder='模板名称（留空自动生成）'
              style={{ width: 220 }}
              onChange={setTemplateName}
            />
            <Checkbox
              checked={saveTemplateOnApply}
              onChange={(event) =>
                setSaveTemplateOnApply(!!event.target.checked)
              }
            >
              导入时保存模板
            </Checkbox>
            {selectedTemplateId && (
              <Button
                theme='borderless'
                type='danger'
                icon={<IconDelete />}
                loading={deleteTemplateMutation.isPending}
                onClick={() =>
                  deleteTemplateMutation.mutate(selectedTemplateId)
                }
              >
                删除模板
              </Button>
            )}
          </div>

          {inspect?.truncated && (
            <Banner
              fullMode={false}
              type='warning'
              description='当前区间已达到小地推接口扫描上限，建议缩小日期范围后再导入。'
            />
          )}

          <SummaryStrip
            inspectCount={inspect?.row_count}
            preview={preview}
            batchId={batchId}
            progress={progressSnapshot}
          />

          {batchId ? (
            <div style={progressPanelStyle}>
              <Text strong>后台导入进度</Text>
              <Progress percent={percent} showInfo />
              <Text type='tertiary' size='small'>
                {progressMessage} · 批次 {batchId}
              </Text>
            </div>
          ) : fields.length > 0 ? (
            <Table<XiaodituiImportField>
              columns={columns}
              dataSource={fields}
              rowKey='field'
              size='small'
              pagination={false}
              scroll={{ y: 360 }}
            />
          ) : (
            <Empty
              title={
                inspectQuery.isFetching ? '正在读取字段' : '暂无可映射字段'
              }
              description='请选择活动和日期区间'
            />
          )}
        </div>
      </Modal>

      <SideSheet
        title='预览结果'
        visible={previewSheetOpen}
        width={760}
        zIndex={1100}
        onCancel={() => setPreviewSheetOpen(false)}
        bodyStyle={previewSheetBodyStyle}
        footer={
          <div style={previewSheetFooterStyle}>
            <Button onClick={() => setPreviewSheetOpen(false)}>关闭</Button>
            <Button
              theme='solid'
              type='primary'
              icon={<IconSend />}
              loading={applyMutation.isPending}
              disabled={!preview || preview.valid_count <= 0}
              onClick={() => applyMutation.mutate()}
            >
              继续导入有效数据
            </Button>
          </div>
        }
      >
        {preview ? (
          <div style={previewSheetContentStyle}>
            <div style={previewStatsStyle}>
              <ResultStat label='总数' value={preview.total_count} />
              <ResultStat label='有效' value={preview.valid_count} />
              <ResultStat label='可新建' value={preview.create_count} />
              <ResultStat label='可激活' value={preview.activate_count} />
              <ResultStat label='异常' value={preview.failed_count} danger />
            </div>

            {preview.valid_count <= 0 ? (
              <Banner
                fullMode={false}
                type='warning'
                description='当前预览没有可导入线索，需要调整映射、日期区间或来源渠道后重新预览。'
              />
            ) : null}

            {previewFailureTotal > previewFailures.length ? (
              <Banner
                fullMode={false}
                type='info'
                description={`当前仅展示前 ${previewFailures.length} 条异常，完整失败结果会在后台导入完成后生成。`}
              />
            ) : null}

            {Object.keys(previewFailureTypeCounts).length > 0 ? (
              <div style={failureTypeSummaryStyle}>
                {Object.entries(previewFailureTypeCounts).map(
                  ([type, count]) => (
                    <Tag
                      key={type}
                      color={previewFailureTypeColorMap[type] || 'grey'}
                      type='light'
                    >
                      {previewFailureTypeLabels[type] || type}
                      <span style={{ fontWeight: 700, marginLeft: 4 }}>
                        {count}
                      </span>
                    </Tag>
                  )
                )}
              </div>
            ) : null}

            {previewFailures.length > 0 ? (
              <Table<XiaodituiImportFailurePreview>
                columns={previewFailureColumns}
                dataSource={previewFailures}
                rowKey={(record) =>
                  `${record?.row_number || 'row'}-${record?.type || 'type'}-${record?.phone || record?.reason || ''}`
                }
                size='small'
                pagination={false}
                scroll={{ y: 420 }}
              />
            ) : (
              <Empty title='预览无异常' description='可以继续提交后台导入' />
            )}
          </div>
        ) : (
          <Empty title='暂无预览结果' description='请先执行预览导入' />
        )}
      </SideSheet>

      <Modal
        title='导入结果'
        visible={resultDialogOpen}
        width={960}
        zIndex={1200}
        onCancel={() => setResultDialogOpen(false)}
        footer={
          <div style={resultDialogFooterStyle}>
            <Button onClick={() => setResultDialogOpen(false)}>关闭</Button>
            <Button
              theme='light'
              icon={<IconExternalOpen />}
              onClick={() => {
                setResultDialogOpen(false)
                navigate({ to: '/crm/batch-import' })
              }}
            >
              查看批次列表
            </Button>
            {resultFailed > 0 ? (
              <Button
                theme='light'
                icon={<IconDownload />}
                loading={downloadFailuresMutation.isPending}
                onClick={() => downloadFailuresMutation.mutate()}
              >
                下载失败记录
              </Button>
            ) : null}
          </div>
        }
      >
        {resultSummary ? (
          <div style={resultDialogContentStyle}>
            <div style={resultStatsStyle}>
              <ResultStat label='总数' value={resultSummary.totalCount} />
              <ResultStat label='成功' value={resultSummary.successCount} />
              <ResultStat label='新建' value={resultSummary.createdCount} />
              <ResultStat label='激活' value={resultSummary.activatedCount} />
              <ResultStat
                label='失败'
                value={resultSummary.failedCount}
                danger
              />
            </div>

            {resultSummary.errorMessage ? (
              <Banner
                fullMode={false}
                type='danger'
                description={resultSummary.errorMessage}
              />
            ) : null}

            <div style={resultDialogMetaStyle}>
              <Text type='tertiary' size='small'>
                批次 {resultSummary.batchId}
              </Text>
              <Tag
                size='small'
                color={resultSummary.mode === 'sync' ? 'green' : 'blue'}
                type='light'
              >
                {resultSummary.mode === 'sync' ? '同步导入' : '后台导入'}
              </Tag>
            </div>

            {resultSummary.failedCount > 0 ? (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {Object.keys(failureTypeCounts).length > 0 ? (
                  <div style={failureTypeSummaryStyle}>
                    {Object.entries(failureTypeCounts).map(([type, count]) => (
                      <Tag
                        key={type}
                        color={
                          failureTypeColorMap[type as FailureType] || 'grey'
                        }
                        type='light'
                      >
                        {failureTypeLabels[type as FailureType] || type}
                        <span style={{ fontWeight: 700, marginLeft: 4 }}>
                          {count}
                        </span>
                      </Tag>
                    ))}
                  </div>
                ) : null}

                <Table<ImportFailureItem>
                  columns={failureColumns}
                  dataSource={failureList}
                  rowKey='id'
                  size='small'
                  pagination={false}
                  loading={failuresQuery.isFetching}
                  scroll={{ y: 320 }}
                  empty={
                    <div style={emptyTableStyle}>
                      暂无失败明细，稍后可在批次列表中再次查看
                    </div>
                  }
                />

                <div style={failurePaginationStyle}>
                  <Text type='tertiary' size='small'>
                    共 {failureTotal.toLocaleString()} 条失败记录
                  </Text>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Select
                      value={failurePagination.pageSize}
                      optionList={[10, 20, 50, 100].map((size) => ({
                        value: size,
                        label: String(size),
                      }))}
                      style={{ width: 80 }}
                      onChange={(value) =>
                        setFailurePagination({
                          page: 1,
                          pageSize: Number(value),
                        })
                      }
                    />
                    <Button
                      disabled={failurePagination.page <= 1}
                      onClick={() =>
                        setFailurePagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                    >
                      上一页
                    </Button>
                    <Text type='tertiary' size='small'>
                      第 {failurePagination.page} 页 / 共 {failurePages} 页
                    </Text>
                    <Button
                      disabled={failurePagination.page >= failurePages}
                      onClick={() =>
                        setFailurePagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Empty
                title='没有失败记录'
                description='本次导入已完成，未产生失败明细'
              />
            )}
          </div>
        ) : (
          <Empty title='暂无导入结果' description='请先提交导入' />
        )}
      </Modal>
    </>
  )
}

function Field({
  label,
  children,
  compact = false,
}: {
  label: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <label style={compact ? compactFieldStyle : fieldStyle}>
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      {children}
    </label>
  )
}

function SummaryStrip({
  inspectCount,
  preview,
  batchId,
  progress,
}: {
  inspectCount?: number
  preview: XiaodituiImportPreviewResult | null
  batchId: string | null
  progress?: Record<string, unknown>
}) {
  const items = [
    { label: '区间名单', value: inspectCount ?? '-' },
    { label: '可新建', value: preview?.create_count ?? '-' },
    { label: '可激活', value: preview?.activate_count ?? '-' },
    { label: '异常', value: preview?.failed_count ?? '-' },
  ]
  if (batchId) {
    items.push(
      { label: '已成功', value: Number(progress?.success_count || 0) },
      { label: '已失败', value: Number(progress?.failed_count || 0) }
    )
  }
  return (
    <div style={summaryStripStyle}>
      {items.map((item) => (
        <div key={item.label} style={summaryItemStyle}>
          <Text type='tertiary' size='small'>
            {item.label}
          </Text>
          <Text strong>
            {typeof item.value === 'number'
              ? item.value.toLocaleString()
              : item.value}
          </Text>
        </div>
      ))}
      {preview && preview.valid_count <= 0 && (
        <Tag color='red' size='small'>
          没有可导入线索
        </Tag>
      )}
    </div>
  )
}

function ResultStat({
  label,
  value,
  danger = false,
}: {
  label: string
  value: number
  danger?: boolean
}) {
  return (
    <div style={resultStatStyle}>
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      <Text strong type={danger && value > 0 ? 'danger' : undefined}>
        {value.toLocaleString()}
      </Text>
    </div>
  )
}

const controlGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'minmax(220px, 1fr) minmax(340px, 1.35fr) repeat(2, minmax(180px, 0.85fr))',
  gap: 12,
  alignItems: 'end',
}

const fieldStyle: CSSProperties = {
  display: 'flex',
  minWidth: 0,
  flexDirection: 'column',
  gap: 6,
}

const compactFieldStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const templateRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  border: '1px solid var(--semi-color-border)',
  borderRadius: 6,
  background: 'var(--semi-color-fill-0)',
}

const summaryStripStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 12px',
  border: '1px solid var(--semi-color-border)',
  borderRadius: 6,
}

const summaryItemStyle: CSSProperties = {
  display: 'flex',
  minWidth: 96,
  flexDirection: 'column',
  gap: 2,
}

const progressPanelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 16,
  border: '1px solid var(--semi-color-border)',
  borderRadius: 6,
}

const resultStatsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 10,
}

const resultStatStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '10px 12px',
  border: '1px solid var(--semi-color-border)',
  borderRadius: 6,
  background: 'var(--semi-color-fill-0)',
}

const failureTypeSummaryStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
}

const failurePaginationStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  paddingTop: 4,
}

const emptyTableStyle: CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: 'var(--semi-color-text-2)',
}

const previewSheetBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 16,
}

const previewSheetContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const previewStatsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 10,
}

const previewSheetFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
}

const resultDialogContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const resultDialogMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

const resultDialogFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
}
