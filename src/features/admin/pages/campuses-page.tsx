/**
 * 校区管理页面
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { toast } from '@/lib/toast'
import { Plus, Pencil, Trash2, Building2, Power, PowerOff, QrCode, Copy, Download, RotateCcw } from 'lucide-react'
import { Banner, Button, Form, Input, Modal, Select, Spin, Tooltip, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { copyToClipboard } from '@/lib/utils'
import { adminApi, sourceChannelApi } from '../api'
import type {
  AreaItem,
  CampusItem,
  CampusCreate,
  CampusUpdate,
  DirectVisitCampusTokenItem,
} from '../types'
import { StatusBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

interface CampusFormValues extends CampusCreate {
  address?: string
  contact_phone?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

export function CampusesPage() {
  useDocumentTitle('校区管理')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CampusItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<CampusItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [directVisitCampus, setDirectVisitCampus] = useState<CampusItem | null>(null)
  const [directVisitQrDataUrl, setDirectVisitQrDataUrl] = useState('')
  const directVisitOpen = !!directVisitCampus

  // 获取校区列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-campuses', page, pageSize, searchValue, statusFilter, areaFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        is_area_office: false,
      }
      if (searchValue) {
        params.search = searchValue
      }
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active'
      }
      if (areaFilter !== 'all') {
        params.area_id = areaFilter
      }
      const response = await adminApi.getCampuses(params)
      return response.data
    },
  })

  // 获取区域列表（用于下拉选择）
  const { data: areasData } = useQuery({
    queryKey: ['admin-areas-options'],
    queryFn: async () => {
      const response = await adminApi.getAreas({ size: 100, is_active: true })
      return response.data
    },
  })

  const areas = useMemo<AreaItem[]>(() => areasData?.items ?? [], [areasData?.items])

  const { data: directVisitTokensData, isLoading: isDirectVisitTokensLoading } = useQuery({
    queryKey: ['admin-direct-visit-campus-tokens'],
    queryFn: () => sourceChannelApi.getDirectVisitCampusTokens(),
    enabled: directVisitOpen,
  })

  const directVisitTokenItem = useMemo<DirectVisitCampusTokenItem | undefined>(() => {
    if (!directVisitCampus) return undefined
    return directVisitTokensData?.items.find((item) => item.campus_id === directVisitCampus.id)
  }, [directVisitCampus, directVisitTokensData?.items])

  const directVisitLink = directVisitTokenItem?.token
    ? `${window.location.origin}/direct-visit?token=${encodeURIComponent(directVisitTokenItem.token)}`
    : ''
  const directVisitOperationAssistantId = directVisitTokenItem
    ? directVisitTokenItem.operation_assistant_id ?? null
    : directVisitCampus?.operation_assistant_id ?? null
  const hasDirectVisitOperationAssistant = Boolean(directVisitOperationAssistantId)

  // 创建校区
  const createMutation = useMutation({
    mutationFn: (data: CampusCreate) => adminApi.createCampus(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新校区
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CampusUpdate }) =>
      adminApi.updateCampus(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除校区
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCampus(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 启用/禁用
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateCampus(id, { is_active }),
    onMutate: ({ id }) => setTogglingId(id),
    onSettled: () => setTogglingId(null),
    onSuccess: (_res, { is_active }) => {
      toast.success(is_active ? '已启用' : '已禁用')
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '操作失败'),
  })

  const generateDirectVisitMutation = useMutation({
    mutationFn: (campusId: string) => sourceChannelApi.createDirectVisitCampusToken(campusId),
    onSuccess: async () => {
      toast.success('直访码已生成')
      await queryClient.invalidateQueries({ queryKey: ['admin-direct-visit-campus-tokens'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '生成直访码失败'),
  })

  const rotateDirectVisitMutation = useMutation({
    mutationFn: (campusId: string) => sourceChannelApi.rotateDirectVisitCampusToken(campusId),
    onSuccess: async () => {
      toast.success('直访码已更新')
      await queryClient.invalidateQueries({ queryKey: ['admin-direct-visit-campus-tokens'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '更新直访码失败'),
  })

  useEffect(() => {
    let cancelled = false
    if (!directVisitLink) {
      setDirectVisitQrDataUrl('')
      return
    }

    QRCode.toDataURL(directVisitLink, {
      width: 240,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setDirectVisitQrDataUrl(url) })
      .catch(() => { if (!cancelled) setDirectVisitQrDataUrl('') })

    return () => { cancelled = true }
  }, [directVisitLink])

  // 表格列定义
  const columns: ColumnProps<CampusItem>[] = [
      {
        title: '校区名称',
        dataIndex: 'name',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={96} />
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 className="h-4 w-4 text-teal-500" />
              <Text strong>{record.name}</Text>
            </div>
          )
        },
      },
      {
        title: '所属区域',
        dataIndex: 'area_name',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={80} />
          }
          return record.area_name || '-'
        },
      },
      {
        title: '校区领导',
        dataIndex: 'principal_name',
        width: 220,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={136} />
          }
          if (record.is_area_office) {
            return <Text type="tertiary" size="small">不适用</Text>
          }
          if (!record.principal_name && !record.operation_assistant_name && !record.vice_principal_name) {
            return <Text type="tertiary" size="small">未任命</Text>
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Text size="small">校长：{record.principal_name || '-'}</Text>
              <Text type="tertiary" size="small">运营助理：{record.operation_assistant_name || '-'}</Text>
              <Text type="tertiary" size="small">助理：{record.vice_principal_name || '-'}</Text>
            </div>
          )
        },
      },
      {
        title: '地址',
        dataIndex: 'address',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={160} />
          }
          const address = record.address
          if (!address) return '-'
          return (
            <span style={{ maxWidth: 200, display: 'inline-block' }} className="truncate" title={address}>
              {address}
            </span>
          )
        },
      },
      {
        title: '联系电话',
        dataIndex: 'contact_phone',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={96} />
          }
          return record.contact_phone || '-'
        },
      },
      {
        title: '排序',
        dataIndex: 'sort_order',
        width: 80,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={32} />
          }
          return record.sort_order
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={56} />
          }
          return <StatusBadge isActive={record.is_active} />
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 180,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={112} />
          }
          return record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : '-'
        },
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 200,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <SemiSkeletonCell width={88} />
          }
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Tooltip content="直访码">
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<QrCode className="h-4 w-4" />}
                  size="small"
                  disabled={!record.is_active}
                  onClick={() => handleOpenDirectVisit(record)}
                />
              </Tooltip>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Pencil className="h-4 w-4" />}
                size="small"
                onClick={() => handleEdit(record)}
              />
              <Button
                theme="borderless"
                type={record.is_active ? 'warning' : 'tertiary'}
                icon={record.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4 text-green-600" />}
                size="small"
                loading={togglingId === record.id}
                onClick={() => toggleStatusMutation.mutate({ id: record.id, is_active: !record.is_active })}
              />
              <Button
                theme="borderless"
                type="danger"
                icon={<Trash2 className="h-4 w-4" />}
                size="small"
                onClick={() => handleDeleteClick(record)}
              />
            </div>
          )
        },
      },
    ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({ sort_order: 0, is_active: true })
    }, 0)
  }

  // 处理编辑
  const handleEdit = (item: CampusItem) => {
    setEditingItem(item)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        area_id: item.area_id,
        name: item.name,
        address: item.address || '',
        contact_phone: item.contact_phone || '',
        description: item.description || '',
        sort_order: item.sort_order,
        is_active: item.is_active,
      })
    }, 0)
  }

  // 处理删除点击
  const handleDeleteClick = (item: CampusItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleOpenDirectVisit = (item: CampusItem) => {
    setDirectVisitCampus(item)
    setDirectVisitQrDataUrl('')
  }

  const handleCopyDirectVisitLink = async () => {
    if (!directVisitLink) return
    const success = await copyToClipboard(directVisitLink)
    if (success) {
      toast.success('直访链接已复制')
    } else {
      toast.error('复制失败')
    }
  }

  const handleDownloadDirectVisitQr = () => {
    if (!directVisitQrDataUrl || !directVisitCampus) return
    const link = document.createElement('a')
    link.href = directVisitQrDataUrl
    link.download = `${directVisitCampus.name}-直访码.png`
    link.click()
  }

  const handleRotateDirectVisitToken = () => {
    if (!directVisitCampus) return
    Modal.confirm({
      title: '更新直访码',
      content: '更新后旧二维码将无法继续访问，需要重新张贴新二维码。',
      okText: '更新',
      cancelText: '取消',
      onOk: () => rotateDirectVisitMutation.mutate(directVisitCampus.id),
    })
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 处理表单提交
  const handleSubmit = (values: CampusFormValues) => {
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: values as CampusUpdate,
      })
    } else {
      createMutation.mutate(values)
    }
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  // 区域筛选选项
  const areaOptions = useMemo(() => [
    { value: 'all', label: '全部区域' },
    ...areas.map((area) => ({ value: area.id, label: area.name })),
  ], [areas])

  // 状态筛选选项
  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '已启用' },
    { value: 'inactive', label: '已停用' },
  ]

  // 区域下拉选项（表单用）
  const areaFormOptions = useMemo(() =>
    areas.map((area) => ({
      value: area.id,
      label: area.name + (area.district_name ? ` (${area.district_name})` : ''),
    })),
    [areas]
  )

  const isPending = createMutation.isPending || updateMutation.isPending
  const isDirectVisitMutating = generateDirectVisitMutation.isPending || rotateDirectVisitMutation.isPending

  return (
    <>
      <DataTableLayout
        title="校区管理"
        total={data?.total}
        headerActions={
          <Button theme="solid" type="primary" onClick={handleCreate} icon={<Plus className="h-4 w-4" />}>
            新建校区
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索校区名称..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
            <Select
              value={areaFilter}
              onChange={(v) => { setAreaFilter(v as string); setPage(1) }}
              optionList={areaOptions}
              style={{ width: 160 }}
            />
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
              optionList={statusOptions}
              style={{ width: 130 }}
            />
            <Button theme="outline" onClick={handleSearch}>
              搜索
            </Button>
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑校区' : '新建校区'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={isPending}>
              保存
            </Button>
          </div>
        }
        style={{ maxWidth: 520 }}
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <Form.Select
            field="area_id"
            label="所属区域"
            placeholder="请选择所属区域"
            optionList={areaFormOptions}
            rules={[{ required: true, message: '请选择所属区域' }]}
            style={{ width: '100%' }}
          />
          <Form.Input
            field="name"
            label="校区名称"
            placeholder="请输入校区名称"
            rules={[
              { required: true, message: '请输入校区名称' },
              { max: 50, message: '校区名称不能超过50个字符' },
            ]}
          />
          <Form.Input
            field="address"
            label="地址"
            placeholder="请输入校区地址（可选）"
            rules={[{ max: 200, message: '地址不能超过200个字符' }]}
          />
          <Form.Input
            field="contact_phone"
            label="联系电话"
            placeholder="请输入联系电话（可选）"
            rules={[{ max: 20, message: '联系电话不能超过20个字符' }]}
          />
          <Form.TextArea
            field="description"
            label="描述"
            placeholder="请输入校区描述（可选）"
            autosize={{ minRows: 3, maxRows: 5 }}
            rules={[{ max: 500, message: '描述不能超过500个字符' }]}
          />
          <Form.InputNumber
            field="sort_order"
            label="排序值"
            placeholder="请输入排序值"
            min={0}
          />
          <Form.Checkbox
            field="is_active"
            noLabel
          >
            启用状态
          </Form.Checkbox>
        </Form>
      </Modal>

      {/* 直访码对话框 */}
      <Modal
        title={directVisitCampus ? `${directVisitCampus.name} · 直访码` : '直访码'}
        visible={directVisitOpen}
        onCancel={() => setDirectVisitCampus(null)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDirectVisitCampus(null)}>关闭</Button>
          </div>
        }
        style={{ maxWidth: 520 }}
      >
        {isDirectVisitTokensLoading ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
            <Spin />
          </div>
        ) : !directVisitCampus?.is_active ? (
          <Banner
            type="warning"
            fullMode={false}
            closeIcon={null}
            title="校区已停用"
            description="停用校区不能生成直访码。"
          />
        ) : !hasDirectVisitOperationAssistant && !directVisitTokenItem?.token ? (
          <Banner
            type="warning"
            fullMode={false}
            closeIcon={null}
            title="未任命运营助理"
            description="请先在组织任命中为该校区任命运营助理，再生成直访码。"
          />
        ) : !directVisitTokenItem?.token ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Banner
              type="info"
              fullMode={false}
              closeIcon={null}
              title="尚未生成直访码"
              description="生成后家长可扫码进入手机端直访登记页。"
            />
            <Button
              theme="solid"
              icon={<QrCode className="h-4 w-4" />}
              loading={generateDirectVisitMutation.isPending}
              onClick={() => directVisitCampus && generateDirectVisitMutation.mutate(directVisitCampus.id)}
            >
              生成直访码
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {!hasDirectVisitOperationAssistant && (
              <Banner
                type="warning"
                fullMode={false}
                closeIcon={null}
                title="未任命运营助理"
                description="当前只能查看已有直访码；补齐运营助理后才能更新直访码。"
              />
            )}

            <div
              style={{
                width: 240,
                height: 240,
                border: '1px solid var(--semi-color-border)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
              }}
            >
              {directVisitQrDataUrl ? (
                <img src={directVisitQrDataUrl} alt="校区直访二维码" width={220} height={220} />
              ) : (
                <Spin />
              )}
            </div>

            <div
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid var(--semi-color-border)',
                borderRadius: 8,
                background: 'var(--semi-color-fill-0)',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.6,
                wordBreak: 'break-all',
              }}
            >
              {directVisitLink}
            </div>

            {directVisitTokenItem.updated_at && (
              <Text type="tertiary" size="small">
                更新时间：{new Date(directVisitTokenItem.updated_at).toLocaleString('zh-CN')}
              </Text>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
              <Button icon={<Copy className="h-4 w-4" />} onClick={handleCopyDirectVisitLink}>
                复制链接
              </Button>
              <Button icon={<Download className="h-4 w-4" />} onClick={handleDownloadDirectVisitQr}>
                下载二维码
              </Button>
            </div>

            <Button
              type="warning"
              theme="outline"
              icon={<RotateCcw className="h-4 w-4" />}
              loading={isDirectVisitMutating}
              disabled={!hasDirectVisitOperationAssistant}
              onClick={handleRotateDirectVisitToken}
              block
            >
              更新直访码
            </Button>
          </div>
        )}
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>
              删除
            </Button>
          </div>
        }
      >
        确定要删除校区"{deletingItem?.name}"吗？此操作不可撤销。
        如果该校区下存在员工或部门配置，则无法删除。
      </Modal>
    </>
  )
}
