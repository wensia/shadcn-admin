import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  SideSheet,
  Tag,
  TabPane,
  Tabs,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui-19'
import {
  IconDelete,
  IconEdit,
  IconExport,
  IconMore,
  IconPlus,
  IconSearch,
} from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import { SemiSkeletonCell, isSkeletonRow } from '@/lib/table-utils'
import { toast } from '@/lib/toast'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { educationApi } from './api'
import type {
  EducationFieldConfig,
  EducationFieldValue,
  EducationListParams,
  EducationPageConfig,
  EducationPayload,
  EducationRecord,
} from './types'

const { Text } = Typography

interface EducationListPageProps {
  config: EducationPageConfig
}

type DialogMode = 'create' | 'edit'

const formatDate = (value?: EducationFieldValue, withTime = false) => {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return withTime ? date.toLocaleString('zh-CN') : date.toLocaleDateString('zh-CN')
}

const formatMoney = (value?: EducationFieldValue) => {
  const amount = Number(value ?? 0)
  if (Number.isNaN(amount)) return '-'
  return amount.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  })
}

const getRecordText = (record: EducationRecord, key: string) => {
  const value = record[key]
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const buildInitialPayload = (fields: EducationFieldConfig[], record?: EducationRecord | null): EducationPayload => {
  return fields.reduce<EducationPayload>((payload, field) => {
    if (field.hiddenInForm) return payload
    payload[field.key] = record?.[field.key] ?? ''
    return payload
  }, {})
}

const createSkeletonFactory = (fields: EducationFieldConfig[]) => () => {
  return fields.reduce<Omit<EducationRecord, 'id'>>((row, field) => {
    row[field.key] = ''
    return row
  }, {})
}

export function EducationListPage({ config }: EducationListPageProps) {
  useDocumentTitle(config.documentTitle)
  const allowCreate = config.allowCreate ?? true
  const allowEdit = config.allowEdit ?? true
  const allowDelete = config.allowDelete ?? false

  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[Date, Date] | undefined>()
  const [selectedRows, setSelectedRows] = useState<EducationRecord[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [editingRecord, setEditingRecord] = useState<EducationRecord | null>(null)
  const [formValues, setFormValues] = useState<EducationPayload>(() => buildInitialPayload(config.fields))

  const params = useMemo<EducationListParams>(
    () => ({
      page,
      size: pageSize,
      ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      ...(status ? { status } : {}),
      ...(dateRange
        ? {
            date_from: dateRange[0].toISOString(),
            date_to: dateRange[1].toISOString(),
          }
        : {}),
    }),
    [dateRange, keyword, page, pageSize, status],
  )

  const queryKey = useMemo(() => ['education', config.domain, params], [config.domain, params])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await educationApi.list(config.domain, params)
      return response.data
    },
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['education', config.domain] })
  }, [config.domain, queryClient])

  const saveMutation = useMutation({
    mutationFn: async (payload: EducationPayload) => {
      if (dialogMode === 'edit' && editingRecord) {
        return educationApi.update(config.domain, editingRecord.id, payload)
      }
      return educationApi.create(config.domain, payload)
    },
    onSuccess: () => {
      toast.success(dialogMode === 'edit' ? '更新成功' : '创建成功')
      setDialogOpen(false)
      setEditingRecord(null)
      invalidateList()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (record: EducationRecord) => educationApi.delete(config.domain, record.id),
    onSuccess: () => {
      toast.success('删除成功')
      invalidateList()
    },
  })

  const openCreateDialog = useCallback(() => {
    if (!allowCreate) return
    setDialogMode('create')
    setEditingRecord(null)
    setFormValues(buildInitialPayload(config.fields))
    setDialogOpen(true)
  }, [allowCreate, config.fields])

  const openEditDialog = useCallback(
    (record: EducationRecord) => {
      if (!allowEdit) return
      setDialogMode('edit')
      setEditingRecord(record)
      setFormValues(buildInitialPayload(config.fields, record))
      setDialogOpen(true)
    },
    [allowEdit, config.fields],
  )

  const handleDelete = useCallback(
    (record: EducationRecord) => {
      Modal.confirm({
        title: `删除${config.title}`,
        content: `确认删除「${getRecordText(record, config.primaryField)}」？`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => deleteMutation.mutate(record),
      })
    },
    [config.primaryField, config.title, deleteMutation],
  )

  const setFieldValue = useCallback((key: string, value: EducationFieldValue) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(() => {
    const missingField = config.fields.find(
      (field) => field.required && !field.hiddenInForm && !formValues[field.key],
    )
    if (missingField) {
      toast.error(`请填写${missingField.title}`)
      return
    }
    saveMutation.mutate(formValues)
  }, [config.fields, formValues, saveMutation])

  const filterTags = useMemo<FilterTag[]>(() => {
    const tags: FilterTag[] = []
    if (keyword.trim()) {
      tags.push({ key: 'keyword', label: '关键词', value: keyword.trim(), onClose: () => setKeyword('') })
    }
    if (status) {
      tags.push({
        key: 'status',
        label: '状态',
        value: config.statusOptions?.find((option) => option.value === status)?.label ?? status,
        onClose: () => setStatus(undefined),
      })
    }
    if (dateRange) {
      tags.push({
        key: 'dateRange',
        label: '日期',
        value: `${formatDate(dateRange[0].toISOString())} - ${formatDate(dateRange[1].toISOString())}`,
        onClose: () => setDateRange(undefined),
      })
    }
    return tags
  }, [config.statusOptions, dateRange, keyword, status])

  const clearFilters = useCallback(() => {
    setKeyword('')
    setStatus(undefined)
    setDateRange(undefined)
    setPage(1)
  }, [])

  const columns = useMemo<ColumnProps<EducationRecord>[]>(() => {
    const tableFields = config.fields.filter((field) => !field.hiddenInTable)
    const baseColumns = tableFields.map<ColumnProps<EducationRecord>>((field, index) => ({
      title: field.title,
      dataIndex: field.key,
      width: field.width ?? 140,
      ellipsis: field.ellipsis ?? true,
      fixed: field.primary || index === 0 ? 'left' : undefined,
      render: (_value, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={field.primary ? '80%' : 96} />
        const value = record[field.key]
        if (field.key === 'status') {
          const label = config.statusOptions?.find((option) => option.value === value)?.label ?? getRecordText(record, field.key)
          return <Tag size="small" color={value === 'inactive' || value === 'cancelled' ? 'grey' : 'blue'}>{label}</Tag>
        }
        if (field.money) return <Text>{formatMoney(value)}</Text>
        if (field.kind === 'date') return <Text>{formatDate(value, field.datetime)}</Text>
        if (field.primary) return <Text strong>{getRecordText(record, field.key)}</Text>
        return <Text>{getRecordText(record, field.key)}</Text>
      },
    }))

    if (!allowEdit && !allowDelete) return baseColumns

    return [
      ...baseColumns,
      {
        title: '操作',
        dataIndex: 'operation',
        width: 96,
        fixed: 'right',
        render: (_value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
          return (
            <Dropdown
              trigger="click"
              position="bottomRight"
              render={
                <Dropdown.Menu>
                  {allowEdit && (
                    <Dropdown.Item icon={<IconEdit />} onClick={() => openEditDialog(record)}>
                      编辑
                    </Dropdown.Item>
                  )}
                  {allowEdit && allowDelete && <Dropdown.Divider />}
                  {allowDelete && (
                    <Dropdown.Item type="danger" icon={<IconDelete />} onClick={() => handleDelete(record)}>
                      删除
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              }
            >
              <Button data-stop-row-click icon={<IconMore />} theme="borderless" />
            </Dropdown>
          )
        },
      },
    ]
  }, [allowDelete, allowEdit, config.fields, config.statusOptions, handleDelete, openEditDialog])

  const handleExport = useCallback(async () => {
    try {
      await educationApi.export(config.domain, params)
      toast.success('导出任务已提交')
    } catch {
      toast.error('导出失败')
    }
  }, [config.domain, params])

  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Input
        prefix={<IconSearch />}
        placeholder={config.searchPlaceholder}
        value={keyword}
        onChange={(value) => {
          setKeyword(value)
          setPage(1)
        }}
        showClear
        style={{ width: 240 }}
      />
      {config.statusOptions && (
        <Select
          placeholder="状态"
          optionList={config.statusOptions}
          value={status}
          onChange={(value) => {
            setStatus(value as string | undefined)
            setPage(1)
          }}
          showClear
          style={{ width: 132 }}
        />
      )}
      <DatePicker
        type="dateRange"
        placeholder={['开始日期', '结束日期']}
        value={dateRange}
        onChange={(dates) => {
          const range =
            Array.isArray(dates) &&
            dates.length === 2 &&
            dates[0] instanceof Date &&
            dates[1] instanceof Date
              ? ([dates[0], dates[1]] as [Date, Date])
              : undefined
          setDateRange(range)
          setPage(1)
        }}
        style={{ width: 240 }}
      />
    </div>
  )

  return (
    <>
      <DataTableLayout
        title={config.title}
        total={data?.total}
        headerActions={
          <>
            {config.exportText && (
              <Button icon={<IconExport />} theme="light" onClick={handleExport}>
                {config.exportText}
              </Button>
            )}
            {allowCreate && (
              <Button icon={<IconPlus />} theme="solid" onClick={openCreateDialog}>
                {config.createText ?? `新建${config.title}`}
              </Button>
            )}
          </>
        }
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        toolbar={toolbar}
        filterTags={filterTags}
        onClearAllFilters={clearFilters}
      >
        <SemiDataTable<EducationRecord>
          columns={columns}
          data={items}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          scrollX={Math.max(1120, columns.reduce((total, column) => total + Number(column.width ?? 120), 0))}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          onRowClick={allowEdit ? openEditDialog : undefined}
          rowSelection={{
            selectedRowKeys: selectedRows.map((row) => row.id),
            onChange: (_keys, rows) => setSelectedRows(rows),
            fixed: 'left',
            width: 48,
          }}
          skeletonFactory={createSkeletonFactory(config.fields)}
          emptyText={config.emptyText}
        />
      </DataTableLayout>

      <SideSheet
        title={dialogMode === 'edit' ? `编辑${config.title}` : (config.createText ?? `新建${config.title}`)}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        width={720}
        placement="right"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" loading={saveMutation.isPending} onClick={handleSave}>
              保存
            </Button>
          </div>
        }
      >
        <Tabs type="line" style={{ marginTop: -8 }}>
          <TabPane tab="基础信息" itemKey="basic">
            <Form layout="vertical" allowEmpty>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
                {config.fields
                  .filter((field) => !field.hiddenInForm)
                  .map((field) => (
                    <Form.Slot
                      key={field.key}
                      label={{ text: field.title, required: field.required }}
                      style={{ gridColumn: field.kind === 'textarea' ? '1 / span 2' : undefined }}
                    >
                      {field.kind === 'select' ? (
                        <Select
                          placeholder={`请选择${field.title}`}
                          optionList={field.options ?? []}
                          value={formValues[field.key] as string | undefined}
                          onChange={(value) => setFieldValue(field.key, value as string | undefined)}
                          showClear
                          style={{ width: '100%' }}
                        />
                      ) : field.kind === 'number' ? (
                        <InputNumber
                          placeholder={`请输入${field.title}`}
                          value={typeof formValues[field.key] === 'number' ? (formValues[field.key] as number) : undefined}
                          onChange={(value) => setFieldValue(field.key, typeof value === 'number' ? value : undefined)}
                          style={{ width: '100%' }}
                        />
                      ) : field.kind === 'date' ? (
                        <DatePicker
                          type={field.datetime ? 'dateTime' : 'date'}
                          placeholder={`请选择${field.title}`}
                          value={formValues[field.key] ? new Date(String(formValues[field.key])) : undefined}
                          onChange={(value) => {
                            const dateValue = value instanceof Date ? value.toISOString() : undefined
                            setFieldValue(field.key, dateValue)
                          }}
                          style={{ width: '100%' }}
                        />
                      ) : field.kind === 'textarea' ? (
                        <TextArea
                          placeholder={`请输入${field.title}`}
                          value={String(formValues[field.key] ?? '')}
                          onChange={(value) => setFieldValue(field.key, value)}
                          autosize={{ minRows: 3, maxRows: 5 }}
                        />
                      ) : (
                        <Input
                          placeholder={`请输入${field.title}`}
                          value={String(formValues[field.key] ?? '')}
                          onChange={(value) => setFieldValue(field.key, value)}
                        />
                      )}
                    </Form.Slot>
                  ))}
              </div>
            </Form>
          </TabPane>
          <TabPane tab="系统信息" itemKey="system">
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <Text type="tertiary">记录 ID</Text>
                <div style={{ marginTop: 4 }}>{editingRecord?.id ?? '-'}</div>
              </div>
              <div>
                <Text type="tertiary">创建时间</Text>
                <div style={{ marginTop: 4 }}>{formatDate(editingRecord?.created_at, true)}</div>
              </div>
              <div>
                <Text type="tertiary">更新时间</Text>
                <div style={{ marginTop: 4 }}>{formatDate(editingRecord?.updated_at, true)}</div>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </SideSheet>
    </>
  )
}
