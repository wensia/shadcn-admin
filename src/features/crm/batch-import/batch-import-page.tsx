/**
 * 批量导入页面
 * Semi Design 重构 — DataTableLayout + SemiDataTable
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Button,
  Input,
  Tag,
  Select,
  Dropdown,
  Checkbox,
  Tooltip,
  Progress,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  IconUpload,
  IconDownload,
  IconDelete,
  IconRefresh,
  IconSearch,
  IconEdit,
  IconEyeOpened,
  IconAlertCircle,
  IconTickCircle,
  IconCrossCircleStroked,
  IconLoading,
  IconSetting,
  IconClose,
  IconMore,
} from '@douyinfe/semi-icons'
import { format } from 'date-fns'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'

import { batchImportApi } from './api'
import {
  batchStatusLabels,
  importMethodLabels,
  type BatchImportItem,
  type BatchImportQueryParams,
  type BatchStatus,
  type ImportMethod,
} from './types'

import { UploadDialog } from './components/upload-dialog'
import { FailuresDialog } from './components/failures-dialog'
import { ActivatedLeadsDialog } from './components/activated-leads-dialog'
import { EditBatchDialog } from './components/edit-batch-dialog'

const { Text } = Typography

// 状态选项
const statusOptions = [
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
]

// 导入方式选项
const methodOptions = [
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
  { value: 'manual', label: '手动' },
  { value: 'api', label: 'API' },
  { value: 'xiaoditui', label: '小地推' },
]

// 列定义
const columnDefs = [
  { id: 'batch_name', label: '批次名称', defaultVisible: false },
  { id: 'import_method', label: '导入方式', defaultVisible: false },
  { id: 'import_source_file', label: '文件名', defaultVisible: false },
  { id: 'total_count', label: '总数量', defaultVisible: true },
  { id: 'success_count', label: '成功数', defaultVisible: true },
  { id: 'activated_count', label: '激活数', defaultVisible: true },
  { id: 'failed_count', label: '失败数', defaultVisible: true },
  { id: 'success_rate', label: '成功率', defaultVisible: true },
  { id: 'status', label: '状态', defaultVisible: true },
  { id: 'created_by_name', label: '创建人', defaultVisible: true },
  { id: 'started_at', label: '开始时间', defaultVisible: true },
  { id: 'processing_duration', label: '耗时', defaultVisible: true },
]

// 默认列可见性
const defaultColumnVisibility = columnDefs.reduce((acc, col) => {
  acc[col.id] = col.defaultVisible
  return acc
}, {} as Record<string, boolean>)

// 格式化处理耗时
function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分`
}

// 状态 Tag 组件
function StatusTag({ status }: { status: BatchStatus }) {
  const colorMap: Record<BatchStatus, 'blue' | 'green' | 'red'> = {
    processing: 'blue',
    completed: 'green',
    failed: 'red',
  }
  const iconMap: Record<BatchStatus, React.ReactNode> = {
    processing: <IconLoading spin style={{ marginRight: 4 }} />,
    completed: <IconTickCircle style={{ marginRight: 4 }} />,
    failed: <IconCrossCircleStroked style={{ marginRight: 4 }} />,
  }
  return (
    <Tag color={colorMap[status]} type="light">
      {iconMap[status]}
      {batchStatusLabels[status]}
    </Tag>
  )
}

// 导入方式 Tag
function MethodTag({ method }: { method: ImportMethod }) {
  return (
    <Tag type="ghost">{importMethodLabels[method]}</Tag>
  )
}

export function BatchImportPage() {
  useDocumentTitle('批量导入')
  const queryClient = useQueryClient()

  // 搜索状态
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<BatchStatus | undefined>(undefined)
  const [methodFilter, setMethodFilter] = useState<ImportMethod | undefined>(undefined)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 })

  // 列可见性状态
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(defaultColumnVisibility)

  // 多选状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 弹窗状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [failuresDialogOpen, setFailuresDialogOpen] = useState(false)
  const [activatedDialogOpen, setActivatedDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<BatchImportItem | null>(null)

  // 构建查询参数
  const queryParams = useMemo<BatchImportQueryParams>(() => ({
    page: pagination.page,
    page_size: pagination.pageSize,
    search: searchValue || undefined,
    status: statusFilter,
    import_method: methodFilter,
  }), [pagination, searchValue, statusFilter, methodFilter])

  // 获取批量导入列表（有处理中的批次时自动轮询）
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['batch-imports', queryParams],
    queryFn: () => batchImportApi.getList(queryParams),
    refetchInterval: (query) => {
      const items = query.state.data?.data?.items || []
      const hasProcessing = items.some((item: BatchImportItem) => item.status === 'processing')
      return hasProcessing ? 5000 : false
    },
  })

  const batchList = useMemo<BatchImportItem[]>(() => data?.data?.items ?? [], [data?.data?.items])
  const totalCount = data?.data?.total || 0

  // 是否有处理中的批次
  const hasProcessingBatches = useMemo(
    () => batchList.some((item) => item.status === 'processing'),
    [batchList]
  )

  // 处理中的批次列表
  const processingBatches = useMemo(
    () => batchList.filter((item) => item.status === 'processing'),
    [batchList]
  )

  // 下载模板
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await batchImportApi.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '线索导入模板.xlsx'
      link.click()
      window.URL.revokeObjectURL(url)
      Toast.success('模板下载成功')
    } catch (error: unknown) {
      showApiErrorToast(error, '下载失败')
    }
  }, [])

  // 删除选中的批次
  const handleDeleteSelectedBatches = useCallback(async () => {
    const idsToDelete = selectedIds.size > 0
      ? Array.from(selectedIds)
      : processingBatches.map((item) => item.id)

    if (idsToDelete.length === 0) {
      Toast.warning('请先选择要删除的批次')
      return
    }

    try {
      await batchImportApi.deleteProcessingBatches(idsToDelete)
      Toast.success(`已删除 ${idsToDelete.length} 个批次`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
    } catch (error: unknown) {
      showApiErrorToast(error, '删除失败')
    }
  }, [selectedIds, processingBatches, queryClient])

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchValue('')
    setStatusFilter(undefined)
    setMethodFilter(undefined)
    setPagination({ page: 1, pageSize: 20 })
  }, [])

  // 查看失败记录
  const handleViewFailures = useCallback((batch: BatchImportItem) => {
    setSelectedBatch(batch)
    setFailuresDialogOpen(true)
  }, [])

  // 查看激活线索
  const handleViewActivated = useCallback((batch: BatchImportItem) => {
    setSelectedBatch(batch)
    setActivatedDialogOpen(true)
  }, [])

  // 编辑批次
  const handleEditBatch = useCallback((batch: BatchImportItem) => {
    setSelectedBatch(batch)
    setEditDialogOpen(true)
  }, [])

  // 上传成功回调
  const handleUploadSuccess = useCallback(() => {
    setUploadDialogOpen(false)
    queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
  }, [queryClient])

  // 分页
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination({ page: 1, pageSize })
  }, [])

  // 是否有筛选条件
  const isFiltered = searchValue || statusFilter || methodFilter

  // 构建表格列
  const columns = useMemo<ColumnProps<BatchImportItem>[]>(() => {
    const cols: ColumnProps<BatchImportItem>[] = []

    if (columnVisibility.batch_name) {
      cols.push({
        title: '批次名称',
        dataIndex: 'batch_name',
        width: 160,
        render: (text: string, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
          return (
            <Tooltip content={<>{text}{record.batch_description && <div style={{ color: 'var(--semi-color-text-2)' }}>{record.batch_description}</div>}</>}>
              <span>
                <Text ellipsis={{ showTooltip: false }} style={{ maxWidth: 150 }}>{text}</Text>
              </span>
            </Tooltip>
          )
        },
      })
    }

    if (columnVisibility.import_method) {
      cols.push({
        title: '导入方式',
        dataIndex: 'import_method',
        width: 120,
        render: (method: ImportMethod, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
          return <MethodTag method={method} />
        },
      })
    }

    if (columnVisibility.import_source_file) {
      cols.push({
        title: '文件名',
        dataIndex: 'import_source_file',
        width: 160,
        render: (text: string, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          return (
            <Tooltip content={text || '-'}>
              <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {text || '-'}
              </span>
            </Tooltip>
          )
        },
      })
    }

    if (columnVisibility.total_count) {
      cols.push({
        title: '总数量',
        dataIndex: 'total_count',
        width: 80,
        align: 'right' as const,
        render: (val: number, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={30} />
          return val
        },
      })
    }

    if (columnVisibility.success_count) {
      cols.push({
        title: '成功数',
        dataIndex: 'success_count',
        width: 80,
        align: 'right' as const,
        render: (val: number, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={30} />
          return <span style={{ color: 'var(--semi-color-success)' }}>{val}</span>
        },
      })
    }

    if (columnVisibility.activated_count) {
      cols.push({
        title: '激活数',
        dataIndex: 'activated_count',
        width: 80,
        align: 'right' as const,
        render: (val: number, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={30} />
          return <span style={{ color: 'var(--semi-color-warning)' }}>{val}</span>
        },
      })
    }

    if (columnVisibility.failed_count) {
      cols.push({
        title: '失败数',
        dataIndex: 'failed_count',
        width: 80,
        align: 'right' as const,
        render: (val: number, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={30} />
          return <span style={{ color: 'var(--semi-color-danger)' }}>{val}</span>
        },
      })
    }

    if (columnVisibility.success_rate) {
      cols.push({
        title: '成功率',
        dataIndex: 'success_rate',
        width: 140,
        render: (_: unknown, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          const rate = record.total_count > 0
            ? Math.round((record.success_count / record.total_count) * 100)
            : 0
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Progress percent={rate} size="small" showInfo={false} style={{ width: 60 }} />
              <span style={{ fontSize: 12 }}>{rate}%</span>
            </div>
          )
        },
      })
    }

    if (columnVisibility.status) {
      cols.push({
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (status: BatchStatus, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
          return <StatusTag status={status} />
        },
      })
    }

    if (columnVisibility.created_by_name) {
      cols.push({
        title: '创建人',
        dataIndex: 'created_by_name',
        width: 100,
        render: (text: string, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
          return text
        },
      })
    }

    if (columnVisibility.started_at) {
      cols.push({
        title: '开始时间',
        dataIndex: 'started_at',
        width: 160,
        render: (text: string, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
          return text ? format(new Date(text), 'yyyy-MM-dd HH:mm') : '-'
        },
      })
    }

    if (columnVisibility.processing_duration) {
      cols.push({
        title: '耗时',
        dataIndex: 'processing_duration',
        width: 100,
        render: (val: number, record: BatchImportItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
          return formatDuration(val)
        },
      })
    }

    // 操作列
    cols.push({
      title: '操作',
      dataIndex: 'actions',
      width: 60,
      fixed: 'right' as const,
      render: (_: unknown, record: BatchImportItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
        return (
          <Dropdown
            trigger="click"
            clickToHide
            position="bottomRight"
            render={
              <Dropdown.Menu>
                <Dropdown.Item
                  icon={<IconAlertCircle style={{ color: record.failed_count > 0 ? 'var(--semi-color-danger)' : undefined }} />}
                  disabled={record.failed_count === 0}
                  onClick={() => handleViewFailures(record)}
                >
                  查看失败记录{record.failed_count > 0 ? ` (${record.failed_count})` : ''}
                </Dropdown.Item>
                <Dropdown.Item
                  icon={<IconEyeOpened style={{ color: record.activated_count > 0 ? 'var(--semi-color-warning)' : undefined }} />}
                  disabled={record.activated_count === 0}
                  onClick={() => handleViewActivated(record)}
                >
                  查看激活线索{record.activated_count > 0 ? ` (${record.activated_count})` : ''}
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item
                  icon={<IconEdit />}
                  onClick={() => handleEditBatch(record)}
                >
                  编辑批次
                </Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <span data-stop-row-click>
              <Button theme="borderless" icon={<IconMore />} />
            </span>
          </Dropdown>
        )
      },
    })

    return cols
  }, [columnVisibility, handleViewFailures, handleViewActivated, handleEditBatch])

  // 行选择配置
  const rowSelection = useMemo(() => ({
    selectedRowKeys: Array.from(selectedIds),
    onChange: (selectedRowKeys: (string | number)[], _rows: BatchImportItem[]) => {
      setSelectedIds(new Set(selectedRowKeys.map(String)))
    },
  }), [selectedIds])

  // 列设置 dropdown menu
  const columnSettingsMenu = (
    <Dropdown.Menu>
      {columnDefs.map((col) => (
        <Dropdown.Item key={col.id} onClick={() => setColumnVisibility(prev => ({ ...prev, [col.id]: !prev[col.id] }))}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox checked={columnVisibility[col.id]} onChange={() => {}} />
            <span>{col.label}</span>
          </div>
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  )

  return (
    <>
      <DataTableLayout
        title="批量导入"
        total={totalCount}
        headerActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button icon={<IconUpload />} theme="solid" onClick={() => setUploadDialogOpen(true)}>
              上传文件
            </Button>
            <Button icon={<IconDownload />} onClick={handleDownloadTemplate}>
              下载模板
            </Button>
            <Button
              type="danger"
              icon={<IconDelete />}
              onClick={handleDeleteSelectedBatches}
              disabled={selectedIds.size === 0 && !hasProcessingBatches}
            >
              {selectedIds.size > 0 ? `删除选中 (${selectedIds.size})` : '删除处理中批次'}
            </Button>
          </div>
        }
        onRefresh={() => refetch()}
        toolbar={
          <>
            {/* 处理中提示条 */}
            {hasProcessingBatches && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: 'var(--semi-color-primary-light-default)',
                border: '1px solid var(--semi-color-primary-light-active)',
                borderRadius: 8,
                marginBottom: 14,
              }}>
                <IconLoading spin style={{ color: 'var(--semi-color-primary)' }} />
                <span style={{ fontSize: 14, color: 'var(--semi-color-primary)' }}>
                  有 {processingBatches.length} 个批次正在处理中，页面将每5秒自动刷新...
                </span>
              </div>
            )}

            {/* 筛选栏 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Input
                  prefix={<IconSearch />}
                  placeholder="搜索批次名称或文件名"
                  value={searchValue}
                  onChange={(val) => {
                    setSearchValue(val)
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  showClear
                  style={{ width: 250 }}
                />
                <Select
                  placeholder="状态"
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val as BatchStatus | undefined)
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  optionList={statusOptions}
                  showClear
                  style={{ width: 120 }}
                />
                <Select
                  placeholder="导入方式"
                  value={methodFilter}
                  onChange={(val) => {
                    setMethodFilter(val as ImportMethod | undefined)
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  optionList={methodOptions}
                  showClear
                  style={{ width: 120 }}
                />
                {isFiltered && (
                  <Button theme="borderless" icon={<IconClose />} onClick={handleReset}>
                    重置
                  </Button>
                )}
              </div>
              <Dropdown trigger="click" render={columnSettingsMenu}>
                <span>
                  <Button icon={<IconSetting />}>列</Button>
                </span>
              </Dropdown>
            </div>
          </>
        }
      >
        <SemiDataTable<BatchImportItem>
          columns={columns}
          data={batchList}
          total={totalCount}
          page={pagination.page}
          pageSize={pagination.pageSize}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          rowSelection={rowSelection}
          emptyText="暂无数据"
        />
      </DataTableLayout>

      {/* 弹窗组件 */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={handleUploadSuccess}
      />
      <FailuresDialog
        open={failuresDialogOpen}
        onOpenChange={setFailuresDialogOpen}
        batch={selectedBatch}
      />
      <ActivatedLeadsDialog
        open={activatedDialogOpen}
        onOpenChange={setActivatedDialogOpen}
        batch={selectedBatch}
      />
      <EditBatchDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        batch={selectedBatch}
        onSuccess={() => {
          setEditDialogOpen(false)
          queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
        }}
      />
    </>
  )
}
